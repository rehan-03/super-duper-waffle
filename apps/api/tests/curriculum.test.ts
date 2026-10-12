import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { configureTestEnvironment } from "../../../scripts/test-environment.mjs";
const testUrl = configureTestEnvironment();
const { db } = await import("../src/db.js");
function seed() {
  const cli = path.resolve("../../node_modules/tsx/dist/cli.mjs");
  const result = spawnSync(process.execPath, [cli, "src/seed.ts"], {
    env: { ...process.env, DATABASE_URL: testUrl },
    encoding: "utf8",
    windowsHide: true,
  });
  assert.equal(result.status, 0, result.stderr);
}
function seedCourses() {
  const cli = path.resolve("../../node_modules/tsx/dist/cli.mjs");
  const result = spawnSync(process.execPath, [cli, "src/seed-courses.ts"], {
    env: { ...process.env, DATABASE_URL: testUrl },
    encoding: "utf8",
    windowsHide: true,
  });
  assert.equal(result.status, 0, result.stderr);
}
test("all four PDF imports preserve academic hierarchy and are repeatable", async () => {
  seed();
  const counts = async () => ({
    sources: await db.curriculumSource.count(),
    pages: await db.sourcePage.count(),
    years: await db.academicYear.count(),
    semesters: await db.semester.count(),
    subjects: await db.subject.count(),
    units: await db.curriculumUnit.count(),
    topics: await db.curriculumTopic.count(),
  });
  const first = await counts();
  const originalIds = await db.subject.findMany({
    select: { id: true },
    orderBy: { id: "asc" },
  });
  assert.equal(first.sources, 4);
  assert.equal(first.pages, 229);
  assert.equal(first.years, 4);
  assert.equal(first.semesters, 8);
  assert.equal(first.subjects, 89);
  assert.equal(first.units, 303);
  assert.equal(first.topics, 303);
  seed();
  assert.deepEqual(await counts(), first);
  assert.deepEqual(
    await db.subject.findMany({ select: { id: true }, orderBy: { id: "asc" } }),
    originalIds,
  );
  const ids = await db.subject.findMany({
    select: {
      id: true,
      semesterId: true,
      pathway: true,
      academicYear: { select: { number: true } },
      semester: { select: { number: true } },
    },
  });
  for (const s of ids) {
    if (s.pathway === "conditional_exit") assert.equal(s.semesterId, null);
    else
      assert.ok(
        [s.academicYear.number * 2 - 1, s.academicYear.number * 2].includes(
          s.semester!.number,
        ),
      );
  }
  const catalog = JSON.parse(await readFile("data/curriculum.json", "utf8"));
  for (const source of catalog.sources) {
    const row = await db.curriculumSource.findUniqueOrThrow({
      where: { filename: source.filename },
      include: { pages: true },
    });
    assert.equal(row.sha256, source.sha256);
    assert.equal(row.pages.length, source.pages);
  }
  const units = await db.curriculumUnit.findMany({
    include: {
      subject: true,
      sourceReferences: { include: { sourcePage: true } },
      topics: { orderBy: { position: "asc" } },
    },
  });
  for (const unit of units) {
    const s = catalog.subjects.find(
      (s: { code: string; source_file: string }) =>
        s.code === unit.subject.code,
    );
    const sourceUnit = s.units.find(
      (u: { number: number }) => u.number === unit.number,
    );
    assert.deepEqual(
      unit.topics.map((t) => t.text),
      sourceUnit.topics,
    );
    assert.deepEqual(
      unit.sourceReferences
        .map((r) => r.sourcePage.number)
        .sort((a, b) => a - b),
      sourceUnit.source_pages.slice().sort((a: number, b: number) => a - b),
    );
    for (const ref of unit.sourceReferences)
      assert.equal(ref.sourcePage.sourceId, unit.subject.sourceId);
  }
  assert.equal(
    await db.user.count(),
    0,
    "Curriculum import must not invent users or activity.",
  );
  assert.equal(
    await db.course.count(),
    0,
    "Curriculum import must not invent course offerings.",
  );
});
test("ambiguous and missing source content is retained rather than guessed", async () => {
  const sa = await db.subject.findFirstOrThrow({ where: { code: "23014010" } });
  assert.ok(JSON.stringify(sa.issues).includes("2301410"));
  const democracy = await db.subject.findFirstOrThrow({
    where: { code: "2301209" },
    include: { units: true },
  });
  assert.equal(democracy.units.length, 3);
  assert.ok(JSON.stringify(democracy.issues).includes("Units IV and V"));
  for (const code of ["2301221", "2301222", "2301321", "2301322", "2301220"]) {
    const s = await db.subject.findFirstOrThrow({
      where: { code },
      include: { units: true },
    });
    assert.equal(s.units.length, 0);
    assert.ok(Array.isArray(s.issues) && s.issues.length > 0);
  }
  const draw = await db.subject.findFirstOrThrow({
    where: { code: "2300110A" },
    include: { units: { orderBy: { number: "asc" } } },
  });
  assert.deepEqual(
    draw.units.map((u) => u.number),
    [1, 2, 3, 4, 5],
  );
  const forensic = await db.subject.findFirstOrThrow({
    where: { code: "2301411C" },
    include: { units: { orderBy: { number: "asc" } } },
  });
  assert.deepEqual(
    forensic.units.map((u) => u.number),
    [1, 2, 3, 4, 5],
  );
});
test("database rejects duplicate curriculum keys and broken foreign references", async () => {
  const source = await db.curriculumSource.findFirstOrThrow();
  await assert.rejects(
    db.curriculumSource.create({
      data: {
        filename: source.filename,
        sha256: source.sha256,
        pageCount: source.pageCount,
      },
    }),
  );
  await assert.rejects(
    db.curriculumUnit.create({
      data: {
        subjectId: "00000000-0000-0000-0000-000000000000",
        number: 1,
        title: "invalid",
        sourcePages: [],
      },
    }),
  );
});
test("development provisioning creates repeatable official semester course shells", async () => {
  const fixture = crypto.randomUUID();
  await db.user.createMany({
    data: [
      {
        email: `student-${fixture}@fixture.example`,
        name: "Course seed student",
        role: "STUDENT",
        status: "ACTIVE",
      },
      {
        email: `faculty-${fixture}@fixture.example`,
        name: "Course seed faculty",
        role: "FACULTY",
        status: "ACTIVE",
      },
      {
        email: `pending-${fixture}@fixture.example`,
        name: "Pending course seed student",
        role: "STUDENT",
        status: "PENDING",
      },
    ],
  });
  const eligible = await db.user.count({
    where: {
      status: "ACTIVE",
      role: { in: ["STUDENT", "FACULTY"] },
    },
  });
  const subjectCount = await db.subject.count({
    where: { semesterId: { not: null } },
  });

  seedCourses();
  const provisioned = await db.course.findMany({
    where: { code: { startsWith: "DEV-" } },
    include: { subjects: true, memberships: true },
  });
  assert.equal(provisioned.length, 8);
  assert.equal(
    provisioned.reduce((sum, course) => sum + course.subjects.length, 0),
    subjectCount,
  );
  assert.equal(
    provisioned.reduce((sum, course) => sum + course.memberships.length, 0),
    provisioned.length * eligible,
  );
  assert.ok(provisioned.every((course) => course.publishedRevisionId === null));

  seedCourses();
  assert.equal(
    await db.course.count({ where: { code: { startsWith: "DEV-" } } }),
    8,
  );
  assert.equal(
    await db.courseMembership.count({
      where: { course: { code: { startsWith: "DEV-" } } },
    }),
    provisioned.length * eligible,
  );

  await db.courseMembership.deleteMany({
    where: { course: { code: { startsWith: "DEV-" } } },
  });
  await db.courseSubject.deleteMany({
    where: { course: { code: { startsWith: "DEV-" } } },
  });
  await db.course.deleteMany({ where: { code: { startsWith: "DEV-" } } });
  await db.user.deleteMany({
    where: { email: { endsWith: "@fixture.example" } },
  });
});
test.after(async () => {
  await db.$disconnect();
});
