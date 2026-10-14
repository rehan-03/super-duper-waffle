import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import dotenv from "dotenv";
import pg from "pg";
dotenv.config({ quiet: true });
const url = new URL(process.env.DATABASE_URL ?? "");
if (
  url.hostname !== "127.0.0.1" ||
  url.port !== "55432" ||
  url.pathname !== "/algolearn"
)
  throw new Error(
    "Snapshot is restricted to the dedicated development database.",
  );
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
const names = [
  "User",
  "CourseMembership",
  "LessonAcknowledgment",
  "QuizAttempt",
  "QuizItem",
  "CodeDraft",
  "Submission",
  "SubmissionCase",
];
const snapshot = {};
for (const name of names) {
  const result = await client.query(
    `SELECT row_to_json(t) AS row FROM "${name}" t ORDER BY id`,
  );
  snapshot[name] = {
    count: result.rowCount,
    sha256: createHash("sha256")
      .update(JSON.stringify(result.rows))
      .digest("hex"),
  };
}
const published = await client.query(
  'SELECT t.id,t.key,t.title,t.lesson,t.objectives,t."prerequisiteKeys",t."sourceSubjectId",t."sourceUnitId",t."sourcePages",t.reviewed,t.position,t."revisionId" FROM "CourseTopic" t JOIN "CourseRevision" r ON r.id=t."revisionId" WHERE r.status=\'PUBLISHED\' ORDER BY t.id',
);
snapshot.PublishedTopics = {
  count: published.rowCount,
  sha256: createHash("sha256")
    .update(JSON.stringify(published.rows))
    .digest("hex"),
};
const output = process.argv[2];
if (!["before", "after"].includes(output))
  throw new Error("Use before or after as the snapshot label.");
await writeFile(
  `.local/implementation-baseline/migration-${output}.json`,
  JSON.stringify(snapshot, null, 2),
);
console.log(
  JSON.stringify(
    Object.fromEntries(
      Object.entries(snapshot).map(([name, value]) => [name, value.count]),
    ),
  ),
);
await client.end();
