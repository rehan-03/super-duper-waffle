import { Router } from "express";
import { z } from "zod";
import { algorithms, algorithmKeys } from "@algolearn/shared";
import { db } from "./db.js";
import {
  ApiError,
  parse,
  id,
  courseAccess,
  requireRole,
  type AuthRequest,
} from "./http.js";
import {
  activities,
  blocks,
  blockedActivitySchema,
  validateContent,
} from "./content-validation.js";
import { learningDrafts, sourceCoverage } from "./draft-library.js";
import { importLearningDrafts } from "./draft-import.js";
import { topicAccess } from "./topic-access.js";
export const contentRouter = Router();
// Content authoring is course-scoped and separated from official curriculum records.
contentRouter.use("/faculty", requireRole("FACULTY", "ADMIN"));
function reviewMetadata(req: AuthRequest, reviewed: boolean) {
  return {
    reviewed,
    reviewerId: reviewed ? req.auth!.user.id : null,
    reviewedAt: reviewed ? new Date() : null,
  };
}
async function draftAccess(req: AuthRequest, revisionId: string) {
  const r = await db.courseRevision.findUnique({ where: { id: revisionId } });
  if (!r) throw new ApiError(404, "NOT_FOUND", "Revision not found.");
  await courseAccess(req, r.courseId, true);
  if (r.status !== "DRAFT")
    throw new ApiError(
      409,
      "IMMUTABLE",
      "Create a draft to edit published content.",
    );
  return r;
}
contentRouter.get("/faculty/coverage", async (req: AuthRequest, res) => {
  const query = parse(
    z
      .object({
        page: z.coerce.number().int().min(1).max(10000).default(1),
        subjectCode: z.string().max(32).optional(),
        q: z.string().max(100).optional(),
      })
      .strict(),
    req.query,
  );
  const subjects = await db.subject.findMany({
    where:
      req.auth!.user.role === "ADMIN"
        ? {}
        : {
            courses: {
              some: {
                course: {
                  memberships: {
                    some: { userId: req.auth!.user.id, memberRole: "FACULTY" },
                  },
                },
              },
            },
          },
    select: { code: true, id: true },
  });
  const allowed = new Set(subjects.map((s) => s.code));
  const entries = sourceCoverage.entries.filter(
    (e) =>
      allowed.has(e.subjectCode) &&
      (!query.subjectCode || e.subjectCode === query.subjectCode) &&
      (!query.q ||
        `${e.title} ${e.sourceText}`
          .toLowerCase()
          .includes(query.q.toLowerCase())),
  );
  const topics = await db.courseTopic.findMany({
    where: {
      sourceSubjectId: { in: subjects.map((s) => s.id) },
      ...(req.auth!.user.role === "ADMIN"
        ? {}
        : {
            revision: {
              course: {
                memberships: {
                  some: { userId: req.auth!.user.id, memberRole: "FACULTY" },
                },
              },
            },
          }),
    },
    select: {
      id: true,
      key: true,
      coverageKeys: true,
      authoringStatus: true,
      reviewed: true,
      revision: { select: { courseId: true, status: true } },
    },
  });
  const rows = entries.map((e) => ({
    ...e,
    drafts: topics.filter((t) => t.coverageKeys.includes(e.key)),
    authoredModules: learningDrafts
      .filter((d) => d.coverageKeys.includes(e.key))
      .map((d) => ({
        key: d.key,
        title: d.title,
        authoringStatus: d.authoringStatus,
      })),
  }));
  res.json({
    entries: rows.slice((query.page - 1) * 50, query.page * 50),
    page: query.page,
    pageSize: 50,
    total: rows.length,
    summary: {
      referenceOnly: rows.filter((e) => e.scope === "REFERENCE").length,
      computing: rows.filter((e) => e.scope === "COMPUTING").length,
      completeDrafts: rows.filter((e) =>
        e.drafts.some((d) => d.authoringStatus === "COMPLETE_DRAFT"),
      ).length,
      incomplete: rows.filter(
        (e) =>
          e.scope === "COMPUTING" &&
          !e.drafts.some((d) => d.authoringStatus === "COMPLETE_DRAFT"),
      ).length,
    },
    visualizers: algorithmKeys.map((key) => ({ key, ...algorithms[key] })),
  });
});
contentRouter.get(
  "/faculty/courses/:id/draft-library",
  async (req: AuthRequest, res) => {
    const course = await courseAccess(req, id(req.params.id));
    const page = parse(
      z.coerce.number().int().min(1).max(10000).default(1),
      req.query.page,
    );
    const subjects = await db.courseSubject.findMany({
      where: { courseId: course.id },
      include: { subject: true },
    });
    const codes = new Set(subjects.map((s) => s.subject.code));
    const drafts = learningDrafts.filter((d) => codes.has(d.sourceCode));
    res.json({
      page,
      pageSize: 50,
      total: drafts.length,
      drafts: drafts.slice((page - 1) * 50, page * 50),
    });
  },
);
contentRouter.post(
  "/faculty/revisions/:id/import-drafts",
  async (req: AuthRequest, res) => {
    const revision = await draftAccess(req, id(req.params.id));
    const body = parse(
      z.object({ keys: z.array(z.string().max(120)).min(1).max(100) }).strict(),
      req.body,
    );
    const result = await importLearningDrafts(
      revision.id,
      body.keys,
      req.auth!.user.id,
    );
    res
      .status(201)
      .json({
        ...result,
        message:
          "Drafts imported without review, publication or learner activity.",
      });
  },
);
contentRouter.get(
  "/faculty/courses/:id/revisions",
  async (req: AuthRequest, res) => {
    const course = await courseAccess(req, id(req.params.id));
    const page = parse(
      z.coerce.number().int().min(1).max(10000).default(1),
      req.query.page,
    );
    res.json({
      page,
      pageSize: 100,
      revisions: await db.courseRevision.findMany({
        where: { courseId: course.id },
        orderBy: { number: "desc" },
        take: 10,
        include: {
          _count: { select: { topics: true } },
          topics: {
            skip: (page - 1) * 100,
            take: 100,
            orderBy: { position: "asc" },
            include: {
              questions: true,
              problems: {
                include: { tests: { orderBy: { position: "asc" } } },
              },
            },
          },
        },
      }),
    });
  },
);
contentRouter.post(
  "/faculty/courses/:id/revisions",
  async (req: AuthRequest, res) => {
    const course = await courseAccess(req, id(req.params.id), true);
    const revision = await db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${course.id}))`;
      const pending = await tx.courseRevision.findFirst({
        where: { courseId: course.id, status: "DRAFT" },
      });
      if (pending) return pending;
      const latest = await tx.courseRevision.findFirst({
        where: { courseId: course.id },
        orderBy: { number: "desc" },
        include: {
          topics: {
            include: {
              questions: true,
              problems: { include: { tests: true } },
            },
          },
        },
      });
      const number = (latest?.number ?? 0) + 1;
      const copiedTopics = latest?.topics.map((t) => ({
        key: t.key,
        visualizerKey: t.visualizerKey,
        requiredActivities: t.requiredActivities,
        completionRule: "ACTIVITIES_V1",
        blockedActivities: t.blockedActivities!,
        sourceTopicIds: t.sourceTopicIds,
        authoringStatus: t.authoringStatus,
        coverageKeys: t.coverageKeys,
        title: t.title,
        unitLabel: t.unitLabel,
        position: t.position,
        lesson: t.lesson,
        objectives: t.objectives,
        prerequisiteKeys: t.prerequisiteKeys,
        reviewed: false,
        sourceSubjectId: t.sourceSubjectId,
        sourceUnitId: t.sourceUnitId,
        sourcePages: t.sourcePages,
        questions: {
          create: t.questions.map((q) => ({
            familyId: q.familyId,
            revisionNumber: number,
            objective: q.objective,
            difficulty: q.difficulty,
            prompt: q.prompt,
            options: q.options!,
            correctOption: q.correctOption,
            explanation: q.explanation,
            reviewed: false,
          })),
        },
        problems: {
          create: t.problems.map((p) => ({
            familyId: p.familyId,
            revisionNumber: number,
            title: p.title,
            statement: p.statement,
            starterCodes: p.starterCodes!,
            reviewed: false,
            tests: {
              create: p.tests.map((tc) => ({
                position: tc.position,
                input: tc.input,
                expectedOutput: tc.expectedOutput,
                hidden: tc.hidden,
              })),
            },
          })),
        },
      }));
      return tx.courseRevision.create({
        data: {
          courseId: course.id,
          number,
          topics: copiedTopics ? { create: copiedTopics } : undefined,
        },
      });
    });
    res.status(201).json({ revision });
  },
);
const topicBody = z
  .object({
    key: z.string().regex(/^[a-z0-9][a-z0-9-]{0,119}$/),
    title: z.string().trim().min(3).max(200).optional(),
    visualizerKey: z
      .enum(algorithmKeys as [string, ...string[]])
      .nullable()
      .optional(),
    requiredActivities: z
      .array(z.enum(activities))
      .min(1)
      .max(4)
      .refine((a) => a.includes("LESSON") && new Set(a).size === a.length)
      .default(["LESSON", "QUIZ", "CODING"]),
    blockedActivities: z.array(blockedActivitySchema).max(4).default([]),
    sourceTopicIds: z.array(z.uuid()).max(100).default([]),
    authoringStatus: z
      .enum(["COMPLETE_DRAFT", "INCOMPLETE", "SOURCE_BLOCKED"])
      .default("COMPLETE_DRAFT"),
    coverageKeys: z.array(z.string().max(120)).max(100).default([]),
    version: z.number().int().nonnegative().optional(),
    unitLabel: z.string().trim().min(1).max(100),
    lesson: z.string().trim().min(30).max(30000),
    objectives: z.array(z.string().trim().min(1).max(200)).min(1).max(10),
    prerequisiteKeys: z
      .array(z.string().regex(/^[a-z0-9][a-z0-9-]{0,119}$/))
      .max(30)
      .default([]),
    reviewed: z.boolean().default(false),
    sourceSubjectId: z.uuid(),
    sourceUnitId: z.uuid().nullable().default(null),
    sourcePages: z.array(z.number().int().positive()).min(1).max(10),
  })
  .strict();
async function validateTopicSource(
  courseId: string,
  b: {
    sourceSubjectId: string;
    sourceUnitId: string | null;
    sourcePages: number[];
    sourceTopicIds?: string[];
  },
) {
  const link = await db.courseSubject.findUnique({
    where: { courseId_subjectId: { courseId, subjectId: b.sourceSubjectId } },
    include: { subject: true },
  });
  if (
    !link ||
    b.sourcePages.some(
      (page) => page < link.subject.startPage || page > link.subject.endPage,
    )
  )
    throw new ApiError(
      422,
      "SOURCE_INVALID",
      "Select an assigned official subject and pages inside its supplied range.",
    );
  if (b.sourceTopicIds?.length) {
    const found = await db.curriculumTopic.count({
      where: {
        id: { in: b.sourceTopicIds },
        unit: {
          subjectId: b.sourceSubjectId,
          ...(b.sourceUnitId ? { id: b.sourceUnitId } : {}),
        },
      },
    });
    if (found !== new Set(b.sourceTopicIds).size)
      throw new ApiError(
        422,
        "SOURCE_INVALID",
        "Source topics must belong to the selected subject and unit.",
      );
  }
  if (
    b.sourceUnitId &&
    !(await db.curriculumUnit.findFirst({
      where: { id: b.sourceUnitId, subjectId: b.sourceSubjectId },
    }))
  )
    throw new ApiError(
      422,
      "SOURCE_INVALID",
      "The unit must belong to the selected subject.",
    );
  if (b.sourceUnitId) {
    const unit = await db.curriculumUnit.findUniqueOrThrow({
      where: { id: b.sourceUnitId },
    });
    if (b.sourcePages.some((p) => !(unit.sourcePages as number[]).includes(p)))
      throw new ApiError(
        422,
        "SOURCE_INVALID",
        "Source pages must be listed for the selected official unit.",
      );
  }
}
contentRouter.post(
  "/faculty/revisions/:id/topics",
  async (req: AuthRequest, res) => {
    const r = await draftAccess(req, id(req.params.id)),
      b = parse(topicBody, req.body);
    await validateTopicSource(r.courseId, b);
    const t = await db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${r.courseId}))`;
      const position =
        (
          await tx.courseTopic.aggregate({
            where: { revisionId: r.id },
            _max: { position: true },
          })
        )._max.position ?? 0;
      if (position >= 2000)
        throw new ApiError(
          422,
          "TOPIC_LIMIT",
          "A revision supports at most 2000 topics.",
        );
      return tx.courseTopic.create({
        data: {
          revisionId: r.id,
          ...b,
          version: 0,
          title:
            b.title ??
            algorithms[b.key as keyof typeof algorithms]?.title ??
            b.key,
          visualizerKey:
            b.visualizerKey === undefined
              ? algorithmKeys.includes(b.key as (typeof algorithmKeys)[number])
                ? b.key
                : null
              : b.visualizerKey,
          ...reviewMetadata(req, b.reviewed),
          position: position + 1,
        },
      });
    });
    res.status(201).json({ topic: t });
  },
);
contentRouter.patch("/faculty/topics/:id", async (req: AuthRequest, res) => {
  const t = await topicAccess(req, id(req.params.id), true, true),
    b = parse(topicBody, req.body);
  await validateTopicSource(t.revision.courseId, b);
  if (b.key !== t.key)
    throw new ApiError(
      422,
      "KEY_IMMUTABLE",
      "The learning topic identity cannot change.",
    );
  const { version, ...content } = b;
  const updated = await db.courseTopic.updateMany({
    where: { id: t.id, version: version ?? t.version },
    data: { ...content, ...reviewMetadata(req, b.reviewed) },
  });
  if (!updated.count)
    throw new ApiError(
      409,
      "SAVE_CONFLICT",
      "This lesson changed. Reload before editing or reviewing.",
    );
  res.json({
    topic: await db.courseTopic.findUniqueOrThrow({ where: { id: t.id } }),
  });
});
contentRouter.put(
  "/faculty/revisions/:id/topic-order",
  async (req: AuthRequest, res) => {
    const r = await draftAccess(req, id(req.params.id)),
      b = parse(
        z.object({ topicIds: z.array(z.uuid()).max(2000) }).strict(),
        req.body,
      );
    const topics = await db.courseTopic.findMany({
      where: { revisionId: r.id },
    });
    if (
      b.topicIds.length !== topics.length ||
      new Set(b.topicIds).size !== topics.length ||
      b.topicIds.some((x) => !topics.some((t) => t.id === x))
    )
      throw new ApiError(
        422,
        "ORDER_INVALID",
        "Include each topic exactly once.",
      );
    await db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${r.courseId}))`;
      for (const [i, tid] of b.topicIds.entries())
        await tx.courseTopic.update({
          where: { id: tid },
          data: { position: i + 10000 },
        });
      for (const [i, tid] of b.topicIds.entries())
        await tx.courseTopic.update({
          where: { id: tid },
          data: { position: i + 1 },
        });
    });
    res.json({ message: "Topic order saved." });
  },
);
contentRouter.post(
  "/faculty/topics/:id/move",
  async (req: AuthRequest, res) => {
    const topic = await topicAccess(req, id(req.params.id), true, true);
    const body = parse(
      z.object({ direction: z.enum(["UP", "DOWN"]) }).strict(),
      req.body,
    );
    await db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${topic.revision.courseId}))`;
      const current = await tx.courseTopic.findUniqueOrThrow({
        where: { id: topic.id },
      });
      const neighbor = await tx.courseTopic.findFirst({
        where: {
          revisionId: current.revisionId,
          position:
            body.direction === "UP"
              ? { lt: current.position }
              : { gt: current.position },
        },
        orderBy: { position: body.direction === "UP" ? "desc" : "asc" },
      });
      if (!neighbor) return;
      await tx.courseTopic.update({
        where: { id: current.id },
        data: { position: 100000 },
      });
      await tx.courseTopic.update({
        where: { id: neighbor.id },
        data: { position: current.position },
      });
      await tx.courseTopic.update({
        where: { id: current.id },
        data: { position: neighbor.position },
      });
    });
    res.json({ message: "Topic order saved." });
  },
);
const questionBody = z
  .object({
    version: z.number().int().nonnegative().optional(),
    objective: z.string().trim().min(1).max(200),
    difficulty: z.enum(["EASY", "MEDIUM", "HARD"]),
    prompt: z.string().trim().min(10).max(5000),
    options: z.array(z.string().trim().min(1).max(1000)).min(2).max(6),
    correctOption: z.number().int().min(0).max(5),
    explanation: z.string().trim().min(10).max(5000),
    reviewed: z.boolean().default(false),
  })
  .strict()
  .refine((b) => b.correctOption < b.options.length, {
    message: "Correct option must exist.",
    path: ["correctOption"],
  });
