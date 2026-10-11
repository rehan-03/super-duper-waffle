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
