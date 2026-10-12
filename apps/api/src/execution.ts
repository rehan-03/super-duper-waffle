import { Router } from "express";
import { z } from "zod";
import { db } from "./db.js";
import { requestMetrics } from "./metrics.js";
import {
  ApiError,
  parse,
  id,
  courseAccess,
  requireRole,
  type AuthRequest,
} from "./http.js";
import { topicAccess } from "./learning.js";
import { executionConfigured, executorTimeout } from "./execution-config.js";
export const executionRouter = Router();
const languages = ["c", "cpp", "java", "python"] as const;
const bytes = (max: number) =>
  z
    .string()
    .refine(
      (v) => Buffer.byteLength(v, "utf8") <= max,
      `Maximum ${max} UTF-8 bytes.`,
    );
async function availability() {
  const heartbeat = await db.serviceHeartbeat.findUnique({
    where: { name: "executor" },
  });
  return {
    available:
      executionConfigured &&
      !!heartbeat?.healthy &&
      Date.now() - heartbeat.updatedAt.getTime() < 30000,
    details: heartbeat?.details ?? null,
  };
}
executionRouter.get("/coding/config", async (_req, res) =>
  res.json({
    ...(await availability()),
    languages,
    message: executionConfigured
      ? "Executor must be healthy to run code."
      : "An isolated Judge0 host has not been configured and verified. Draft editing remains available.",
  }),
);
async function problemAccess(
  req: AuthRequest,
  problemId: string,
  write = false,
) {
  const p = await db.problem.findUnique({
    where: { id: problemId },
    include: {
      topic: { include: { revision: true } },
      tests: { orderBy: { position: "asc" } },
    },
  });
  if (!p) throw new ApiError(404, "NOT_FOUND", "Problem not found.");
  if (req.auth!.user.role === "STUDENT" && !p.reviewed)
    throw new ApiError(404, "NOT_FOUND", "Problem not found.");
  await topicAccess(req, p.topicId, write);
  return p;
}
executionRouter.get("/problems/:id", async (req: AuthRequest, res) => {
  const p = await problemAccess(req, id(req.params.id));
  res.json({
    problem: {
      id: p.id,
      title: p.title,
      statement: p.statement,
      starterCodes: p.starterCodes,
      topicId: p.topicId,
      courseId: p.topic.revision.courseId,
      revision: p.topic.revision.number,
      samples: p.tests
        .filter((t) => !t.hidden)
        .map((t) => ({
          id: t.id,
          position: t.position,
          input: t.input,
          expectedOutput: t.expectedOutput,
        })),
    },
  });
});
executionRouter.get(
  "/problems/:id/drafts/:language",
  requireRole("STUDENT"),
  async (req: AuthRequest, res) => {
    const p = await problemAccess(req, id(req.params.id)),
      language = parse(z.enum(languages), req.params.language);
    const draft = await db.codeDraft.findUnique({
      where: {
        studentId_courseId_problemId_language: {
          studentId: req.auth!.user.id,
          courseId: p.topic.revision.courseId,
          problemId: p.id,
          language,
        },
      },
    });
    res.json({
      source:
        draft?.source ??
        (p.starterCodes as Record<string, string>)[language] ??
        "",
      version: draft?.version ?? 0,
    });
  },
);
executionRouter.put(
  "/problems/:id/drafts/:language",
  requireRole("STUDENT"),
  async (req: AuthRequest, res) => {
    const p = await problemAccess(req, id(req.params.id), true),
      language = parse(z.enum(languages), req.params.language),
      b = parse(
        z
          .object({ source: bytes(65536), version: z.number().int().min(0) })
          .strict(),
        req.body,
      );
    const studentId = req.auth!.user.id,
      courseId = p.topic.revision.courseId;
    const draft = await db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${studentId + p.id + language}))`;
      const current = await tx.codeDraft.findUnique({
        where: {
          studentId_courseId_problemId_language: {
            studentId,
            courseId,
            problemId: p.id,
            language,
          },
        },
      });
      if ((current?.version ?? 0) !== b.version)
        throw new ApiError(
          409,
          "DRAFT_CONFLICT",
          "A newer draft exists. Review it before overwriting.",
        );
      return current
        ? tx.codeDraft.update({
            where: { id: current.id },
            data: { source: b.source, version: { increment: 1 } },
          })
        : tx.codeDraft.create({
            data: {
              studentId,
              courseId,
              problemId: p.id,
              language,
              source: b.source,
              version: 1,
            },
          });
    });
    res.json({ version: draft.version });
  },
);
executionRouter.post(
  "/problems/:id/submissions",
  requireRole("STUDENT"),
  async (req: AuthRequest, res) => {
    const p = await problemAccess(req, id(req.params.id), true),
      b = parse(
        z
          .object({
            language: z.enum(languages),
            source: bytes(65536),
            mode: z.enum(["CUSTOM", "SAMPLES", "SUBMIT"]),
            stdin: bytes(16384).optional(),
            idempotencyKey: z.uuid(),
          })
          .strict(),
        req.body,
      ),
      studentId = req.auth!.user.id;
    const available = await availability();
    const result = await db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${studentId + "execution"}))`;
      const existing = await tx.submission.findUnique({
        where: {
          studentId_idempotencyKey: {
            studentId,
            idempotencyKey: b.idempotencyKey,
          },
        },
      });
      if (existing) {
        if (
          existing.source !== b.source ||
          existing.problemId !== p.id ||
          existing.language !== b.language ||
          existing.mode !== b.mode ||
          existing.customInput !==
            (b.mode === "CUSTOM" ? (b.stdin ?? "") : null)
        )
          throw new ApiError(
            409,
            "IDEMPOTENCY_CONFLICT",
            "Request key was already used for different content.",
          );
        return existing;
      }
      if (!available.available)
        throw new ApiError(
          503,
          "EXECUTOR_UNAVAILABLE",
          "Secure execution is unavailable. Your draft is still safe to edit and save.",
        );
      if (
        (await tx.submission.count({
          where: { studentId, status: { in: ["QUEUED", "RUNNING"] } },
        })) >= 2
      )
        throw new ApiError(
          429,
          "JOB_LIMIT",
          "You already have two outstanding jobs. Wait for one to finish.",
        );
      if (
        (await tx.submission.count({
          where: { studentId, createdAt: { gt: new Date(Date.now() - 60000) } },
        })) >= 5
      )
        throw new ApiError(
          429,
          "EXECUTION_RATE_LIMIT",
          "Maximum five execution requests per minute.",
        );
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('algolearn-execution-enqueue'))`;
      if (
        (await tx.executionJob.count({
          where: { state: { in: ["QUEUED", "LEASED"] } },
        })) >= 100
      )
        throw new ApiError(
          503,
          "QUEUE_FULL",
          "The execution queue is full. Please retry shortly.",
        );
      const tests =
        b.mode === "CUSTOM"
          ? []
          : p.tests.filter((t) => b.mode === "SUBMIT" || !t.hidden);
      if (b.mode !== "CUSTOM" && !tests.length)
        throw new ApiError(
          409,
          "TESTS_MISSING",
          "This problem has no available tests.",
        );
      return tx.submission.create({
        data: {
          studentId,
          courseId: p.topic.revision.courseId,
          courseRevisionId: p.topic.revisionId,
          problemId: p.id,
          language: b.language,
          mode: b.mode,
          source: b.source,
          customInput: b.mode === "CUSTOM" ? (b.stdin ?? "") : null,
          idempotencyKey: b.idempotencyKey,
          totalCount: b.mode === "CUSTOM" ? 1 : tests.length,
          cases: {
            create:
              b.mode === "CUSTOM"
                ? [{ position: 1 }]
                : tests.map((t) => ({
                    testCaseId: t.id,
                    position: t.position,
                  })),
          },
          job: {
            create: { deadlineAt: new Date(Date.now() + executorTimeout) },
          },
        },
      });
    });
    res.status(202).json({
      submissionId: result.id,
      status: result.status,
      pollAfterMs: 2000,
    });
  },
);
executionRouter.get("/submissions/:id", async (req: AuthRequest, res) => {
  // Polling also enforces deadlines when the execution worker is temporarily down.
  const submissionId = id(req.params.id);
  const authorized = await db.submission.findUnique({
    where: { id: submissionId },
    select: { courseId: true, studentId: true },
  });
  if (!authorized)
    throw new ApiError(404, "NOT_FOUND", "Submission not found.");
  await courseAccess(req, authorized.courseId);
  if (
    req.auth!.user.role === "STUDENT" &&
    authorized.studentId !== req.auth!.user.id
  )
    throw new ApiError(404, "NOT_FOUND", "Submission not found.");
  await db.$transaction(async (tx) => {
    const candidate = await tx.submission.findUnique({
      where: { id: submissionId },
      include: { job: true },
    });
    if (
      candidate?.job &&
      candidate.job.deadlineAt <= new Date() &&
      ["QUEUED", "RUNNING"].includes(candidate.status)
    ) {
      const changed = await tx.executionJob.updateMany({
        where: { id: candidate.job.id, state: { in: ["QUEUED", "LEASED"] } },
        data: { state: "FAILED", lastError: "DEADLINE_EXCEEDED" },
      });
      if (changed.count)
        await tx.submission.update({
          where: { id: submissionId },
          data: {
            status: "EXECUTION_FAILED",
            verdict: "INFRASTRUCTURE_FAILURE",
            finishedAt: new Date(),
          },
        });
    }
  });
  const s = await db.submission.findUnique({
    where: { id: id(req.params.id) },
    include: {
      cases: { orderBy: { position: "asc" }, include: { testCase: true } },
    },
  });
  if (!s) throw new ApiError(404, "NOT_FOUND", "Submission not found.");
  await courseAccess(req, s.courseId);
  if (req.auth!.user.role === "STUDENT" && s.studentId !== req.auth!.user.id)
    throw new ApiError(404, "NOT_FOUND", "Submission not found.");
  res.json({
    submission: {
      id: s.id,
      problemId: s.problemId,
      courseId: s.courseId,
      language: s.language,
      mode: s.mode,
      source: s.source,
      status: s.status,
      verdict: s.verdict,
      passedCount: s.passedCount,
      totalCount: s.totalCount,
      createdAt: s.createdAt,
      finishedAt: s.finishedAt,
      cases: s.cases.map((c) =>
        c.testCase?.hidden
          ? { position: c.position, hidden: true, verdict: c.verdict }
          : {
              position: c.position,
              hidden: false,
              verdict: c.verdict,
              output: c.output,
              diagnostics: c.diagnostics,
              time: c.time,
              memory: c.memory,
            },
      ),
    },
  });
});
executionRouter.get(
  "/problems/:id/submissions",
  async (req: AuthRequest, res) => {
    const p = await problemAccess(req, id(req.params.id));
    res.json({
      submissions: await db.submission.findMany({
        where: { problemId: p.id, studentId: req.auth!.user.id },
        orderBy: { createdAt: "desc" },
        take: 100,
        select: {
          id: true,
          language: true,
          mode: true,
          status: true,
          verdict: true,
          passedCount: true,
          totalCount: true,
          createdAt: true,
        },
      }),
    });
  },
);
executionRouter.get("/admin/health", requireRole("ADMIN"), async (_req, res) =>
  res.json({
    database: "connected",
    api: requestMetrics(),
    executor: await availability(),
    queued: await db.executionJob.count({ where: { state: "QUEUED" } }),
    running: await db.executionJob.count({ where: { state: "LEASED" } }),
    recentFailures: await db.submission.count({
      where: {
        status: "EXECUTION_FAILED",
        createdAt: { gt: new Date(Date.now() - 300000) },
      },
    }),
  }),
);
