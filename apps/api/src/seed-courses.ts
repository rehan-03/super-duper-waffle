import { db } from "./db.js";
import { config } from "./config.js";

if (config.NODE_ENV === "production")
  throw new Error(
    "Development course provisioning is disabled in production. Create institutional offerings through the admin workflow.",
  );

const semesters = await db.semester.findMany({
  include: {
    academicYear: true,
    subjects: { select: { id: true } },
  },
  orderBy: { number: "asc" },
});

if (
  semesters.length !== 8 ||
  semesters.some((semester) => !semester.subjects.length)
)
  throw new Error(
    "Official curriculum is incomplete. Run db:seed before provisioning courses.",
  );

const members = await db.user.findMany({
  where: {
    status: "ACTIVE",
    role: { in: ["STUDENT", "FACULTY"] },
  },
  select: { id: true, role: true },
});

const result = await db.$transaction(async (tx) => {
  let subjectLinks = 0;
  let memberships = 0;

  for (const semester of semesters) {
    const patternCode = semester.academicYear.pattern
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const course = await tx.course.upsert({
      where: { code: `DEV-${patternCode}-SEM-${semester.number}` },
      create: {
        code: `DEV-${patternCode}-SEM-${semester.number}`,
        title: `${semester.academicYear.label} · ${semester.label}`,
        term: `${semester.academicYear.pattern} Pattern`,
      },
      update: {},
    });

    const linked = await tx.courseSubject.createMany({
      data: semester.subjects.map((subject) => ({
        courseId: course.id,
        subjectId: subject.id,
      })),
      skipDuplicates: true,
    });
    subjectLinks += linked.count;

    const enrolled = await tx.courseMembership.createMany({
      data: members.map((member) => ({
        courseId: course.id,
        userId: member.id,
        memberRole: member.role,
      })),
      skipDuplicates: true,
    });
    memberships += enrolled.count;
  }

  return { subjectLinks, memberships };
});

console.log(
  `Provisioned ${semesters.length} development semester courses from official curriculum; added ${result.subjectLinks} subject links and ${result.memberships} active student/faculty memberships. No learning content, scores or progress created.`,
);
await db.$disconnect();
