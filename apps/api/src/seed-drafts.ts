import { db } from "./db.js";
import { config } from "./config.js";
import { learningDrafts } from "./draft-library.js";
import { importLearningDrafts } from "./draft-import.js";
if (config.NODE_ENV === "production")
  throw new Error(
    "Local draft provisioning is disabled in production. Assigned faculty must use the content studio.",
  );
const courses = await db.course.findMany({
  where: { code: { startsWith: "DEV-" }, status: "ACTIVE" },
  include: { subjects: { include: { subject: true } } },
});
if (!courses.length)
  throw new Error(
    "No existing development course shells found. The importer requires local course shells; it does not select institutional electives or enroll users.",
  );
// Conditional exits have no semester shell. Create clearly labeled local review
// shelves with no memberships, rather than pretending they are institutional enrollment.
const linkedCodes = new Set(
  courses.flatMap((c) => c.subjects.map((s) => s.subject.code)),
);
for (const code of new Set(learningDrafts.map((d) => d.sourceCode))) {
  if (linkedCodes.has(code)) continue;
  const subject = await db.subject.findFirstOrThrow({ where: { code } });
  const shelf = await db.course.upsert({
    where: { code: `DEV-DRAFT-REVIEW-${code}` },
    create: {
      code: `DEV-DRAFT-REVIEW-${code}`,
      title: `Draft review shelf: ${subject.title}`,
      term: "Local review only; no institutional enrollment",
      subjects: { create: { subjectId: subject.id } },
    },
    update: {},
    include: { subjects: { include: { subject: true } } },
  });
  courses.push(shelf);
}
let imported = 0,
  skipped = 0;
for (const course of courses) {
  const codes = new Set(course.subjects.map((s) => s.subject.code));
  const keys = learningDrafts
    .filter((d) => codes.has(d.sourceCode))
    .map((d) => d.key);
  if (!keys.length) continue;
  const revision = await db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${course.id}))`;
    const existing = await tx.courseRevision.findFirst({
      where: { courseId: course.id, status: "DRAFT" },
    });
    if (existing) return existing;
    const latest = await tx.courseRevision.aggregate({
      where: { courseId: course.id },
      _max: { number: true },
    });
    return tx.courseRevision.create({
      data: { courseId: course.id, number: (latest._max.number ?? 0) + 1 },
    });
  });
  for (let i = 0; i < keys.length; i += 100) {
    const result = await importLearningDrafts(
      revision.id,
      keys.slice(i, i + 100),
      null,
    );
    imported += result.imported;
    skipped += result.skipped;
  }
}
console.log(
  JSON.stringify({
    imported,
    skipped,
    completeDraftModules: learningDrafts.filter(
      (d) => d.authoringStatus === "COMPLETE_DRAFT",
    ).length,
    incompleteSourceDrafts: learningDrafts.filter(
      (d) => d.authoringStatus === "INCOMPLETE",
    ).length,
    reviewed: 0,
    published: 0,
    learnerEventsCreated: 0,
  }),
);
await db.$disconnect();
