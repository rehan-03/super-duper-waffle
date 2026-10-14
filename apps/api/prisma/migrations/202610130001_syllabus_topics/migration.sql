-- Additive upgrade. No topic identity, publication or learner evidence is replaced.
ALTER TABLE "CourseTopic"
  ADD COLUMN "reviewerId" uuid,
  ADD COLUMN "reviewedAt" timestamp(3),
  ADD COLUMN version integer NOT NULL DEFAULT 0,
  ADD COLUMN "visualizerKey" text,
  ADD COLUMN "requiredActivities" text[] NOT NULL DEFAULT ARRAY['LESSON','QUIZ','CODING'],
  ADD COLUMN "completionRule" text NOT NULL DEFAULT 'LEGACY_V1',
  ADD COLUMN "blockedActivities" jsonb NOT NULL DEFAULT '[]',
  ADD COLUMN "sourceTopicIds" text[] NOT NULL DEFAULT ARRAY[]::text[];
ALTER TABLE "Question" ADD COLUMN "reviewerId" uuid, ADD COLUMN "reviewedAt" timestamp(3), ADD COLUMN version integer NOT NULL DEFAULT 0;
ALTER TABLE "Problem" ADD COLUMN "reviewerId" uuid, ADD COLUMN "reviewedAt" timestamp(3), ADD COLUMN version integer NOT NULL DEFAULT 0;
-- Only derived compatibility metadata is backfilled. Never invent a historical reviewer.
ALTER TABLE "CourseTopic" DISABLE TRIGGER "CourseTopic_immutable";
UPDATE "CourseTopic" SET "visualizerKey"=key WHERE key IN ('linear-search','binary-search','bubble-sort','selection-sort','insertion-sort','merge-sort','array-traversal','linked-list-traversal','stack','queue','binary-search-tree','breadth-first-search','depth-first-search');
ALTER TABLE "CourseTopic" ENABLE TRIGGER "CourseTopic_immutable";
ALTER TABLE "CourseTopic" ALTER COLUMN "completionRule" SET DEFAULT 'ACTIVITIES_V1';
ALTER TABLE "CourseTopic" ADD CONSTRAINT "CourseTopic_activities" CHECK (cardinality("requiredActivities") BETWEEN 1 AND 4 AND "requiredActivities" <@ ARRAY['LESSON','QUIZ','CODING','PRACTICAL']::text[] AND 'LESSON'=ANY("requiredActivities"));
ALTER TABLE "CourseTopic" ADD CONSTRAINT "CourseTopic_blocks" CHECK (jsonb_typeof("blockedActivities")='array');
ALTER TABLE "CourseTopic" ADD CONSTRAINT "CourseTopic_completion_rule" CHECK ("completionRule" IN ('LEGACY_V1','ACTIVITIES_V1'));

-- Direct SQL edits must also invalidate review. Review-only updates do not increment content version.
CREATE FUNCTION invalidate_content_review() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (to_jsonb(OLD) - ARRAY['reviewed','reviewerId','reviewedAt','version','position']) IS DISTINCT FROM
     (to_jsonb(NEW) - ARRAY['reviewed','reviewerId','reviewedAt','version','position']) THEN
    NEW.reviewed=false; NEW."reviewerId"=NULL; NEW."reviewedAt"=NULL;
    NEW.version=OLD.version+1;
  END IF;
  IF NOT NEW.reviewed THEN NEW."reviewerId"=NULL; NEW."reviewedAt"=NULL; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "CourseTopic_review" BEFORE UPDATE ON "CourseTopic" FOR EACH ROW EXECUTE FUNCTION invalidate_content_review();
CREATE TRIGGER "Question_review" BEFORE UPDATE ON "Question" FOR EACH ROW EXECUTE FUNCTION invalidate_content_review();
CREATE TRIGGER "Problem_review" BEFORE UPDATE ON "Problem" FOR EACH ROW EXECUTE FUNCTION invalidate_content_review();
CREATE FUNCTION invalidate_test_review() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE parent uuid;
BEGIN
  IF TG_OP='INSERT' THEN parent=NEW."problemId"; ELSE parent=OLD."problemId"; END IF;
  UPDATE "Problem" SET reviewed=false,"reviewerId"=NULL,"reviewedAt"=NULL,version=version+1 WHERE id=parent;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
END $$;
CREATE TRIGGER "TestCase_review" AFTER INSERT OR UPDATE OR DELETE ON "TestCase" FOR EACH ROW EXECUTE FUNCTION invalidate_test_review();
