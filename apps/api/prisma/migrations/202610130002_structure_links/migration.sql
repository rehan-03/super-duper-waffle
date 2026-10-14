-- Correct links to the original stack/queue registry keys without changing learning keys.
ALTER TABLE "CourseTopic" DISABLE TRIGGER "CourseTopic_immutable";
ALTER TABLE "CourseTopic" DISABLE TRIGGER "CourseTopic_review";
UPDATE "CourseTopic" SET "visualizerKey"=key WHERE key IN ('stack-operations','queue-operations') AND "visualizerKey" IS NULL;
ALTER TABLE "CourseTopic" ENABLE TRIGGER "CourseTopic_review";
ALTER TABLE "CourseTopic" ENABLE TRIGGER "CourseTopic_immutable";
