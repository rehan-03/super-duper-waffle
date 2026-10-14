import { config } from "./config.js";
import { db } from "./db.js";
import { hashPassword } from "./security.js";

if (config.NODE_ENV === "production")
  throw new Error("Demo accounts are disabled in production.");

const password = "AlgoLearn-demo-2026";
const accounts = [
  {
    email: "student@demo.algolearn.local",
    name: "Demo Student",
    role: "STUDENT",
  },
  {
    email: "faculty@demo.algolearn.local",
    name: "Demo Faculty",
    role: "FACULTY",
  },
  {
    email: "admin@demo.algolearn.local",
    name: "Demo Administrator",
    role: "ADMIN",
  },
] as const;

const courses = await db.course.findMany({
  where: { code: { startsWith: "DEV-" }, status: "ACTIVE" },
  select: { id: true },
});
if (!courses.length)
  throw new Error(
    "No development course shells exist. Run db:seed:courses before db:seed:demo.",
  );

const passwordHash = await hashPassword(password);
const result = await db.$transaction(async (tx) => {
  const users = [];
  for (const account of accounts) {
    const user = await tx.user.upsert({
      where: { email: account.email },
      create: {
        ...account,
        status: "ACTIVE",
        passwordHash,
      },
      update: {
        name: account.name,
        role: account.role,
        status: "ACTIVE",
        passwordHash,
      },
    });
    await tx.session.deleteMany({ where: { userId: user.id } });
    await tx.authToken.deleteMany({ where: { userId: user.id } });
    users.push(user);
  }

  const learningUsers = users.filter((user) => user.role !== "ADMIN");
  const memberships = await tx.courseMembership.createMany({
    data: courses.flatMap((course) =>
      learningUsers.map((user) => ({
        courseId: course.id,
        userId: user.id,
        memberRole: user.role,
      })),
    ),
    skipDuplicates: true,
  });
  return memberships.count;
});

console.log(
  `Provisioned ${accounts.length} local demo accounts and added ${result} development-course memberships. No progress, scores or learning content created.`,
);
await db.$disconnect();
