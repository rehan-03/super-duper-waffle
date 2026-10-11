-- CreateEnum
CREATE TYPE "RevisionStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateEnum
CREATE TYPE "AttemptStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "Language" AS ENUM ('c', 'cpp', 'java', 'python');

-- CreateEnum
CREATE TYPE "SubmissionMode" AS ENUM ('CUSTOM', 'SAMPLES', 'SUBMIT');

-- CreateEnum
CREATE TYPE "ExecutionStatus" AS ENUM ('QUEUED', 'RUNNING', 'FINISHED', 'EXECUTION_FAILED');

-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "publishedRevisionId" UUID;

-- CreateTable
CREATE TABLE "CourseRevision" (
    "id" UUID NOT NULL,
    "courseId" UUID NOT NULL,
    "number" INTEGER NOT NULL,
    "status" "RevisionStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CourseRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseTopic" (
    "id" UUID NOT NULL,
    "revisionId" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "unitLabel" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "lesson" TEXT NOT NULL,
    "objectives" TEXT[],
    "prerequisiteKeys" TEXT[],
    "reviewed" BOOLEAN NOT NULL DEFAULT false,
    "sourceSubjectId" UUID NOT NULL,
    "sourceUnitId" UUID,
    "sourcePages" INTEGER[],

    CONSTRAINT "CourseTopic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" UUID NOT NULL,
    "familyId" UUID NOT NULL,
    "revisionNumber" INTEGER NOT NULL DEFAULT 1,
    "topicId" UUID NOT NULL,
    "objective" TEXT NOT NULL,
    "difficulty" "Difficulty" NOT NULL,
    "prompt" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "correctOption" INTEGER NOT NULL,
    "explanation" TEXT NOT NULL,
    "reviewed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Problem" (
    "id" UUID NOT NULL,
    "familyId" UUID NOT NULL,
    "revisionNumber" INTEGER NOT NULL DEFAULT 1,
    "topicId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "statement" TEXT NOT NULL,
    "starterCodes" JSONB NOT NULL,
    "reviewed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Problem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestCase" (
    "id" UUID NOT NULL,
    "problemId" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "input" TEXT NOT NULL,
    "expectedOutput" TEXT NOT NULL,
    "hidden" BOOLEAN NOT NULL,

    CONSTRAINT "TestCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonAcknowledgment" (
    "id" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "topicId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LessonAcknowledgment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizAttempt" (
    "id" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "topicId" UUID NOT NULL,
    "status" "AttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "score" DOUBLE PRECISION,
    "rulesVersion" TEXT NOT NULL DEFAULT 'v1',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),

    CONSTRAINT "QuizAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizItem" (
    "id" UUID NOT NULL,
    "attemptId" UUID NOT NULL,
    "questionId" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "selectedOption" INTEGER,
    "isCorrect" BOOLEAN,
    "version" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "QuizItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodeDraft" (
    "id" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "courseId" UUID NOT NULL,
    "problemId" UUID NOT NULL,
    "language" "Language" NOT NULL,
    "source" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CodeDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Submission" (
    "id" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "courseId" UUID NOT NULL,
    "courseRevisionId" UUID NOT NULL,
    "problemId" UUID NOT NULL,
    "language" "Language" NOT NULL,
    "mode" "SubmissionMode" NOT NULL,
    "source" TEXT NOT NULL,
    "customInput" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "status" "ExecutionStatus" NOT NULL DEFAULT 'QUEUED',
    "verdict" TEXT,
    "passedCount" INTEGER NOT NULL DEFAULT 0,
    "totalCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubmissionCase" (
    "id" UUID NOT NULL,
    "submissionId" UUID NOT NULL,
    "testCaseId" UUID,
    "position" INTEGER NOT NULL,
    "judgeToken" TEXT,
    "verdict" TEXT,
    "output" TEXT,
    "diagnostics" TEXT,
    "time" TEXT,
    "memory" INTEGER,

    CONSTRAINT "SubmissionCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExecutionJob" (
    "id" UUID NOT NULL,
    "submissionId" UUID NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'QUEUED',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "leaseUntil" TIMESTAMP(3),
    "deadlineAt" TIMESTAMP(3) NOT NULL,
    "lastError" TEXT,
    "owner" TEXT,

    CONSTRAINT "ExecutionJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceHeartbeat" (
    "name" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "healthy" BOOLEAN NOT NULL,
    "details" JSONB NOT NULL,

    CONSTRAINT "ServiceHeartbeat_pkey" PRIMARY KEY ("name")
);

-- CreateIndex
CREATE UNIQUE INDEX "CourseRevision_courseId_number_key" ON "CourseRevision"("courseId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "CourseTopic_revisionId_key_key" ON "CourseTopic"("revisionId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "CourseTopic_revisionId_position_key" ON "CourseTopic"("revisionId", "position");

-- CreateIndex
CREATE INDEX "Question_topicId_difficulty_idx" ON "Question"("topicId", "difficulty");

-- CreateIndex
CREATE UNIQUE INDEX "Question_familyId_revisionNumber_key" ON "Question"("familyId", "revisionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Problem_familyId_revisionNumber_key" ON "Problem"("familyId", "revisionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "TestCase_problemId_position_key" ON "TestCase"("problemId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "LessonAcknowledgment_studentId_topicId_key" ON "LessonAcknowledgment"("studentId", "topicId");

-- CreateIndex
CREATE INDEX "QuizAttempt_studentId_topicId_submittedAt_idx" ON "QuizAttempt"("studentId", "topicId", "submittedAt");

-- CreateIndex
CREATE UNIQUE INDEX "QuizItem_attemptId_position_key" ON "QuizItem"("attemptId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "QuizItem_attemptId_questionId_key" ON "QuizItem"("attemptId", "questionId");

-- CreateIndex
CREATE UNIQUE INDEX "CodeDraft_studentId_courseId_problemId_language_key" ON "CodeDraft"("studentId", "courseId", "problemId", "language");

-- CreateIndex
CREATE INDEX "Submission_studentId_createdAt_idx" ON "Submission"("studentId", "createdAt");

-- CreateIndex
CREATE INDEX "Submission_status_createdAt_idx" ON "Submission"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Submission_studentId_idempotencyKey_key" ON "Submission"("studentId", "idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "SubmissionCase_submissionId_position_key" ON "SubmissionCase"("submissionId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "ExecutionJob_submissionId_key" ON "ExecutionJob"("submissionId");

-- CreateIndex
CREATE INDEX "ExecutionJob_state_leaseUntil_idx" ON "ExecutionJob"("state", "leaseUntil");

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_publishedRevisionId_fkey" FOREIGN KEY ("publishedRevisionId") REFERENCES "CourseRevision"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseRevision" ADD CONSTRAINT "CourseRevision_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseTopic" ADD CONSTRAINT "CourseTopic_revisionId_fkey" FOREIGN KEY ("revisionId") REFERENCES "CourseRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseTopic" ADD CONSTRAINT "CourseTopic_sourceSubjectId_fkey" FOREIGN KEY ("sourceSubjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseTopic" ADD CONSTRAINT "CourseTopic_sourceUnitId_fkey" FOREIGN KEY ("sourceUnitId") REFERENCES "CurriculumUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "CourseTopic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Problem" ADD CONSTRAINT "Problem_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "CourseTopic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestCase" ADD CONSTRAINT "TestCase_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonAcknowledgment" ADD CONSTRAINT "LessonAcknowledgment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonAcknowledgment" ADD CONSTRAINT "LessonAcknowledgment_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "CourseTopic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizAttempt" ADD CONSTRAINT "QuizAttempt_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizAttempt" ADD CONSTRAINT "QuizAttempt_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "CourseTopic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizItem" ADD CONSTRAINT "QuizItem_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "QuizAttempt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizItem" ADD CONSTRAINT "QuizItem_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodeDraft" ADD CONSTRAINT "CodeDraft_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodeDraft" ADD CONSTRAINT "CodeDraft_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CodeDraft" ADD CONSTRAINT "CodeDraft_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_courseRevisionId_fkey" FOREIGN KEY ("courseRevisionId") REFERENCES "CourseRevision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmissionCase" ADD CONSTRAINT "SubmissionCase_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmissionCase" ADD CONSTRAINT "SubmissionCase_testCaseId_fkey" FOREIGN KEY ("testCaseId") REFERENCES "TestCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecutionJob" ADD CONSTRAINT "ExecutionJob_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- Database protections complement the API's revision and ownership checks.
CREATE UNIQUE INDEX "QuizAttempt_one_unfinished" ON "QuizAttempt"("studentId","topicId") WHERE status='IN_PROGRESS';
ALTER TABLE "AcademicYear" ADD CONSTRAINT "AcademicYear_number" CHECK(number BETWEEN 1 AND 4);
ALTER TABLE "Semester" ADD CONSTRAINT "Semester_number" CHECK(number BETWEEN 1 AND 8);
ALTER TABLE "SourcePage" ADD CONSTRAINT "SourcePage_number" CHECK(number>0);
ALTER TABLE "Subject" ADD CONSTRAINT "Subject_pages" CHECK("startPage">0 AND "endPage">="startPage");
ALTER TABLE "CurriculumUnit" ADD CONSTRAINT "CurriculumUnit_number" CHECK(number>0);
ALTER TABLE "CurriculumTopic" ADD CONSTRAINT "CurriculumTopic_position" CHECK(position>0);
ALTER TABLE "CourseTopic" ADD CONSTRAINT "CourseTopic_position" CHECK(position>0);
ALTER TABLE "Question" ADD CONSTRAINT "Question_option" CHECK("correctOption">=0 AND "correctOption"<jsonb_array_length(options));
ALTER TABLE "QuizAttempt" ADD CONSTRAINT "QuizAttempt_score" CHECK(score IS NULL OR score BETWEEN 0 AND 100);
ALTER TABLE "CodeDraft" ADD CONSTRAINT "CodeDraft_size" CHECK(octet_length(source)<=65536);
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_size" CHECK(octet_length(source)<=65536 AND ("customInput" IS NULL OR octet_length("customInput")<=16384));
ALTER TABLE "TestCase" ADD CONSTRAINT "TestCase_size" CHECK(octet_length(input)<=16384 AND octet_length("expectedOutput")<=65536);

CREATE FUNCTION guard_published_revision() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status='PUBLISHED' THEN RAISE EXCEPTION 'Published revision is immutable'; END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
END $$;
CREATE TRIGGER "CourseRevision_immutable" BEFORE UPDATE OR DELETE ON "CourseRevision" FOR EACH ROW EXECUTE FUNCTION guard_published_revision();
CREATE FUNCTION guard_published_content() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE subject_id uuid; revision_status text;
BEGIN
  IF TG_TABLE_NAME='CourseTopic' THEN
    IF TG_OP='INSERT' THEN subject_id=NEW."revisionId"; ELSE subject_id=OLD."revisionId"; END IF;
    SELECT status INTO revision_status FROM "CourseRevision" WHERE id=subject_id;
  ELSE
    IF TG_TABLE_NAME='TestCase' THEN
      IF TG_OP='INSERT' THEN subject_id=NEW."problemId"; ELSE subject_id=OLD."problemId"; END IF;
      SELECT t."revisionId" INTO subject_id FROM "Problem" p JOIN "CourseTopic" t ON t.id=p."topicId" WHERE p.id=subject_id;
    ELSE
      IF TG_OP='INSERT' THEN subject_id=NEW."topicId"; ELSE subject_id=OLD."topicId"; END IF;
      SELECT "revisionId" INTO subject_id FROM "CourseTopic" WHERE id=subject_id;
    END IF;
    SELECT status INTO revision_status FROM "CourseRevision" WHERE id=subject_id;
  END IF;
  IF revision_status='PUBLISHED' THEN RAISE EXCEPTION 'Published content is immutable'; END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
END $$;
CREATE TRIGGER "CourseTopic_immutable" BEFORE INSERT OR UPDATE OR DELETE ON "CourseTopic" FOR EACH ROW EXECUTE FUNCTION guard_published_content();
CREATE TRIGGER "Question_immutable" BEFORE INSERT OR UPDATE OR DELETE ON "Question" FOR EACH ROW EXECUTE FUNCTION guard_published_content();
CREATE TRIGGER "Problem_immutable" BEFORE INSERT OR UPDATE OR DELETE ON "Problem" FOR EACH ROW EXECUTE FUNCTION guard_published_content();
CREATE TRIGGER "TestCase_immutable" BEFORE INSERT OR UPDATE OR DELETE ON "TestCase" FOR EACH ROW EXECUTE FUNCTION guard_published_content();
