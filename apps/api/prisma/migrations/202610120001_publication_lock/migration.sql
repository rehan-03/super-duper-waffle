CREATE OR REPLACE FUNCTION guard_published_content() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE subject_id uuid; revision_status text;
BEGIN
  IF TG_OP='UPDATE' THEN
    IF TG_TABLE_NAME='CourseTopic' THEN
      IF OLD."revisionId" IS DISTINCT FROM NEW."revisionId" THEN RAISE EXCEPTION 'Content cannot be moved across revisions'; END IF;
    ELSIF TG_TABLE_NAME='TestCase' THEN
      IF OLD."problemId" IS DISTINCT FROM NEW."problemId" THEN RAISE EXCEPTION 'Test case parent is immutable'; END IF;
    ELSE
      IF OLD."topicId" IS DISTINCT FROM NEW."topicId" THEN RAISE EXCEPTION 'Content topic is immutable'; END IF;
    END IF;
  END IF;
  IF TG_TABLE_NAME='CourseTopic' THEN
    IF TG_OP='INSERT' THEN subject_id=NEW."revisionId"; ELSE subject_id=OLD."revisionId"; END IF;
  ELSE
    IF TG_TABLE_NAME='TestCase' THEN
      IF TG_OP='INSERT' THEN subject_id=NEW."problemId"; ELSE subject_id=OLD."problemId"; END IF;
      SELECT t."revisionId" INTO subject_id FROM "Problem" p JOIN "CourseTopic" t ON t.id=p."topicId" WHERE p.id=subject_id;
    ELSE
      IF TG_OP='INSERT' THEN subject_id=NEW."topicId"; ELSE subject_id=OLD."topicId"; END IF;
      SELECT "revisionId" INTO subject_id FROM "CourseTopic" WHERE id=subject_id;
    END IF;
  END IF;
  SELECT status INTO revision_status FROM "CourseRevision" WHERE id=subject_id FOR SHARE;
  IF revision_status='PUBLISHED' THEN RAISE EXCEPTION 'Published content is immutable'; END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
END $$;
