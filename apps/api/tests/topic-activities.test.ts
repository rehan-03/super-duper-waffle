import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { configureTestEnvironment } from "../../../scripts/test-environment.mjs";
configureTestEnvironment();
const { db } = await import("../src/db.js"),
  { app } = await import("../src/app.js"),
  { hashPassword } = await import("../src/security.js"),
  { loadProgress, progressKey } = await import("../src/progress.js"),
  { learningDrafts } = await import("../src/draft-library.js");
const origin = "http://localhost:5173",
  password = "Topic-fixture-password-2026";
const staff = request.agent(app),
  student = request.agent(app),
  peer = request.agent(app);
let courseId = "",
  revisionId = "",
  staffId = "",
  studentId = "",
  subjectId = "",
  csrf = "",
  studentCsrf = "";
test.before(async () => {
  await db.$executeRawUnsafe('TRUNCATE TABLE "User", "Course" CASCADE');
  const passwordHash = await hashPassword(password);
  for (const [agent, name, role] of [
    [staff, "topic-staff", "FACULTY"],
    [student, "topic-student", "STUDENT"],
    [peer, "topic-peer", "FACULTY"],
  ] as const) {
    const user = await db.user.create({
      data: {
        email: `${name}@fixture.example`,
        name,
        role,
        status: "ACTIVE",
        passwordHash,
      },
    });
    const login = await agent
      .post("/api/v1/auth/login")
      .set("Origin", origin)
      .send({ email: user.email, password });
    assert.equal(login.status, 200);
    if (agent === staff) {
      staffId = user.id;
      csrf = login.body.csrfToken;
    }
    if (agent === student) {
      studentId = user.id;
      studentCsrf = login.body.csrfToken;
    }
  }
  const subject = await db.subject.findFirstOrThrow({
    where: { code: "2300118A" },
  });
  subjectId = subject.id;
  const course = await db.course.create({
    data: {
      code: "ACTIVITY-FIXTURE",
      title: "Topic activity fixture",
      term: "Test only",
      subjects: { create: { subjectId } },
      memberships: {
        create: [
          { userId: staffId, memberRole: "FACULTY" },
          { userId: studentId, memberRole: "STUDENT" },
        ],
      },
    },
  });
  courseId = course.id;
  const revision = await db.courseRevision.create({
    data: { courseId, number: 1 },
  });
  revisionId = revision.id;
});
const body = (key: string, requiredActivities: string[] = ["LESSON"]) => ({
  key,
  title: key,
  unitLabel: "Source reference",
  lesson:
    "Original fixture lesson with a meaningful explanation and worked example.",
  objectives: ["Explain the example"],
  prerequisiteKeys: [],
  sourceSubjectId: subjectId,
  sourceUnitId: null,
  sourcePages: [42],
  visualizerKey: null,
  requiredActivities,
  blockedActivities: [],
  reviewed: false,
});
const post = (route: string, data: unknown) =>
  staff
    .post(`/api/v1${route}`)
    .set("Origin", origin)
    .set("X-CSRF-Token", csrf)
    .send(data);