contentRouter.post(
  "/faculty/topics/:id/questions",
  async (req: AuthRequest, res) => {
    const t = await topicAccess(req, id(req.params.id), true, true),
      b = parse(questionBody, req.body);
    res.status(201).json({
      question: await db.question.create({
        data: {
          topicId: t.id,
          revisionNumber: t.revision.number,
          ...b,
          version: 0,
          ...reviewMetadata(req, b.reviewed),
        },
      }),
    });
  },
);
contentRouter.patch("/faculty/questions/:id", async (req: AuthRequest, res) => {
  const q = await db.question.findUnique({
    where: { id: id(req.params.id) },
  });
  if (!q) throw new ApiError(404, "NOT_FOUND", "Question not found.");
  await topicAccess(req, q.topicId, true, true);
  const { version, ...content } = parse(questionBody, req.body);
  const updated = await db.question.updateMany({
    where: { id: q.id, version: version ?? q.version },
    data: { ...content, ...reviewMetadata(req, content.reviewed) },
  });
  if (!updated.count)
    throw new ApiError(
      409,
      "SAVE_CONFLICT",
      "This question changed. Reload before editing or reviewing.",
    );
  res.json({
    question: await db.question.findUniqueOrThrow({ where: { id: q.id } }),
  });
});
const byteText = (max: number) =>
  z
    .string()
    .refine(
      (value) => Buffer.byteLength(value, "utf8") <= max,
      `Maximum ${max} UTF-8 bytes.`,
    );
