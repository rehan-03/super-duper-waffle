import { randomUUID } from "node:crypto";
import { normalizeOutput } from "@algolearn/shared";
import { db } from "./db.js";
import {
  executionConfigured,
  executionConfig,
  languageMap,
} from "./execution-config.js";
const owner = randomUUID();
let stop = false;
const pending = new Set<Promise<void>>();
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
type JudgeResult = {
  token?: string;
  status?: { id: number; description: string };
  stdout?: string;
  stderr?: string;
  compile_output?: string;
  time?: string;
  memory?: number;
};
async function judge<T>(route: string, body?: unknown): Promise<T> {
  const response = await fetch(
    executionConfig.JUDGE0_URL!.replace(/\/$/, "") + route,
    {
      method: body ? "POST" : "GET",
      headers: {
        "Content-Type": "application/json",
        ...(executionConfig.JUDGE0_API_KEY
          ? { "X-Auth-Token": executionConfig.JUDGE0_API_KEY }
          : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(8000),
    },
  );
  if (!response.ok) throw new Error("EXECUTOR_REQUEST_FAILED");
  return (await response.json()) as T;
}
const decode = (v?: string) => {
  const raw = v ? Buffer.from(v, "base64") : Buffer.alloc(0),
    truncated = raw.length > 65536;
  const notice = "\n[Output truncated at 64 KiB]";
  return {
    value:
      raw
        .subarray(0, truncated ? 65536 - Buffer.byteLength(notice) : 65536)
        .toString("utf8") + (truncated ? notice : ""),
    truncated,
  };
};
async function heartbeat() {
  let healthy = false;
  let details: unknown = {
    message: "Isolated Judge0 configuration is required.",
  };
  if (executionConfigured) {
    try {
      const inventory =
        await judge<{ id: number; name: string }[]>("/languages");
      const mapped = Object.entries(languageMap!).map(([key, value]) => ({
        key,
        ...inventory.find((x) => x.id === value),
      }));
      const expected = {
        c: /^C \(/,
        cpp: /^C\+\+/,
        java: /^Java/,
        python: /^Python/,
      };
      healthy = mapped.every(
        (m) =>
          m.id && expected[m.key as keyof typeof expected].test(m.name ?? ""),
      );
      details = healthy
        ? { languages: mapped }
        : {
            message:
              "Configured language IDs do not match deployed toolchains.",
          };
    } catch {
      details = { message: "Executor connection failed." };
    }
  }
  await db.serviceHeartbeat.upsert({
    where: { name: "executor" },
    create: { name: "executor", healthy, details: details as object },
    update: { healthy, details: details as object, updatedAt: new Date() },
  });
}
async function failExpired() {
  await db.$transaction(async (tx) => {
    const jobs = await tx.executionJob.findMany({
      where: {
        state: { in: ["QUEUED", "LEASED"] },
        deadlineAt: { lte: new Date() },
      },
    });
    for (const job of jobs) {
      const updated = await tx.executionJob.updateMany({
        where: { id: job.id, state: { in: ["QUEUED", "LEASED"] } },
        data: { state: "FAILED", lastError: "DEADLINE_EXCEEDED" },
      });
      if (updated.count)
        await tx.submission.update({
          where: { id: job.submissionId },
          data: {
            status: "EXECUTION_FAILED",
            verdict: "INFRASTRUCTURE_FAILURE",
            finishedAt: new Date(),
          },
        });
    }
  });
}
async function claim() {
  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('algolearn-execution-claim'))`;
    if (
      (await tx.executionJob.count({
        where: { state: "LEASED", leaseUntil: { gt: new Date() } },
      })) >= 10
    )
      return null;
    // Prisma DateTime fields store UTC in PostgreSQL timestamps without a timezone.
    // Convert the database clock explicitly; the host timezone may be Asia/Kolkata.
    const rows = await tx.$queryRaw<
      { id: string }[]
    >`SELECT id FROM "ExecutionJob" WHERE (state='QUEUED' OR (state='LEASED' AND "leaseUntil"<(CURRENT_TIMESTAMP AT TIME ZONE 'UTC'))) AND "deadlineAt">(CURRENT_TIMESTAMP AT TIME ZONE 'UTC') ORDER BY "deadlineAt" FOR UPDATE SKIP LOCKED LIMIT 1`;
    if (!rows[0]) return null;
    const job = await tx.executionJob.update({
      where: { id: rows[0].id },
      data: {
        state: "LEASED",
        owner,
        attempts: { increment: 1 },
        leaseUntil: new Date(Date.now() + 15000),
      },
    });
    await tx.submission.update({
      where: { id: job.submissionId },
      data: { status: "RUNNING" },
    });
    return job;
  });
}
async function processJob(job: NonNullable<Awaited<ReturnType<typeof claim>>>) {
  try {
    const s = await db.submission.findUniqueOrThrow({
      where: { id: job.submissionId },
      include: {
        cases: { orderBy: { position: "asc" }, include: { testCase: true } },
      },
    });
    for (const c of s.cases) {
      if (
        !(await db.executionJob.findFirst({
          where: {
            id: job.id,
            state: "LEASED",
            owner,
            deadlineAt: { gt: new Date() },
          },
        }))
      )
        throw new Error("LEASE_LOST");
      if (Date.now() >= job.deadlineAt.getTime())
        throw new Error("DEADLINE_EXCEEDED");
      if (c.verdict) continue;
      let token = c.judgeToken;
      if (token === "CREATING") throw new Error("AMBIGUOUS_CREATION");
      if (!token) {
        // A crash in this window never leads to blind resubmission of user code.
        await db.submissionCase.update({
          where: { id: c.id },
          data: { judgeToken: "CREATING" },
        });
        const java =
          s.language === "java" &&
          executionConfig.JAVA_LIMITS_CALIBRATED === "true";
        const created = await judge<JudgeResult>(
          "/submissions?base64_encoded=true&wait=false",
          {
            source_code: Buffer.from(s.source).toString("base64"),
            language_id: languageMap![s.language],
            stdin: Buffer.from(
              c.testCase?.input ?? s.customInput ?? "",
            ).toString("base64"),
            cpu_time_limit: java ? 5 : 2,
            wall_time_limit: 10,
            memory_limit: (java ? 512 : 256) * 1024,
            max_file_size: 1024,
            max_processes_and_or_threads: java ? 40 : 20,
            enable_network: false,
          },
        );
        if (!created.token) throw new Error("AMBIGUOUS_CREATION");
        token = created.token;
        await db.submissionCase.update({
          where: { id: c.id },
          data: { judgeToken: token },
        });
      }
      let result: JudgeResult;
      let readErrors = 0;
      while (true) {
        if (Date.now() >= job.deadlineAt.getTime())
          throw new Error("DEADLINE_EXCEEDED");
        try {
          result = await judge<JudgeResult>(
            `/submissions/${encodeURIComponent(token)}?base64_encoded=true&fields=status,stdout,stderr,compile_output,time,memory`,
          );
          readErrors = 0;
        } catch {
          if (++readErrors >= 3) throw new Error("EXECUTOR_READ_FAILED");
          await sleep(1000 * readErrors);
          continue;
        }
        if (result.status && result.status.id > 2) break;
        await sleep(500);
      }
      const captured = decode(result.stdout),
        stdout = captured.value,
        diagnostics = decode(result.compile_output || result.stderr).value;
      const status = result.status!.id;
      const verdict = captured.truncated
        ? "RESOURCE_LIMIT_EXCEEDED"
        : status === 3
          ? c.testCase &&
            normalizeOutput(stdout) !==
              normalizeOutput(c.testCase.expectedOutput)
            ? "WRONG_ANSWER"
            : "ACCEPTED"
          : status === 6
            ? "COMPILATION_ERROR"
            : status === 5
              ? "RESOURCE_LIMIT_EXCEEDED"
              : status >= 7 && status <= 12
                ? "RUNTIME_ERROR"
                : "INFRASTRUCTURE_FAILURE";
      if (verdict === "INFRASTRUCTURE_FAILURE")
        throw new Error("EXECUTOR_INTERNAL_ERROR");
      await db.submissionCase.update({
        where: { id: c.id },
        data: {
          verdict,
          output: c.testCase?.hidden ? null : stdout,
          diagnostics: c.testCase?.hidden ? null : diagnostics,
          time: result.time ?? null,
          memory: result.memory ?? null,
        },
      });
    }
    const cases = await db.submissionCase.findMany({
        where: { submissionId: s.id },
        orderBy: { position: "asc" },
      }),
      passed = cases.filter((c) => c.verdict === "ACCEPTED").length,
      verdict =
        passed === cases.length
          ? "ACCEPTED"
          : cases.find((c) => c.verdict !== "ACCEPTED")!.verdict!;
    await db.$transaction(async (tx) => {
      const changed = await tx.executionJob.updateMany({
        where: { id: job.id, owner, state: "LEASED" },
        data: { state: "FINISHED" },
      });
      if (changed.count)
        await tx.submission.update({
          where: { id: s.id },
          data: {
            status: "FINISHED",
            verdict,
            passedCount: passed,
            finishedAt: new Date(),
          },
        });
    });
  } catch {
    await db.$transaction(async (tx) => {
      const changed = await tx.executionJob.updateMany({
        where: { id: job.id, owner, state: "LEASED" },
        data: {
          state: "FAILED",
          lastError: "EXECUTION_INFRASTRUCTURE_FAILURE",
        },
      });
      if (changed.count)
        await tx.submission.update({
          where: { id: job.submissionId },
          data: {
            status: "EXECUTION_FAILED",
            verdict: "INFRASTRUCTURE_FAILURE",
            finishedAt: new Date(),
          },
        });
    });
  }
}
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.on(signal, () => {
    stop = true;
  });
console.log(
  "Execution worker started. Unverified infrastructure never executes code.",
);
const leaseTicker = setInterval(() => {
  void db.executionJob
    .updateMany({
      where: { owner, state: "LEASED" },
      data: { leaseUntil: new Date(Date.now() + 15000) },
    })
    .catch(() => console.error("Execution lease refresh failed."));
}, 2000);
const deadlineTicker = setInterval(() => {
  void failExpired().catch(() =>
    console.error("Execution deadline check failed."),
  );
}, 500);
let lastHeartbeat = 0;
try {
  while (!stop) {
    await failExpired();
    if (Date.now() - lastHeartbeat > 10000) {
      await heartbeat();
      lastHeartbeat = Date.now();
    }
    const health = await db.serviceHeartbeat.findUnique({
      where: { name: "executor" },
    });
    if (health?.healthy && pending.size < 10) {
      const job = await claim();
      if (job) {
        const promise = processJob(job);
        pending.add(promise);
        void promise.finally(() => pending.delete(promise));
      }
    }
    await sleep(500);
  }
} finally {
  await Promise.allSettled(pending);
  clearInterval(leaseTicker);
  clearInterval(deadlineTicker);
  await db.$disconnect();
}
