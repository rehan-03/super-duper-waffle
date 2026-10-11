import { readFile } from "node:fs/promises";
export default async function () {
  const text = await readFile(".env", "utf8"),
    url = text.match(/^TEST_DATABASE_URL=(.+)$/m)?.[1]?.trim();
  if (!url || new URL(url).pathname !== "/algolearn_test")
    throw new Error("Browser tests require the isolated test database.");
  process.env.DATABASE_URL = url;
  process.env.NODE_ENV = "test";
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
  await db.courseRevision.update({
    where: { id: revision.id },
    data: { status: "PUBLISHED", publishedAt: new Date() },
  });
  await db.course.update({
    where: { id: course.id },
    data: { publishedRevisionId: revision.id },
  });
  await db.$disconnect();
}
