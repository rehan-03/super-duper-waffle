import { db } from "./db.js";
import { ApiError } from "./http.js";
import { learningDrafts } from "./draft-library.js";
export async function importLearningDrafts(
  revisionId: string,
  keys: string[],
  actorId: string | null,
) {
  const revision = await db.courseRevision.findUniqueOrThrow({
    where: { id: revisionId },
  });
  const selected = [...new Set(keys)].map((key) =>
    learningDrafts.find((d) => d.key === key),
  );
  if (selected.some((d) => !d))
    throw new ApiError(
      422,
      "DRAFT_INVALID",
      "Select existing authored draft keys.",
    );
  const result = await db.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${revision.courseId}))`;
      const current = await tx.courseRevision.findUniqueOrThrow({
        where: { id: revision.id },
      });
      if (current.status !== "DRAFT")
        throw new ApiError(
          409,
          "IMMUTABLE",
          "Create a draft before importing.",
        );
      const links = await tx.courseSubject.findMany({
        where: { courseId: revision.courseId },
        include: {
          subject: { include: { units: { include: { topics: true } } } },
        },
      });
      let position =
        (
          await tx.courseTopic.aggregate({
            where: { revisionId: revision.id },
            _max: { position: true },
          })
        )._max.position ?? 0;
      if (position + selected.length > 2000)
        throw new ApiError(
          422,
          "TOPIC_LIMIT",
          "A revision supports at most 2000 topics.",
        );
      let imported = 0,
        skipped = 0;
      for (const draft of selected) {
        const d = draft!;
        const subject = links.find(
          (l) => l.subject.code === d.sourceCode,
        )?.subject;
        if (!subject)
          throw new ApiError(
            422,
            "SOURCE_INVALID",
            "Draft source subjects must be explicitly assigned to this course.",
          );
        if (
          await tx.courseTopic.findUnique({
            where: { revisionId_key: { revisionId: revision.id, key: d.key } },
          })
        ) {
          skipped++;
          continue;
        }
        const unit = subject.units.find((u) => u.number === d.sourceUnit),
          sourceTopic = unit?.topics.find(
            (t) => t.position === d.sourcePosition,
          );
        await tx.courseTopic.create({
          data: {
            revisionId: revision.id,
            key: d.key,
            title: d.title,
            unitLabel: d.unitLabel,
            position: ++position,
            lesson: d.lesson,
            objectives: d.objectives,
            prerequisiteKeys: [],
            visualizerKey: d.visualizerKey,
            requiredActivities: d.requiredActivities,
            blockedActivities: d.blockedActivities,
            sourceSubjectId: subject.id,
            sourceUnitId: unit?.id ?? null,
            sourcePages: d.sourcePages,
            sourceTopicIds: sourceTopic ? [sourceTopic.id] : [],
            authoringStatus: d.authoringStatus,
            coverageKeys: d.coverageKeys,
            reviewed: false,
            questions: {
              create: d.questions.map((q) => ({
                ...q,
                reviewed: false,
                revisionNumber: revision.number,
              })),
            },
            problems: {
              create: d.problems.map((p) => ({
                title: p.title,
                statement: p.statement,
                starterCodes: p.starterCodes,
                reviewed: false,
                revisionNumber: revision.number,
                tests: {
                  create: p.tests.map((t, i) => ({ ...t, position: i + 1 })),
                },
              })),
            },
          },
        });
        imported++;
      }
      await tx.auditEvent.create({
        data: {
          actorId: actorId,
          action: "DRAFT_CONTENT_IMPORTED",
          entityType: "CourseRevision",
          entityId: revision.id,
          metadata: { imported, skipped, keys: keys },
        },
      });
      return { imported, skipped };
    },
    { timeout: 60000 },
  );
  return result;
}
