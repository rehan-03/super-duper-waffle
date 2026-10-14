import { configureTestEnvironment } from "../scripts/test-environment.mjs";
export default async function () {
  configureTestEnvironment();
  const { db } = await import("../apps/api/src/db.js"),
    { hashPassword } = await import("../apps/api/src/security.js");
  await db.$executeRawUnsafe('TRUNCATE TABLE "User", "Course" CASCADE');
  const hash = await hashPassword("Browser-fixture-password-2026");
  const student = await db.user.create({
    data: {
      email: "student@browser.fixture",
      name: "Browser Student",
      role: "STUDENT",
      status: "ACTIVE",
      passwordHash: hash,
    },
  });
  const faculty = await db.user.create({
    data: {
      email: "faculty@browser.fixture",
      name: "Browser Faculty",
      role: "FACULTY",
      status: "ACTIVE",
      passwordHash: hash,
    },
  });
  await db.user.create({
    data: {
      email: "admin@browser.fixture",
      name: "Browser Admin",
      role: "ADMIN",
      status: "ACTIVE",
      passwordHash: hash,
    },
  });
  const demoHash = await hashPassword("AlgoLearn-demo-2026");
  const demoStudent = await db.user.create({
    data: {
      email: "student@demo.algolearn.local",
      name: "Demo Student",
      role: "STUDENT",
      status: "ACTIVE",
      passwordHash: demoHash,
    },
  });
  const demoFaculty = await db.user.create({
    data: {
      email: "faculty@demo.algolearn.local",
      name: "Demo Faculty",
      role: "FACULTY",
      status: "ACTIVE",
      passwordHash: demoHash,
    },
  });
  await db.user.create({
    data: {
      email: "admin@demo.algolearn.local",
      name: "Demo Administrator",
      role: "ADMIN",
      status: "ACTIVE",
      passwordHash: demoHash,
    },
  });
  const subject = await db.subject.findFirstOrThrow({
    where: { code: "2300118A" },
  });
  const course = await db.course.create({
    data: {
      code: "BROWSER-FIXTURE",
      title: "Browser test course",
      term: "Automated test only",
      subjects: { create: { subjectId: subject.id } },
      memberships: {
        create: [
          { userId: student.id, memberRole: "STUDENT" },
          { userId: faculty.id, memberRole: "FACULTY" },
          { userId: demoStudent.id, memberRole: "STUDENT" },
          { userId: demoFaculty.id, memberRole: "FACULTY" },
        ],
      },
    },
  });
  const revision = await db.courseRevision.create({
    data: { courseId: course.id, number: 1 },
  });
  const topic = await db.courseTopic.create({
    data: {
      revisionId: revision.id,
      key: "linear-search",
      title: "Linear search",
      unitLabel: "Searching & Sorting",
      position: 1,
      lesson:
        "Linear search examines values in order. Compare each value with the target and return the first matching index, or -1 if absent. Worst-case time is O(n), extra space O(1).",
      objectives: ["Find the first matching index"],
      prerequisiteKeys: [],
      reviewed: true,
      visualizerKey: "linear-search",
      reviewerId: faculty.id,
      reviewedAt: new Date(),
      sourceSubjectId: subject.id,
      sourcePages: [42],
    },
  });
  for (const [difficulty, count] of [
    ["EASY", 6],
    ["MEDIUM", 7],
    ["HARD", 7],
  ] as const)
    for (let i = 0; i < count; i++)
      await db.question.create({
        data: {
          topicId: topic.id,
          difficulty,
          objective: "Find the first matching index",
          prompt: `Browser fixture ${difficulty}-${i}: find the first index of 5 in [5, 5].`,
          options: ["Index 0", "Index 1", "Index 2", "Not found"],
          correctOption: 0,
          explanation: "The first matching value is at index zero.",
          reviewed: true,
        },
      });
  for (let n = 0; n < 2; n++)
    await db.problem.create({
      data: {
        topicId: topic.id,
        title: `First occurrence fixture ${n + 1}`,
        statement:
          "For this automated test fixture, read an array and a target, then print its first matching zero-based index or -1. Include a final newline.",
        starterCodes: {
          c: "#include <stdio.h>\nint main(void) { return 0; }",
          cpp: "#include <iostream>\nint main() { return 0; }",
          java: "public class Main { public static void main(String[] args) {} }",
          python: "# Read input and print the first matching index\n",
        },
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
  await db.problem.updateMany({
    where: { topicId: topic.id },
    data: { reviewed: true, reviewerId: faculty.id, reviewedAt: new Date() },
  });
  await db.question.updateMany({
    where: { topicId: topic.id },
    data: { reviewerId: faculty.id, reviewedAt: new Date() },
  });
  await db.courseRevision.update({
    where: { id: revision.id },
    data: { status: "PUBLISHED", publishedAt: new Date() },
  });
  await db.course.update({
    where: { id: course.id },
    data: { publishedRevisionId: revision.id },
  });
  const sqlSubject = await db.subject.findFirstOrThrow({
    where: { code: "2301304" },
  });
  const activityCourse = await db.course.create({
    data: {
      code: "ACTIVITY-BROWSER",
      title: "Activity browser fixtures",
      term: "Automated test only",
      createdAt: new Date("2000-01-01"),
      subjects: {
        create: [{ subjectId: subject.id }, { subjectId: sqlSubject.id }],
      },
      memberships: {
        create: [
          {
            userId: student.id,
            memberRole: "STUDENT",
            createdAt: new Date("2000-01-01"),
          },
          {
            userId: faculty.id,
            memberRole: "FACULTY",
            createdAt: new Date("2000-01-01"),
          },
        ],
      },
    },
  });
  const activityRevision = await db.courseRevision.create({
    data: { courseId: activityCourse.id, number: 1 },
  });
  for (const [key, title, requirements, sourceId, pages, blocked] of [
    [
      "theory-fixture",
      "Theory activity fixture",
      ["LESSON"],
      subject.id,
      [42],
      [],
    ],
    [
      "practical-fixture",
      "SQL practical fixture",
      ["LESSON", "PRACTICAL"],
      sqlSubject.id,
      [10],
      [
        {
          activity: "PRACTICAL",
          reason:
            "An isolated SQL database and practical evidence workflow are not configured.",
        },
      ],
    ],
  ] as const) {
    await db.courseTopic.create({
      data: {
        revisionId: activityRevision.id,
        key,
        title,
        unitLabel: "Activity test fixture",
        position: key === "theory-fixture" ? 1 : 2,
        lesson:
          "Test-only original explanatory lesson with a worked example. Completion requires only the activities declared for this fixture.",
        objectives: ["Explain the test fixture"],
        prerequisiteKeys: [],
        sourceSubjectId: sourceId,
        sourcePages: [...pages],
        visualizerKey: null,
        requiredActivities: [...requirements],
        blockedActivities: JSON.parse(JSON.stringify(blocked)),
        reviewed: true,
        reviewerId: faculty.id,
        reviewedAt: new Date(),
      },
    });
  }
  await db.courseRevision.update({
    where: { id: activityRevision.id },
    data: { status: "PUBLISHED", publishedAt: new Date() },
  });
  await db.course.update({
    where: { id: activityCourse.id },
    data: { publishedRevisionId: activityRevision.id },
  });
  await db.$disconnect();
}
