ALTER TABLE "CourseTopic" ADD COLUMN "authoringStatus" text NOT NULL DEFAULT 'COMPLETE_DRAFT', ADD COLUMN "coverageKeys" text[] NOT NULL DEFAULT ARRAY[]::text[];
ALTER TABLE "CourseTopic" ADD CONSTRAINT "CourseTopic_authoring_status" CHECK("authoringStatus" IN ('COMPLETE_DRAFT','INCOMPLETE','SOURCE_BLOCKED'));
ALTER TABLE "CourseTopic" ADD CONSTRAINT "CourseTopic_reviewer_fk" FOREIGN KEY ("reviewerId") REFERENCES "User"(id) ON DELETE RESTRICT;
ALTER TABLE "Question" ADD CONSTRAINT "Question_reviewer_fk" FOREIGN KEY ("reviewerId") REFERENCES "User"(id) ON DELETE RESTRICT;
ALTER TABLE "Problem" ADD CONSTRAINT "Problem_reviewer_fk" FOREIGN KEY ("reviewerId") REFERENCES "User"(id) ON DELETE RESTRICT;
