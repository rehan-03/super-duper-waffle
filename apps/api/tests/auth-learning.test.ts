import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { configureTestEnvironment } from "../../../scripts/test-environment.mjs";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
configureTestEnvironment();
process.env.APP_ORIGIN = "http://localhost:5173";
const { db } = await import("../src/db.js");
const { app } = await import("../src/app.js");
const { hashPassword, newToken, hashToken } = await import(
  "../src/security.js"
);
const origin = "http://localhost:5173",
  password = "Fixture-only-password-2026";
const agents = {
  admin: request.agent(app),
  faculty: request.agent(app),
  student: request.agent(app),
  peer: request.agent(app),
};
const csrf: Record<string, string> = {},
  users: Record<string, string> = {};
let courseId = "",
  topicId = "",
  problemId = "",
  revisionId = "";
test.before(async () => {
  // The guard above prevents accidental use of any non-test database.
  await db.$executeRawUnsafe('TRUNCATE TABLE "User", "Course" CASCADE');
  const passwordHash = await hashPassword(password);
  for (const [name, role] of [
    ["admin", "ADMIN"],
    ["faculty", "FACULTY"],
    ["student", "STUDENT"],
    ["peer", "STUDENT"],
  ] as const) {
    const u = await db.user.create({
      data: {
        email: `${name}@fixture.example`,
        name: `Fixture ${name}`,
        role,
        status: "ACTIVE",
        passwordHash,
      },
    });
    users[name] = u.id;
    const result = await agents[name]
      .post("/api/v1/auth/login")
      .set("Origin", origin)
      .send({ email: u.email, password });
    assert.equal(result.status, 200);
    csrf[name] = result.body.csrfToken;
    assert.ok(result.headers["set-cookie"][0].includes("HttpOnly"));
  }
});
test("roles, origin and CSRF are enforced server-side", async () => {
  assert.equal(
    (await agents.student.get("/api/v1/admin/overview")).status,
    403,
  );
  assert.equal((await request(app).get("/api/v1/courses")).status, 401);
  assert.equal(
    (
      await agents.admin
        .post("/api/v1/admin/users")
        .set("Origin", origin)
        .send({})
    ).status,
    403,
  );
  assert.equal(
    (
      await agents.admin
        .post("/api/v1/admin/users")
        .set("Origin", "https://untrusted.example")
        .set("X-CSRF-Token", csrf.admin!)
        .send({})
    ).status,
    403,
  );
});
test("public signup verifies email before setting a password and cannot overwrite accounts or grant roles", async () => {
  const email = `signup-${crypto.randomUUID()}@fixture.example`;
  const signup = (body: unknown) =>
    request(app).post("/api/v1/auth/signup").set("Origin", origin).send(body);
  assert.equal(
    (
      await request(app)
        .post("/api/v1/auth/signup")
        .send({ name: "New Student", email })
    ).status,
    403,
  );
  assert.equal(
    (await signup({ name: "New Student", email, role: "ADMIN" })).status,
    422,
  );
  const registrations = await Promise.all([
    signup({ name: "New Student", email: ` ${email.toUpperCase()} ` }),
    signup({ name: "New Student", email }),
  ]);
  for (const result of registrations) assert.equal(result.status, 202);
  assert.deepEqual(registrations[0]!.body, registrations[1]!.body);
  assert.equal(registrations[0]!.body.delivery, "local-preview");
  const user = await db.user.findUniqueOrThrow({ where: { email } });
  assert.equal(user.name, "New Student");
  assert.equal(user.role, "STUDENT");
  assert.equal(user.status, "PENDING");
  assert.equal(user.passwordHash, null);
  assert.equal(await db.user.count({ where: { email } }), 1);
  assert.equal(
    await db.auditEvent.count({
      where: { entityId: user.id, action: "STUDENT_SELF_REGISTERED" },
    }),
    1,
  );
  assert.equal(
    await db.courseMembership.count({ where: { userId: user.id } }),
    0,
  );
  const agent = request.agent(app);
  assert.equal(
    (
      await agent
        .post("/api/v1/auth/login")
        .set("Origin", origin)
        .send({ email, password })
    ).status,
    401,
  );
  // Read only this test recipient's private development delivery. Never print a bearer link.
  const outbox = path.resolve("../../.local/outbox");
  let token = "";
  for (let attempt = 0; attempt < 100 && !token; attempt++) {
    for (const filename of (await readdir(outbox))
      .filter((f) => f.endsWith(".json"))
      .sort()
      .reverse()) {
      let mail;
      try {
        mail = JSON.parse(await readFile(path.join(outbox, filename), "utf8"));
      } catch {
        continue;
      }
      if (mail.to !== email || mail.purpose !== "ACTIVATION") continue;
      const candidate =
        new URLSearchParams(new URL(mail.url).hash.slice(1)).get("token") ?? "";
      const active = await db.authToken.findUnique({
        where: { tokenHash: hashToken(candidate) },
      });
      if (active && !active.usedAt) {
        token = candidate;
        break;
      }
    }
    if (!token) await delay(20);
  }
  assert.ok(token, "A private activation message must be delivered");
  const pendingToken = await db.authToken.findUniqueOrThrow({
    where: { tokenHash: hashToken(token) },
  });
  const activationLifetime =
    pendingToken.expiresAt.getTime() - pendingToken.createdAt.getTime();
  assert.ok(
    activationLifetime >= 86_399_000 && activationLifetime <= 86_401_000,
    "Activation tokens must retain the 24-hour expiry",
  );
  const preview = await request(app).get("/api/v1/dev/mail-preview");
  assert.equal(preview.status, 200);
  assert.ok(
    preview.body.messages.some(
      (message: { to: string; purpose: string; actionUrl: string }) =>
        message.to === email &&
        message.purpose === "ACTIVATION" &&
        message.actionUrl.startsWith("/activate#token="),
    ),
  );
  assert.ok(
    preview.body.messages.every(
      (message: Record<string, unknown>) =>
        !Object.keys(message).some((key) =>
          ["path", "filename", "directory", "url"].includes(key.toLowerCase()),
        ),
    ),
    "Preview responses must not expose storage paths or absolute URLs",
  );
  const activation = await agent
    .post("/api/v1/auth/activate")
    .set("Origin", origin)
    .send({ token, password });
  assert.equal(activation.status, 200);
  assert.equal(activation.body.user.role, "STUDENT");
  assert.equal(
    (
      await agent
        .post("/api/v1/auth/login")
        .set("Origin", origin)
        .send({ email, password })
    ).status,
    200,
  );
  const dashboard = await agent.get("/api/v1/student/dashboard");
  assert.equal(dashboard.status, 200);
  assert.equal(dashboard.body.stats.enrolledCourses, 0);
  assert.equal(dashboard.body.stats.completedTopics, 0);
  assert.equal((await agent.get("/api/v1/admin/overview")).status, 403);
  const duplicate = await signup({ email, name: "Overwrite attempted" });
  const staff = await signup({
    email: "admin@fixture.example",
    name: "Overwrite attempted",
  });
  assert.deepEqual(duplicate.body, registrations[0]!.body);
  assert.deepEqual(staff.body, registrations[0]!.body);
  const unchanged = await db.user.findUniqueOrThrow({ where: { email } });
  assert.equal(unchanged.name, "New Student");
  assert.equal(unchanged.status, "ACTIVE");
  const admin = await db.user.findUniqueOrThrow({
    where: { id: users.admin! },
  });
  assert.equal(admin.name, "Fixture admin");
  assert.equal(admin.role, "ADMIN");
});
test("admin creates course, faculty assignment and enrollment backed by real records", async () => {
  const subject = await db.subject.findFirstOrThrow({
    where: { code: "2300118A" },
  });
  const r = await agents.admin
    .post("/api/v1/admin/courses")
    .set("Origin", origin)
    .set("X-CSRF-Token", csrf.admin!)
    .send({
      code: "FIXTURE-CS",
      title: "Test-only algorithms course",
      term: "Integration fixture",
      subjectIds: [subject.id],
    });
  assert.equal(r.status, 201);
  courseId = r.body.course.id;
  for (const name of ["faculty", "student"]) {
    const res = await agents.admin
      .post(`/api/v1/admin/courses/${courseId}/memberships`)
      .set("Origin", origin)
      .set("X-CSRF-Token", csrf.admin!)
      .send({
        userId: users[name],
        memberRole: name === "faculty" ? "FACULTY" : "STUDENT",
      });
    assert.equal(res.status, 201);
  }
  assert.equal(
    (await agents.peer.get(`/api/v1/courses/${courseId}/curriculum`)).status,
    404,
  );
  const curriculum = await agents.student.get(
    `/api/v1/courses/${courseId}/curriculum`,
  );
  assert.equal(curriculum.status, 200);
  assert.equal(curriculum.body.subjects[0].units.length, 5);
  const dashboard = await agents.student.get("/api/v1/student/dashboard");
  assert.equal(dashboard.body.stats.enrolledCourses, 1);
  assert.equal(dashboard.body.stats.completedTopics, 0);
  assert.equal(dashboard.body.stats.publishedTopics, 0);
});
test("draft content validates before publication and published content is immutable", async () => {
  const revision = await agents.faculty
    .post(`/api/v1/faculty/courses/${courseId}/revisions`)
    .set("Origin", origin)
    .set("X-CSRF-Token", csrf.faculty!)
    .send({});
  assert.equal(revision.status, 201);
  revisionId = revision.body.revision.id;
  assert.equal(
    (
      await agents.faculty
        .post(`/api/v1/faculty/revisions/${revisionId}/publish`)
        .set("Origin", origin)
        .set("X-CSRF-Token", csrf.faculty!)
        .send({})
    ).status,
    422,
  );
  const subject = await db.subject.findFirstOrThrow({
    where: { code: "2300118A" },
  });
  const r = await agents.faculty
    .post(`/api/v1/faculty/revisions/${revisionId}/topics`)
    .set("Origin", origin)
    .set("X-CSRF-Token", csrf.faculty!)
    .send({
      key: "linear-search",
      unitLabel: "Searching & Sorting",
      lesson:
        "Linear search compares values in order and returns the first matching index. Its worst-case time is O(n), with O(1) extra space.",
      objectives: ["Find the first matching index"],
      prerequisiteKeys: [],
      reviewed: true,
      sourceSubjectId: subject.id,
      sourceUnitId: null,
      sourcePages: [42],
    });
  assert.equal(r.status, 201);
  topicId = r.body.topic.id;
  assert.equal(
    (await agents.student.get(`/api/v1/topics/${topicId}`)).status,
    404,
  );
  // Reviewed content fixtures exist only in algolearn_test. They are not syllabus or production seeds.
  for (const [difficulty, count] of [
    ["EASY", 6],
    ["MEDIUM", 7],
    ["HARD", 7],
  ] as const)
    for (let i = 0; i < count; i++)
      await db.question.create({
        data: {
          topicId,
          objective: "Find the first matching index",
          difficulty,
          prompt: `Test fixture ${difficulty}-${i}: which index is returned for [5, 5] when searching for 5?`,
          options: ["0", "1", "2", "Not found"],
          correctOption: 0,
          explanation: "The first occurrence is at index zero.",
          reviewed: true,
        },
      });
  for (let n = 0; n < 2; n++) {
    const p = await db.problem.create({
      data: {
        topicId,
        title: `Fixture first occurrence ${n}`,
        statement:
          "Read values and a target, then print the first matching zero-based index or -1. This statement belongs only to automated tests.",
        starterCodes: { c: "", cpp: "", java: "", python: "" },
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
    if (n === 0) problemId = p.id;
  }
  const unreviewed = await db.problem.create({
    data: {
      topicId,
      title: "Unreviewed test fixture",
      statement: "This unreviewed fixture must never reach students.",
      starterCodes: { c: "", cpp: "", java: "", python: "" },
    },
  });
  const publications = await Promise.all(
    Array.from({ length: 2 }, () =>
      agents.faculty
        .post(`/api/v1/faculty/revisions/${revisionId}/publish`)
        .set("Origin", origin)
        .set("X-CSRF-Token", csrf.faculty!)
        .send({}),
    ),
  );
  assert.deepEqual(
    publications.map((result) => result.status).sort(),
    [200, 409],
  );
  const visible = await agents.student.get(`/api/v1/topics/${topicId}`);
  assert.equal(visible.body.problems.length, 2);
  const courseTopics = await agents.student.get(
    `/api/v1/courses/${courseId}/topics`,
  );
  assert.equal(courseTopics.status, 200);
  assert.deepEqual(courseTopics.body.topics[0].objectives, [
    "Find the first matching index",
  ]);
  assert.equal(courseTopics.body.topics[0].progress.state, "UNASSESSED");
  assert.equal(
    (await agents.student.get(`/api/v1/problems/${unreviewed.id}`)).status,
    404,
  );
  assert.equal(
    (await agents.faculty.get(`/api/v1/problems/${unreviewed.id}`)).status,
    200,
  );
  const copied = await agents.faculty
    .post(`/api/v1/faculty/courses/${courseId}/revisions`)
    .set("Origin", origin)
    .set("X-CSRF-Token", csrf.faculty!)
    .send({});
  assert.equal(copied.status, 201);
  const draftQuestion = await db.question.findFirstOrThrow({
    where: { topic: { revisionId: copied.body.revision.id } },
  });
  assert.equal(draftQuestion.reviewed, false);
  await assert.rejects(
    db.question.update({ where: { id: draftQuestion.id }, data: { topicId } }),
    "A draft cannot be moved under published content.",
  );
  await assert.rejects(
    db.courseTopic.update({
      where: { id: topicId },
      data: { lesson: "tampered" },
    }),
  );
  const q = await db.question.findFirstOrThrow({ where: { topicId } });
  await assert.rejects(
    db.question.update({ where: { id: q.id }, data: { correctOption: 1 } }),
  );
  assert.equal(
    (await agents.student.get(`/api/v1/topics/${topicId}`)).status,
    200,
  );
});
test("publication locks block concurrent edits and empty-course analytics retain topics", async () => {
  const subject = await db.subject.findFirstOrThrow();
  const course = await db.course.create({
    data: {
      code: "LOCK-FIXTURE",
      title: "Publication lock fixture",
      term: "Tests only",
    },
  });
  const revision = await db.courseRevision.create({
    data: { courseId: course.id, number: 1 },
  });
  const topic = await db.courseTopic.create({
    data: {
      revisionId: revision.id,
      key: "linear-search",
      title: "Lock fixture",
      unitLabel: "Fixture",
      position: 1,
      lesson: "Test-only lesson for publication synchronization.",
      objectives: [],
      prerequisiteKeys: [],
      sourceSubjectId: subject.id,
      sourcePages: [subject.startPage],
    },
  });
  let editing: Promise<boolean> | undefined;
  await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "CourseRevision" WHERE id=${revision.id}::uuid FOR UPDATE`;
    editing = db.courseTopic
      .update({
        where: { id: topic.id },
        data: { lesson: "Changed after validation" },
      })
      .then(
        () => true,
        () => false,
      );
    await delay(100);
    await tx.courseRevision.update({
      where: { id: revision.id },
      data: { status: "PUBLISHED", publishedAt: new Date() },
    });
    await tx.course.update({
      where: { id: course.id },
      data: { publishedRevisionId: revision.id },
    });
  });
  assert.equal(await editing, false);
  assert.equal(
    (await db.courseTopic.findUniqueOrThrow({ where: { id: topic.id } }))
      .lesson,
    topic.lesson,
  );
  const analytics = await agents.admin.get(
    `/api/v1/faculty/courses/${course.id}/analytics`,
  );
  assert.equal(analytics.status, 200);
  assert.equal(analytics.body.enrolledStudents, 0);
  assert.deepEqual(analytics.body.topicSummaries, [
    {
      topicId: topic.id,
      title: topic.title,
      completed: 0,
      weak: 0,
      insufficientEvidence: 0,
    },
  ]);
});

test("quizzes autosave, grade on the server, resume and submit exactly once", async () => {
  const created = await agents.student
    .post(`/api/v1/topics/${topicId}/quiz-attempts`)
    .set("Origin", origin)
    .set("X-CSRF-Token", csrf.student!)
    .send({});
  assert.equal(created.status, 201);
  const attemptId = created.body.attemptId;
  const resumed = await agents.student
    .post(`/api/v1/topics/${topicId}/quiz-attempts`)
    .set("Origin", origin)
    .set("X-CSRF-Token", csrf.student!)
    .send({});
  assert.equal(resumed.body.attemptId, attemptId);
  let quiz = await agents.student.get(`/api/v1/quiz-attempts/${attemptId}`);
  assert.equal(quiz.body.attempt.items.length, 10);
  assert.ok(!JSON.stringify(quiz.body).includes("correctOption"));
  assert.ok(!JSON.stringify(quiz.body).includes("explanation"));
  assert.equal(
    (await agents.peer.get(`/api/v1/quiz-attempts/${attemptId}`)).status,
    404,
  );
  for (const item of quiz.body.attempt.items) {
    const saved = await agents.student
      .put(`/api/v1/quiz-attempts/${attemptId}/answers/${item.id}`)
      .set("Origin", origin)
      .set("X-CSRF-Token", csrf.student!)
      .send({ selectedOption: 0, version: 0 });
    assert.equal(saved.status, 200);
    assert.equal(saved.body.version, 1);
  }
  const first = quiz.body.attempt.items[0];
  assert.equal(
    (
      await agents.student
        .put(`/api/v1/quiz-attempts/${attemptId}/answers/${first.id}`)
        .set("Origin", origin)
        .set("X-CSRF-Token", csrf.student!)
        .send({ selectedOption: 1, version: 0 })
    ).status,
    409,
  );
  const result = await agents.student
    .post(`/api/v1/quiz-attempts/${attemptId}/submit`)
    .set("Origin", origin)
    .set("X-CSRF-Token", csrf.student!)
    .send({});
  assert.equal(result.status, 200);
  assert.equal(result.body.score, 100);
  assert.equal(result.body.progress.state, "MASTERED");
  assert.equal(result.body.progress.completed, false);
  const twice = await agents.student
    .post(`/api/v1/quiz-attempts/${attemptId}/submit`)
    .set("Origin", origin)
    .set("X-CSRF-Token", csrf.student!)
    .send({});
  assert.equal(twice.body.score, 100);
  assert.equal(
    await db.quizAttempt.count({
      where: { id: attemptId, status: "COMPLETED" },
    }),
    1,
  );
  quiz = await agents.student.get(`/api/v1/quiz-attempts/${attemptId}`);
  assert.equal(quiz.body.attempt.items[0].correctOption, 0);
  assert.equal(quiz.body.attempt.progress.state, "MASTERED");
  assert.equal(quiz.body.attempt.progress.evidenceCount, 10);
  assert.ok(Array.isArray(quiz.body.attempt.recommendations));
});
test("drafts have optimistic versions and hidden execution data never leaks", async () => {
  const path = `/api/v1/problems/${problemId}/drafts/python`;
  const saved = await agents.student
    .put(path)
    .set("Origin", origin)
    .set("X-CSRF-Token", csrf.student!)
    .send({ source: "print(0)", version: 0 });
  assert.equal(saved.status, 200);
  assert.equal(saved.body.version, 1);
  assert.equal(
    (
      await agents.student
        .put(path)
        .set("Origin", origin)
        .set("X-CSRF-Token", csrf.student!)
        .send({ source: "print(1)", version: 0 })
    ).status,
    409,
  );
  assert.equal((await agents.student.get(path)).body.source, "print(0)");
  const publicProblem = await agents.student.get(
    `/api/v1/problems/${problemId}`,
  );
  assert.equal(publicProblem.body.problem.samples.length, 3);
  assert.ok(!JSON.stringify(publicProblem.body).includes("hidden"));
  const hidden = await db.testCase.findFirstOrThrow({
    where: { problemId, hidden: true },
  });
  const s = await db.submission.create({
    data: {
      studentId: users.student!,
      courseId,
      courseRevisionId: revisionId,
      problemId,
      language: "python",
      mode: "SUBMIT",
      source: "print(0)",
      idempotencyKey: newToken(),
      status: "FINISHED",
      verdict: "ACCEPTED",
      totalCount: 8,
      passedCount: 8,
      cases: {
        create: {
          position: hidden.position,
          testCaseId: hidden.id,
          verdict: "ACCEPTED",
          output: "DO_NOT_LEAK_HIDDEN",
          diagnostics: "SECRET_DIAGNOSTIC",
          judgeToken: "SECRET_JUDGE_TOKEN",
          time: "1",
          memory: 12,
        },
      },
    },
  });
  const result = await agents.student.get(`/api/v1/submissions/${s.id}`);
  assert.equal(result.status, 200);
  for (const secret of [
    "DO_NOT_LEAK_HIDDEN",
    "SECRET_DIAGNOSTIC",
    "SECRET_JUDGE_TOKEN",
    "expectedOutput",
    '"memory"',
  ])
    assert.ok(!JSON.stringify(result.body).includes(secret));
  const ack = await agents.student
    .post(`/api/v1/topics/${topicId}/acknowledgment`)
    .set("Origin", origin)
    .set("X-CSRF-Token", csrf.student!)
    .send({});
  assert.equal(ack.body.completed, true);
  const execution = await agents.student
    .post(`/api/v1/problems/${problemId}/submissions`)
    .set("Origin", origin)
    .set("X-CSRF-Token", csrf.student!)
    .send({
      language: "python",
      source: "print(0)",
      mode: "CUSTOM",
      idempotencyKey: crypto.randomUUID(),
    });
  assert.equal(
    execution.status,
    503,
    "Unconfigured/unverified execution must fail closed.",
  );
});
test("archived courses are readable while new activity is rejected; enrollment removal is audited", async () => {
  const search = await agents.admin.get(
    "/api/v1/admin/users?q=peer%40fixture.example",
  );
  assert.equal(search.body.total, 1);
  assert.equal(search.body.users[0].id, users.peer);
  const membership = await agents.admin
    .post(`/api/v1/admin/courses/${courseId}/memberships`)
    .set("Origin", origin)
    .set("X-CSRF-Token", csrf.admin!)
    .send({ userId: users.peer, memberRole: "STUDENT" });
  assert.equal(membership.status, 201);
  assert.equal(
    (await agents.peer.get(`/api/v1/courses/${courseId}/curriculum`)).status,
    200,
  );
  assert.equal(
    (
      await agents.student
        .delete(
          `/api/v1/admin/courses/${courseId}/memberships/${membership.body.membership.id}`,
        )
        .set("Origin", origin)
        .set("X-CSRF-Token", csrf.student!)
    ).status,
    403,
  );
  assert.equal(
    (
      await agents.admin
        .delete(
          `/api/v1/admin/courses/${courseId}/memberships/${membership.body.membership.id}`,
        )
        .set("Origin", origin)
        .set("X-CSRF-Token", csrf.admin!)
    ).status,
    204,
  );
  assert.equal(
    (await agents.peer.get(`/api/v1/courses/${courseId}/curriculum`)).status,
    404,
  );
  assert.ok(
    (await db.auditEvent.count({ where: { action: "MEMBERSHIP_REMOVED" } })) >
      0,
  );
  assert.equal(
    (
      await agents.admin
        .patch(`/api/v1/admin/courses/${courseId}`)
        .set("Origin", origin)
        .set("X-CSRF-Token", csrf.admin!)
        .send({ status: "ARCHIVED" })
    ).status,
    200,
  );
  assert.equal(
    (await agents.student.get(`/api/v1/topics/${topicId}`)).status,
    200,
  );
  assert.equal(
    (
      await agents.student
        .post(`/api/v1/topics/${topicId}/quiz-attempts`)
        .set("Origin", origin)
        .set("X-CSRF-Token", csrf.student!)
        .send({})
    ).status,
    409,
  );
  assert.equal(
    (
      await agents.student
        .put(`/api/v1/problems/${problemId}/drafts/python`)
        .set("Origin", origin)
        .set("X-CSRF-Token", csrf.student!)
        .send({ source: "preserved", version: 1 })
    ).status,
    409,
  );
  await agents.admin
    .patch(`/api/v1/admin/courses/${courseId}`)
    .set("Origin", origin)
    .set("X-CSRF-Token", csrf.admin!)
    .send({ status: "ACTIVE" });
});
test("unauthorized polling cannot mutate expired jobs and owner polling enforces terminal recovery", async () => {
  const s = await db.submission.create({
    data: {
      studentId: users.student!,
      courseId,
      courseRevisionId: revisionId,
      problemId,
      language: "python",
      mode: "CUSTOM",
      source: "Fixture only",
      idempotencyKey: crypto.randomUUID(),
      totalCount: 1,
      job: { create: { deadlineAt: new Date(Date.now() - 1000) } },
    },
  });
  assert.equal(
    (await agents.peer.get(`/api/v1/submissions/${s.id}`)).status,
    404,
  );
  assert.equal(
    (await db.submission.findUniqueOrThrow({ where: { id: s.id } })).status,
    "QUEUED",
  );
  const result = await agents.student.get(`/api/v1/submissions/${s.id}`);
  assert.equal(result.body.submission.status, "EXECUTION_FAILED");
  assert.equal(result.body.submission.verdict, "INFRASTRUCTURE_FAILURE");
});
test("password-reset consumption revokes sessions and expired sessions are rejected", async () => {
  const token = newToken(),
    replacement = "Replacement-fixture-password-2026";
  await db.authToken.create({
    data: {
      userId: users.peer!,
      purpose: "RESET",
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + 60000),
    },
  });
  assert.equal(
    (
      await request(app)
        .post("/api/v1/auth/password-reset/confirm")
        .set("Origin", origin)
        .send({ token, password: replacement })
    ).status,
    200,
  );
  assert.equal(
    (
      await request(app)
        .post("/api/v1/auth/password-reset/confirm")
        .set("Origin", origin)
        .send({ token, password: replacement })
    ).status,
    422,
  );
  assert.equal((await agents.peer.get("/api/v1/me")).status, 401);
  const login = await agents.peer
    .post("/api/v1/auth/login")
    .set("Origin", origin)
    .send({ email: "peer@fixture.example", password: replacement });
  assert.equal(login.status, 200);
  await db.session.updateMany({
    where: { userId: users.peer, revokedAt: null },
    data: { expiresAt: new Date(Date.now() - 1000) },
  });
  assert.equal((await agents.peer.get("/api/v1/me")).status, 401);
  const known = await request(app)
      .post("/api/v1/auth/password-reset")
      .set("Origin", origin)
      .send({ email: "peer@fixture.example" }),
    unknown = await request(app)
      .post("/api/v1/auth/password-reset")
      .set("Origin", origin)
      .send({ email: "absent@fixture.example" });
  assert.equal(known.status, 200);
  assert.deepEqual(known.body, unknown.body);
  assert.equal(known.body.delivery, "local-preview");
  let resetPreviewFound = false;
  for (let attempt = 0; attempt < 100 && !resetPreviewFound; attempt++) {
    const preview = await request(app).get("/api/v1/dev/mail-preview");
    for (const message of preview.body.messages as Array<{
      to: string;
      purpose: string;
      actionUrl: string;
    }>) {
      if (message.to !== "peer@fixture.example" || message.purpose !== "RESET")
        continue;
      const candidate =
        new URLSearchParams(message.actionUrl.split("#")[1]).get("token") ?? "";
      const active = await db.authToken.findUnique({
        where: { tokenHash: hashToken(candidate) },
      });
      if (active && !active.usedAt) {
        resetPreviewFound = true;
        break;
      }
    }
    if (!resetPreviewFound) await delay(20);
  }
  assert.equal(
    resetPreviewFound,
    true,
    "The current reset link must be accessible through local preview",
  );
});
test("simultaneous reset links cannot both change one account's password", async () => {
  const account = await db.user.create({
    data: {
      email: "reset-race@fixture.example",
      name: "Reset race fixture",
      role: "STUDENT",
      status: "ACTIVE",
      passwordHash: await hashPassword(password),
    },
  });
  const tokens = [newToken(), newToken()];
  await db.authToken.createMany({
    data: tokens.map((token) => ({
      userId: account.id,
      purpose: "RESET",
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + 60000),
    })),
  });
  const results = await Promise.all(
    tokens.map((token) =>
      request(app)
        .post("/api/v1/auth/password-reset/confirm")
        .set("Origin", origin)
        .send({ token, password }),
    ),
  );
  assert.deepEqual(results.map((result) => result.status).sort(), [200, 422]);
});

test("activation links are single-use, deactivation immediately revokes sessions", async () => {
  const u = await db.user.create({
      data: {
        email: "pending@fixture.example",
        name: "Activation fixture",
        role: "STUDENT",
      },
    }),
    token = newToken();
  await db.authToken.create({
    data: {
      userId: u.id,
      purpose: "ACTIVATION",
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + 60000),
    },
  });
  assert.equal(
    (
      await request(app)
        .post("/api/v1/auth/activate")
        .set("Origin", origin)
        .send({ token, password })
    ).status,
    200,
  );
  assert.equal(
    (
      await request(app)
        .post("/api/v1/auth/activate")
        .set("Origin", origin)
        .send({ token, password })
    ).status,
    422,
  );
  const r = await agents.admin
    .patch(`/api/v1/admin/users/${users.student}`)
    .set("Origin", origin)
    .set("X-CSRF-Token", csrf.admin!)
    .send({ status: "DEACTIVATED" });
  assert.equal(r.status, 200);
  assert.equal((await agents.student.get("/api/v1/me")).status, 401);
  assert.ok(
    (await db.auditEvent.count({ where: { action: "USER_STATUS_CHANGED" } })) >
      0,
  );
});
test("expired activation links fail clearly and leave the account pending", async () => {
  const email = `expired-${crypto.randomUUID()}@fixture.example`;
  const user = await db.user.create({
      data: {
        email,
        name: "Expired activation fixture",
        role: "STUDENT",
        status: "PENDING",
      },
    }),
    token = newToken();
  await db.authToken.create({
    data: {
      userId: user.id,
      purpose: "ACTIVATION",
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() - 1000),
    },
  });
  const activation = await request(app)
    .post("/api/v1/auth/activate")
    .set("Origin", origin)
    .send({ token, password });
  assert.equal(activation.status, 422);
  assert.equal(activation.body.code, "TOKEN_EXPIRED");
  assert.match(activation.body.message, /expired/i);
  const unchanged = await db.user.findUniqueOrThrow({ where: { id: user.id } });
  assert.equal(unchanged.status, "PENDING");
  assert.equal(unchanged.passwordHash, null);
  assert.equal(
    (
      await request(app)
        .post("/api/v1/auth/login")
        .set("Origin", origin)
        .send({ email, password })
    ).status,
    401,
  );
});
test.after(async () => {
  await db.$executeRawUnsafe('TRUNCATE TABLE "User", "Course" CASCADE');
  await db.$disconnect();
});
