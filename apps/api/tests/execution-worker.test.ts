import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import path from "node:path";
import request from "supertest";
import { configureTestEnvironment } from "../../../scripts/test-environment.mjs";
configureTestEnvironment();
process.env.APP_ORIGIN = "http://localhost:5173";
const { db } = await import("../src/db.js");
const { hashPassword, newToken } = await import("../src/security.js");
const inventory = [
  { id: 100, name: "C (contract fixture)" },
  { id: 101, name: "C++ (contract fixture)" },
  { id: 102, name: "Java (contract fixture)" },
  { id: 103, name: "Python (contract fixture)" },
];
const cases = new Map<string, { mode: string; reads: number }>(),
  postCounts = new Map<string, number>();
let worker: ChildProcess,
  courseId = "",
  revisionId = "",
  problemId = "",
  studentId = "",
  csrf = "",
  workerOutput = "";
const server = createServer(async (req, res) => {
  // This service checks the adapter contract only. It never compiles or executes code.
  if (req.url === "/languages") {
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(inventory));
    return;
  }
  if (req.method === "POST") {
    let raw = "";
    for await (const chunk of req) raw += chunk;
    const body = JSON.parse(raw),
      mode = Buffer.from(body.source_code, "base64").toString("utf8");
    postCounts.set(mode, (postCounts.get(mode) ?? 0) + 1);
    assert.equal(body.enable_network, false);
    assert.equal(body.cpu_time_limit, 2);
    assert.equal(body.wall_time_limit, 10);
    assert.equal(body.memory_limit, 262144);
    assert.equal(body.max_file_size, 1024);
    assert.ok(inventory.some((l) => l.id === body.language_id));
    assert.ok(!("expected_output" in body));
    if (mode === "AMBIGUOUS") {
      req.socket.destroy();
      return;
    }
    const token = newToken();
    cases.set(token, { mode, reads: 0 });
    res.end(JSON.stringify({ token }));
    return;
  }
  const token = req.url?.split("/")[2]?.split("?")[0] ?? "",
    entry = cases.get(token);
  if (!entry) {
    res.writeHead(404);
    res.end("{}");
    return;
  }
  entry.reads++;
  if (entry.mode === "RETRY" && entry.reads === 1) {
    res.writeHead(503);
    res.end("{}");
    return;
  }
  if (entry.mode === "HANG") {
    res.end(JSON.stringify({ status: { id: 2, description: "Processing" } }));
    return;
  }
  const stdout =
    entry.mode === "WRONG"
      ? "1\n"
      : entry.mode === "OUTPUT_LIMIT"
        ? "0\n" + "x".repeat(70000)
        : "0\n";
  res.end(
    JSON.stringify({
      status: {
        id: entry.mode === "COMPILE" ? 6 : 3,
        description: "Contract fixture",
      },
      stdout: Buffer.from(stdout).toString("base64"),
      compile_output:
        entry.mode === "COMPILE"
          ? Buffer.from("Contract compile diagnostic").toString("base64")
          : null,
      time: "0.01",
      memory: 128,
    }),
  );
});
let agent: ReturnType<typeof request.agent>,
  app: typeof import("../src/app.js").app;