const problemBody = z
  .object({
    version: z.number().int().nonnegative().optional(),
    title: z.string().trim().min(3).max(150),
    statement: z.string().trim().min(30).max(20000),
    starterCodes: z
      .object({
        c: byteText(65536),
        cpp: byteText(65536),
        java: byteText(65536),
        python: byteText(65536),
      })
      .strict(),
    reviewed: z.boolean().default(false),
    tests: z
      .array(
        z
          .object({
            input: byteText(16384),
            expectedOutput: byteText(65536),
            hidden: z.boolean(),
          })
          .strict(),
      )
      .length(8),
  })
  .strict()
  .refine((b) => b.tests.filter((t) => !t.hidden).length === 3, {
    message: "Provide exactly three sample and five hidden tests.",
    path: ["tests"],
  });
contentRouter.post(
  "/faculty/topics/:id/problems",
  async (req: AuthRequest, res) => {
    const t = await topicAccess(req, id(req.params.id), true, true),
      b = parse(problemBody, req.body);
    const problem = await db.$transaction(async (tx) => {
      const created = await tx.problem.create({
        data: {
          topicId: t.id,
          revisionNumber: t.revision.number,
          title: b.title,
          statement: b.statement,
          starterCodes: b.starterCodes,
          tests: {
            create: b.tests.map((tc, i) => ({ ...tc, position: i + 1 })),
          },
        },
      });
      return tx.problem.update({
        where: { id: created.id },
        data: reviewMetadata(req, b.reviewed),
      });
    });
    res.status(201).json({ problem });
  },
);
contentRouter.patch("/faculty/problems/:id", async (req: AuthRequest, res) => {
  const p = await db.problem.findUnique({ where: { id: id(req.params.id) } });
  if (!p) throw new ApiError(404, "NOT_FOUND", "Problem not found.");
  await topicAccess(req, p.topicId, true, true);
  const b = parse(problemBody, req.body);
  const problem = await db.$transaction(async (tx) => {
    const updated = await tx.problem.updateMany({
      where: { id: p.id, version: b.version ?? p.version },
      data: { reviewed: false },
    });
    if (!updated.count)
      throw new ApiError(
        409,
        "SAVE_CONFLICT",
        "This problem changed. Reload before editing.",
      );
    await tx.testCase.deleteMany({ where: { problemId: p.id } });
    return tx.problem.update({
      where: { id: p.id },
      data: {
        title: b.title,
        statement: b.statement,
        starterCodes: b.starterCodes,
        reviewed: false,
        tests: { create: b.tests.map((tc, i) => ({ ...tc, position: i + 1 })) },
      },
    });
  });
  res.json({ problem });
});
contentRouter.post(
  "/faculty/:kind/:id/review",
  async (req: AuthRequest, res) => {
    const kind = parse(
      z.enum(["topics", "questions", "problems"]),
      req.params.kind,
    );
    const contentId = id(req.params.id);
    const body = parse(
      z
        .object({
          version: z.number().int().nonnegative(),
          approved: z.boolean(),
        })
        .strict(),
      req.body,
    );
    const record =
      kind === "topics"
        ? await db.courseTopic.findUnique({ where: { id: contentId } })
        : kind === "questions"
          ? await db.question.findUnique({ where: { id: contentId } })
          : await db.problem.findUnique({ where: { id: contentId } });
    if (!record) throw new ApiError(404, "NOT_FOUND", "Content not found.");
    const topic = await topicAccess(
      req,
      "topicId" in record ? record.topicId : record.id,
      true,
      true,
    );
    await db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${topic.revision.courseId}))`;
      const args = {
        where: { id: contentId, version: body.version },
        data: reviewMetadata(req, body.approved),
      };
      const result =
        kind === "topics"
          ? await tx.courseTopic.updateMany(args)
          : kind === "questions"
            ? await tx.question.updateMany(args)
            : await tx.problem.updateMany(args);
      if (!result.count)
        throw new ApiError(
          409,
          "SAVE_CONFLICT",
          "Content changed after preview. Reload and review the current version.",
        );
      await tx.auditEvent.create({
        data: {
          actorId: req.auth!.user.id,
          action: body.approved ? "CONTENT_REVIEWED" : "CONTENT_REVIEW_REVOKED",
          entityType: kind,
          entityId: contentId,
          metadata: { version: body.version },
        },
      });
    });
    res.json({
      message: body.approved ? "Review recorded." : "Review cleared.",
    });
  },
);
contentRouter.get(
  "/faculty/revisions/:id/validation",
  async (req: AuthRequest, res) => {
    const r = await draftAccess(req, id(req.params.id));
    const topics = await db.courseTopic.findMany({
      where: { revisionId: r.id },
      include: { questions: true, problems: { include: { tests: true } } },
    });
    const errors = validateContent(topics);
    for (const topic of topics) {
      try {
        await validateTopicSource(r.courseId, topic);
      } catch (e) {
        errors.push(`${topic.title}: ${(e as Error).message}`);
      }
    }
    res.json({
      valid: !errors.length,
      errors,
      coverage: topics.map((t) => ({
        id: t.id,
        key: t.key,
        title: t.title,
        requiredActivities: t.requiredActivities,
        visualizerKey: t.visualizerKey,
        reviewed: t.reviewed,
        reviewerId: t.reviewerId,
        reviewedAt: t.reviewedAt,
        questionCount: t.questions.length,
        problemCount: t.problems.length,
        blocked: blocks(t.blockedActivities),
      })),
    });
  },
);
contentRouter.post(
  "/faculty/revisions/:id/publish",
  async (req: AuthRequest, res) => {
    const r = await draftAccess(req, id(req.params.id));
    const result = await db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${r.courseId}))`;
      await tx.$queryRaw`SELECT id FROM "CourseRevision" WHERE id=${r.id}::uuid FOR UPDATE`;
      const revision = await tx.courseRevision.findUniqueOrThrow({
        where: { id: r.id },
        include: {
          topics: {
            include: {
              questions: true,
              problems: { include: { tests: true } },
            },
          },
        },
      });
      if (revision.status !== "DRAFT")
        throw new ApiError(
          409,
          "IMMUTABLE",
          "This revision is already published.",
        );
      const errors = validateContent(revision.topics);
      for (const topic of revision.topics)
        await validateTopicSource(r.courseId, topic);
      if (errors.length)
        throw new ApiError(422, "PUBLICATION_INVALID", errors.join(" "));
      const updated = await tx.courseRevision.update({
        where: { id: r.id },
        data: { status: "PUBLISHED", publishedAt: new Date() },
      });
      await tx.course.update({
        where: { id: r.courseId },
        data: { publishedRevisionId: r.id },
      });
      await tx.auditEvent.create({
        data: {
          actorId: req.auth!.user.id,
          action: "COURSE_PUBLISHED",
          entityType: "CourseRevision",
          entityId: r.id,
          metadata: { number: r.number },
        },
      });
      return updated;
    });
    res.json({ revision: result });
  },
);