test("theory and blocked practical completion use declared activities while legacy rules survive", async () => {
  const theory = await post(
    `/faculty/revisions/${revisionId}/topics`,
    body("theory-only"),
  );
  assert.equal(theory.status, 201);
  const practical = await post(`/faculty/revisions/${revisionId}/topics`, {
    ...body("sql-practical", ["LESSON", "PRACTICAL"]),
    blockedActivities: [
      {
        activity: "PRACTICAL",
        reason: "Requires an isolated SQL environment that is not configured.",
      },
    ],
  });
  assert.equal(practical.status, 201);
  await db.lessonAcknowledgment.createMany({
    data: [theory.body.topic.id, practical.body.topic.id].map((topicId) => ({
      studentId,
      topicId,
    })),
  });
  const legacy = await db.courseTopic.create({
    data: {
      ...body("legacy"),
      revisionId,
      position: 3,
      completionRule: "LEGACY_V1",
    },
  });
  await db.lessonAcknowledgment.create({
    data: { studentId, topicId: legacy.id },
  });
  const data = await loadProgress(
    [studentId],
    [theory.body.topic.id, practical.body.topic.id, legacy.id],
  );
  assert.equal(
    data.get(progressKey(studentId, theory.body.topic.id))?.completed,
    true,
  );
  assert.equal(
    data.get(progressKey(studentId, theory.body.topic.id))?.state,
    "NOT_APPLICABLE",
  );
  assert.equal(
    data.get(progressKey(studentId, practical.body.topic.id))?.completed,
    false,
  );
  assert.equal(data.get(progressKey(studentId, legacy.id))?.completed, false);
  assert.deepEqual(
    data.get(progressKey(studentId, legacy.id))?.requiredActivities,
    ["LESSON", "QUIZ", "CODING"],
  );
});
test("saved-version review records identity, stale edits fail and material edits clear approval", async () => {
  const created = await post(
      `/faculty/revisions/${revisionId}/topics`,
      body("reviewable-theory"),
    ),
    id = created.body.topic.id;
  assert.equal(
    (await peer.get(`/api/v1/faculty/courses/${courseId}/revisions`)).status,
    404,
  );
  assert.equal(
    (
      await student
        .post(`/api/v1/faculty/topics/${id}/review`)
        .set("Origin", origin)
        .set("X-CSRF-Token", studentCsrf)
        .send({ version: 0, approved: true })
    ).status,
    403,
  );
  assert.equal(
    (await post(`/faculty/topics/${id}/review`, { version: 0, approved: true }))
      .status,
    200,
  );
  const approved = await db.courseTopic.findUniqueOrThrow({ where: { id } });
  assert.equal(approved.reviewerId, staffId);
  assert.ok(approved.reviewedAt);
  const saves = await Promise.all(
    [
      "First concurrent edit with an explanation.",
      "Second concurrent edit with an explanation.",
    ].map((lesson) =>
      staff
        .patch(`/api/v1/faculty/topics/${id}`)
        .set("Origin", origin)
        .set("X-CSRF-Token", csrf)
        .send({
          ...body("reviewable-theory"),
          lesson,
          version: 0,
          reviewed: true,
        }),
    ),
  );
  assert.deepEqual(saves.map((r) => r.status).sort(), [200, 409]);
  const edited = await db.courseTopic.findUniqueOrThrow({ where: { id } });
  assert.equal(edited.reviewed, false);
  assert.equal(edited.reviewerId, null);
  assert.equal(edited.version, 1);
  assert.equal(
    (await post(`/faculty/topics/${id}/review`, { version: 0, approved: true }))
      .status,
    409,
  );
  assert.equal(
    (await post(`/faculty/topics/${id}/review`, { version: 1, approved: true }))
      .status,
    200,
  );
  assert.equal(
    await db.auditEvent.count({
      where: { entityId: id, action: "CONTENT_REVIEWED" },
    }),
    2,
  );
});
test("draft imports are idempotent, source-scoped, unreviewed and create no learner events", async () => {
  const before = {
    members: await db.courseMembership.count(),
    attempts: await db.quizAttempt.count(),
    submissions: await db.submission.count(),
    ack: await db.lessonAcknowledgment.count(),
  };
  const imported = await post(
    `/faculty/revisions/${revisionId}/import-drafts`,
    { keys: ["draft-linear-search", "source-2300118a-u4-p1"] },
  );
  assert.equal(imported.status, 201);
  assert.equal(imported.body.imported, 2);
  const repeated = await post(
    `/faculty/revisions/${revisionId}/import-drafts`,
    { keys: ["draft-linear-search", "source-2300118a-u4-p1"] },
  );
  assert.equal(repeated.body.imported, 0);
  assert.equal(repeated.body.skipped, 2);
  assert.equal(
    (
      await post(`/faculty/revisions/${revisionId}/import-drafts`, {
        keys: ["draft-heap-sort"],
      })
    ).status,
    422,
  );
  const topic = await db.courseTopic.findUniqueOrThrow({
    where: { revisionId_key: { revisionId, key: "draft-linear-search" } },
    include: { questions: true, problems: { include: { tests: true } } },
  });
  assert.equal(topic.reviewed, false);
  assert.equal(topic.reviewerId, null);
  assert.equal(topic.questions.length, 20);
  assert.deepEqual(
    ["EASY", "MEDIUM", "HARD"].map(
      (d) => topic.questions.filter((q) => q.difficulty === d).length,
    ),
    [6, 7, 7],
  );
  assert.equal(topic.problems.length, 2);
  assert.ok(
    topic.problems.every(
      (p) =>
        !p.reviewed &&
        p.tests.length === 8 &&
        p.tests.filter((t) => !t.hidden).length === 3,
    ),
  );
  assert.deepEqual(
    {
      members: await db.courseMembership.count(),
      attempts: await db.quizAttempt.count(),
      submissions: await db.submission.count(),
      ack: await db.lessonAcknowledgment.count(),
    },
    before,
  );
  const validation = await staff.get(
    `/api/v1/faculty/revisions/${revisionId}/validation`,
  );
  assert.equal(validation.status, 200);
  assert.equal(validation.body.valid, false);
  assert.ok(
    validation.body.errors.some((e: string) => e.includes("incomplete")),
  );
  const coverage = await staff.get("/api/v1/faculty/coverage");
  assert.equal(coverage.status, 200);
  assert.ok(
    coverage.body.entries.every(
      (e: { subjectCode: string }) => e.subjectCode === "2300118A",
    ),
  );
  assert.equal((await student.get("/api/v1/faculty/coverage")).status, 403);
  assert.equal((await student.get(`/api/v1/topics/${topic.id}`)).status, 404);
});
test("draft reimports at the topic limit skip existing content and reject new content atomically", async () => {
  const revision = await db.courseRevision.create({
    data: { courseId, number: 2 },
  });
  const route = `/faculty/revisions/${revision.id}/import-drafts`;
  assert.equal(
    (await post(route, { keys: ["draft-linear-search"] })).status,
    201,
  );
  await db.courseTopic.createMany({
    data: Array.from({ length: 1999 }, (_, i) => ({
      ...body(`limit-fixture-${i}`),
      revisionId: revision.id,
      position: i + 2,
    })),
  });
  const repeated = await post(route, { keys: ["draft-linear-search"] });
  assert.equal(repeated.status, 201);
  assert.equal(repeated.body.imported, 0);
  assert.equal(repeated.body.skipped, 1);
  const overflow = await post(route, {
    keys: ["draft-linear-search", "source-2300118a-u4-p1"],
  });
  assert.equal(overflow.status, 422);
  assert.equal(overflow.body.code, "TOPIC_LIMIT");
  assert.equal(
    await db.courseTopic.count({ where: { revisionId: revision.id } }),
    2000,
  );
});

test("every complete coding draft has bounded coherent assessments and source provenance", () => {
  const complete = learningDrafts.filter(
    (d) => d.authoringStatus === "COMPLETE_DRAFT",
  );
  assert.ok(complete.length >= 10);
  for (const draft of complete) {
    if (draft.requiredActivities.includes("QUIZ")) {
      assert.equal(draft.questions.length, 20);
      assert.equal(new Set(draft.questions.map((q) => q.prompt)).size, 20);
    }
    for (const q of draft.questions) {
      assert.equal(new Set(q.options).size, q.options.length);
      assert.ok(q.correctOption >= 0 && q.correctOption < q.options.length);
    }
    if (draft.requiredActivities.includes("CODING"))
      for (const p of draft.problems) {
        assert.equal(p.tests.length, 8);
        assert.equal(p.tests.filter((t) => t.hidden).length, 5);
        assert.equal(new Set(p.tests.map((t) => t.input)).size, 8);
      }
    assert.ok(draft.sourcePages.length);
    assert.ok(draft.lesson.includes("Provenance"));
  }
});
test.after(async () => db.$disconnect());