const origin = "http://localhost:5173";
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function terminal(id: string) {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    const s = await db.submission.findUniqueOrThrow({
      where: { id },
      include: { cases: true },
    });
    if (["FINISHED", "EXECUTION_FAILED"].includes(s.status)) return s;
    await delay(50);
  }
  throw new Error(`Worker did not settle contract fixture. ${workerOutput}`);
}
async function queued(
  mode: string,
  language: "c" | "cpp" | "java" | "python" = "python",
  deadlineMs = 90000,
) {
  return db.submission.create({
    data: {
      studentId,
      courseId,
      courseRevisionId: revisionId,
      problemId,
      language,
      mode: "SUBMIT",
      source: mode,
      totalCount: 8,
      idempotencyKey: crypto.randomUUID(),
      cases: {
        create: (await db.testCase.findMany({ where: { problemId } })).map(
          (c) => ({ position: c.position, testCaseId: c.id }),
        ),
      },
      job: { create: { deadlineAt: new Date(Date.now() + deadlineMs) } },
    },
  });
}
test.before(async () => {
  await db.$executeRawUnsafe('TRUNCATE TABLE "User", "Course" CASCADE');
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  process.env.JUDGE0_URL = `http://127.0.0.1:${address.port}`;
  process.env.JUDGE0_ISOLATION_VERIFIED = "true";
  process.env.JUDGE0_LANGUAGES = JSON.stringify({
    c: 100,
    cpp: 101,
    java: 102,
    python: 103,
  });
  process.env.JAVA_LIMITS_CALIBRATED = "false";
  ({ app } = await import("../src/app.js"));
  agent = request.agent(app);
  const student = await db.user.create({
    data: {
      email: "worker@contract.fixture",
      name: "Worker contract fixture",
      role: "STUDENT",
      status: "ACTIVE",
      passwordHash: await hashPassword("Worker-contract-fixture-2026"),
    },
  });
  studentId = student.id;
  const subject = await db.subject.findFirstOrThrow({
    where: { code: "2300118A" },
  });
  const course = await db.course.create({
    data: {
      code: "WORKER-CONTRACT",
      title: "Automated worker contract fixture",
      term: "Tests only",
      memberships: { create: { userId: studentId, memberRole: "STUDENT" } },
      subjects: { create: { subjectId: subject.id } },
    },
  });
  courseId = course.id;
  const revision = await db.courseRevision.create({
    data: { courseId, number: 1 },
  });
  revisionId = revision.id;
  const topic = await db.courseTopic.create({
    data: {
      revisionId,
      key: "linear-search",
      title: "Contract fixture",
      unitLabel: "Contract",
      position: 1,
      lesson: "Automated fixture, not institutional learning content.",
      objectives: [],
      prerequisiteKeys: [],
      sourceSubjectId: subject.id,
      sourcePages: [42],
    },
  });
  const problem = await db.problem.create({
    data: {
      topicId: topic.id,
      title: "Contract fixture",
      statement: "Automated test fixture only.",
      starterCodes: {},
      reviewed: true,
      tests: {
        create: Array.from({ length: 8 }, (_, i) => ({
          position: i + 1,
          input: "5 5\n5\n",
          expectedOutput: "0\n",
          hidden: i >= 3,
        })),
      },
    },
  });
  problemId = problem.id;
  await db.courseRevision.update({
    where: { id: revisionId },
    data: { status: "PUBLISHED", publishedAt: new Date() },
  });
  await db.course.update({
    where: { id: courseId },
    data: { publishedRevisionId: revisionId },
  });
  const login = await agent
    .post("/api/v1/auth/login")
    .set("Origin", origin)
    .send({ email: student.email, password: "Worker-contract-fixture-2026" });
  assert.equal(login.status, 200);
  csrf = login.body.csrfToken;
  worker = spawn(
    process.execPath,
    [path.resolve("../../node_modules/tsx/dist/cli.mjs"), "src/worker.ts"],
    {
      env: { ...process.env },
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  worker.stdout?.on("data", (c) => (workerOutput += c));
  worker.stderr?.on("data", (c) => (workerOutput += c));
  for (let i = 0; i < 100; i++) {
    if (
      (await db.serviceHeartbeat.findUnique({ where: { name: "executor" } }))
        ?.healthy
    )
      return;
    await delay(100);
  }
  throw new Error(`Worker heartbeat absent. ${workerOutput}`);
});
test("real API enqueues atomically and duplicate request keys create one durable job", async () => {
  const body = {
    language: "python",
    source: "API",
    mode: "SUBMIT",
    idempotencyKey: crypto.randomUUID(),
  };
  const first = await agent
    .post(`/api/v1/problems/${problemId}/submissions`)
    .set("Origin", origin)
    .set("X-CSRF-Token", csrf)
    .send(body);
  assert.equal(first.status, 202);
  const again = await agent
    .post(`/api/v1/problems/${problemId}/submissions`)
    .set("Origin", origin)
    .set("X-CSRF-Token", csrf)
    .send(body);
  assert.equal(again.body.submissionId, first.body.submissionId);
  const result = await terminal(first.body.submissionId);
  assert.equal(result.verdict, "ACCEPTED");
  assert.equal(result.passedCount, 8);
  await db.serviceHeartbeat.update({
    where: { name: "executor" },
    data: { healthy: false },
  });
  const recovered = await agent
    .post(`/api/v1/problems/${problemId}/submissions`)
    .set("Origin", origin)
    .set("X-CSRF-Token", csrf)
    .send(body);
  assert.equal(recovered.status, 202);
  assert.equal(
    recovered.body.submissionId,
    result.id,
    "Idempotent recovery works during an executor outage.",
  );
  await db.serviceHeartbeat.update({
    where: { name: "executor" },
    data: { healthy: true },
  });
  assert.equal(
    await db.executionJob.count({ where: { submissionId: result.id } }),
    1,
  );
  const visible = await agent.get(`/api/v1/submissions/${result.id}`);
  assert.equal(visible.status, 200);
  assert.equal(
    visible.body.submission.cases.filter((c: { hidden: boolean }) => c.hidden)
      .length,
    5,
  );
  for (const c of visible.body.submission.cases.filter(
    (c: { hidden: boolean }) => c.hidden,
  ))
    assert.deepEqual(Object.keys(c).sort(), ["hidden", "position", "verdict"]);
});
test("all four configured language IDs reach the worker with enforced sandbox limits", async () => {
  for (const language of ["c", "cpp", "java", "python"] as const) {
    const job = await queued(`LANGUAGE-${language}`, language);
    assert.equal((await terminal(job.id)).verdict, "ACCEPTED");
  }
});
test("worker separates incorrect, compile, output-limit, and infrastructure outcomes", async () => {
  for (const [source, verdict, status] of [
    ["WRONG", "WRONG_ANSWER", "FINISHED"],
    ["COMPILE", "COMPILATION_ERROR", "FINISHED"],
    ["OUTPUT_LIMIT", "RESOURCE_LIMIT_EXCEEDED", "FINISHED"],
    ["AMBIGUOUS", "INFRASTRUCTURE_FAILURE", "EXECUTION_FAILED"],
  ] as const) {
    const job = await queued(source),
      result = await terminal(job.id);
    assert.equal(result.verdict, verdict);
    assert.equal(result.status, status);
    if (source === "OUTPUT_LIMIT") {
      assert.match(
        result.cases.find((c) => c.output)?.output ?? "",
        /truncated at 64 KiB/,
      );
      assert.ok(
        Buffer.byteLength(result.cases.find((c) => c.output)!.output!) <= 65536,
      );
    }
  }
  assert.equal(
    postCounts.get("AMBIGUOUS"),
    1,
    "An ambiguous creation must never be blindly resubmitted.",
  );
});
test("transient reads recover without duplicate creation and deadlines settle stuck work", async () => {
  const retry = await queued("RETRY");
  assert.equal((await terminal(retry.id)).verdict, "ACCEPTED");
  assert.equal(postCounts.get("RETRY"), 8);
  const hanging = await queued("HANG", "python", 1000);
  assert.equal((await terminal(hanging.id)).status, "EXECUTION_FAILED");
  const ambiguous = await queued("ALREADY_CREATING");
  await db.submissionCase.updateMany({
    where: { submissionId: ambiguous.id },
    data: { judgeToken: "CREATING" },
  });
  await db.executionJob.update({
    where: { submissionId: ambiguous.id },
    data: {
      state: "LEASED",
      owner: "expired-worker",
      leaseUntil: new Date(Date.now() - 1000),
    },
  });
  assert.equal((await terminal(ambiguous.id)).status, "EXECUTION_FAILED");
  assert.equal(postCounts.get("ALREADY_CREATING") ?? 0, 0);
});
test.after(async () => {
  if (worker && !worker.killed) {
    worker.kill();
    await once(worker, "exit").catch(() => {});
  }
  server.closeAllConnections();
  await new Promise<void>((r) => server.close(() => r()));
  await db.$executeRawUnsafe('TRUNCATE TABLE "User", "Course" CASCADE');
  await db.serviceHeartbeat.deleteMany({ where: { name: "executor" } });
  await db.$disconnect();
});
