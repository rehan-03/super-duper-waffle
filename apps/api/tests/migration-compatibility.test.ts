import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { configureTestEnvironment } from "../../../scripts/test-environment.mjs";
const database = configureTestEnvironment();
test("additive migrations preserve populated published snapshots, memberships and learner evidence", async () => {
  const client = new pg.Client({ connectionString: database });
  await client.connect();
  const schema = `migration_compat_${randomUUID().replaceAll("-", "")}`;
  await client.query(`CREATE SCHEMA "${schema}"`);
  try {
    await client.query(`SET search_path TO "${schema}"`);
    for (const name of [
      "202610110001_foundation",
      "202610110002_learning",
      "202610110003_content_guard",
      "202610120001_publication_lock",
    ])
      await client.query(
        await readFile(
          new URL(
            `../prisma/migrations/${name}/migration.sql`,
            import.meta.url,
          ),
          "utf8",
        ),
      );
    const ids = Array.from({ length: 10 }, () => randomUUID()),
      [
        user,
        source,
        year,
        subject,
        course,
        revision,
        topic,
        question,
        attempt,
        problem,
      ] = ids;
    await client.query(
      "INSERT INTO \"User\" (id,email,name,role,status) VALUES ($1,'migration@fixture.example','Migration fixture','STUDENT','ACTIVE')",
      [user],
    );
    await client.query(
      "INSERT INTO \"CurriculumSource\" (id,filename,sha256,\"pageCount\") VALUES ($1,'fixture.pdf','fixture-only',1)",
      [source],
    );
    await client.query(
      "INSERT INTO \"AcademicYear\" (id,pattern,number,label) VALUES ($1,'fixture',1,'fixture')",
      [year],
    );
    await client.query(
      "INSERT INTO \"Subject\" (id,\"sourceId\",pattern,code,\"observedCode\",title,\"academicYearId\",pathway,\"startPage\",\"endPage\",issues) VALUES ($1,$2,'fixture','fixture','fixture','fixture',$3,'regular',1,1,'[]')",
      [subject, source, year],
    );
    await client.query(
      "INSERT INTO \"Course\" (id,code,title,term) VALUES ($1,'fixture','fixture','fixture')",
      [course],
    );
    await client.query(
      'INSERT INTO "CourseMembership" (id,"courseId","userId","memberRole") VALUES ($1,$2,$3,\'STUDENT\')',
      [randomUUID(), course, user],
    );
    await client.query(
      'INSERT INTO "CourseRevision" (id,"courseId",number) VALUES ($1,$2,1)',
      [revision, course],
    );
    await client.query(
      'INSERT INTO "CourseTopic" (id,"revisionId",key,title,"unitLabel",position,lesson,objectives,"prerequisiteKeys",reviewed,"sourceSubjectId","sourcePages") VALUES ($1,$2,\'linear-search\',\'fixture\',\'fixture\',1,\'Immutable original lesson\',ARRAY[\'fixture objective\'],ARRAY[]::text[],true,$3,ARRAY[1])',
      [topic, revision, subject],
    );
    await client.query(
      'INSERT INTO "Question" (id,"familyId","topicId",objective,difficulty,prompt,options,"correctOption",explanation,reviewed) VALUES ($1,$2,$3,\'fixture\',\'EASY\',\'fixture\',\'["yes","no"]\',0,\'fixture\',true)',
      [question, randomUUID(), topic],
    );
    await client.query(
      'INSERT INTO "Problem" (id,"familyId","topicId",title,statement,"starterCodes",reviewed) VALUES ($1,$2,$3,\'fixture\',\'fixture\',\'{}\',true)',
      [problem, randomUUID(), topic],
    );
    await client.query(
      'INSERT INTO "LessonAcknowledgment" (id,"studentId","topicId") VALUES ($1,$2,$3)',
      [randomUUID(), user, topic],
    );
    await client.query(
      'INSERT INTO "QuizAttempt" (id,"studentId","topicId",status,score,"submittedAt") VALUES ($1,$2,$3,\'COMPLETED\',100,NOW())',
      [attempt, user, topic],
    );
    await client.query(
      'INSERT INTO "QuizItem" (id,"attemptId","questionId",position,"selectedOption","isCorrect") VALUES ($1,$2,$3,1,0,true)',
      [randomUUID(), attempt, question],
    );
    await client.query(
      'INSERT INTO "CodeDraft" (id,"studentId","courseId","problemId",language,source,"updatedAt") VALUES ($1,$2,$3,$4,\'python\',\'print(0)\',NOW())',
      [randomUUID(), user, course, problem],
    );
    await client.query(
      'INSERT INTO "Submission" (id,"studentId","courseId","courseRevisionId","problemId",language,mode,source,"idempotencyKey",status,verdict,"passedCount","totalCount") VALUES ($1,$2,$3,$4,$5,\'python\',\'SUBMIT\',\'print(0)\',\'migration-fixture\',\'FINISHED\',\'ACCEPTED\',8,8)',
      [randomUUID(), user, course, revision, problem],
    );
    await client.query(
      'UPDATE "CourseRevision" SET status=\'PUBLISHED\',"publishedAt"=NOW() WHERE id=$1',
      [revision],
    );
    await client.query(
      'UPDATE "Course" SET "publishedRevisionId"=$1 WHERE id=$2',
      [revision, course],
    );
    const tables = [
      "User",
      "CourseMembership",
      "CourseRevision",
      "LessonAcknowledgment",
      "QuizAttempt",
      "QuizItem",
      "CodeDraft",
      "Submission",
    ];
    const before = [];
    for (const t of tables)
      before.push(
        await client.query(
          `SELECT row_to_json(t) AS record FROM "${t}" t ORDER BY id`,
        ),
      );
    for (const name of [
      "202610130001_syllabus_topics",
      "202610130002_structure_links",
      "202610140001_authoring_status",
    ])
      await client.query(
        await readFile(
          new URL(
            `../prisma/migrations/${name}/migration.sql`,
            import.meta.url,
          ),
          "utf8",
        ),
      );
    for (const [i, t] of tables.entries())
      assert.deepEqual(
        (
          await client.query(
            `SELECT row_to_json(t) AS record FROM "${t}" t ORDER BY id`,
          )
        ).rows,
        before[i]!.rows,
      );
    const migrated = (
      await client.query('SELECT * FROM "CourseTopic" WHERE id=$1', [topic])
    ).rows[0];
    assert.equal(migrated.key, "linear-search");
    assert.equal(migrated.lesson, "Immutable original lesson");
    assert.equal(migrated.visualizerKey, "linear-search");
    assert.equal(migrated.completionRule, "LEGACY_V1");
    assert.equal(migrated.reviewerId, null);
    assert.equal(migrated.reviewedAt, null);
    await assert.rejects(
      client.query("UPDATE \"CourseTopic\" SET lesson='tampered' WHERE id=$1", [
        topic,
      ]),
    );
  } finally {
    await client.query("SET search_path TO public");
    await client.query(`DROP SCHEMA "${schema}" CASCADE`);
    await client.end();
  }
});
