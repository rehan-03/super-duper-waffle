import { mastery } from "@algolearn/shared";
import { db } from "./db.js";
import { blocks, type BlockedActivity } from "./content-validation.js";

export type TopicProgress = ReturnType<typeof mastery> & {
  lessonAcknowledged: boolean;
  quizSubmitted: boolean;
  codingAccepted: boolean;
  completed: boolean;
  requiredActivities: string[];
  blockedActivities: BlockedActivity[];
};
export const progressKey = (studentId: string, topicId: string) =>
  `${studentId}:${topicId}`;
// Load a fixed number of queries for a course, rather than three per student/topic.
export async function loadProgress(studentIds: string[], topicIds: string[]) {
  const results = new Map<string, TopicProgress>();
  if (!studentIds.length || !topicIds.length) return results;
  const recent = await db.$queryRaw<{ id: string }[]>`
    SELECT id FROM (
      SELECT id,ROW_NUMBER() OVER(PARTITION BY "studentId","topicId" ORDER BY "submittedAt" DESC,id DESC) AS rank
      FROM "QuizAttempt" WHERE "studentId"=ANY(${studentIds}::uuid[]) AND "topicId"=ANY(${topicIds}::uuid[]) AND status='COMPLETED'
    ) ranked WHERE rank<=5`;
  const [attempts, acknowledgments, accepted, topics] = await Promise.all([
    db.quizAttempt.findMany({
      where: { id: { in: recent.map((a) => a.id) } },
      orderBy: [{ submittedAt: "desc" }, { id: "desc" }],
      include: {
        items: {
          orderBy: { position: "asc" },
          include: { question: { select: { familyId: true } } },
        },
      },
    }),
    db.lessonAcknowledgment.findMany({
      where: { studentId: { in: studentIds }, topicId: { in: topicIds } },
      select: { studentId: true, topicId: true },
    }),
    db.submission.findMany({
      where: {
        studentId: { in: studentIds },
        problem: { topicId: { in: topicIds } },
        mode: "SUBMIT",
        status: "FINISHED",
        verdict: "ACCEPTED",
      },
      distinct: ["studentId", "problemId"],
      select: { studentId: true, problem: { select: { topicId: true } } },
    }),
    db.courseTopic.findMany({
      where: { id: { in: topicIds } },
      select: {
        id: true,
        requiredActivities: true,
        blockedActivities: true,
        completionRule: true,
      },
    }),
  ]);
  const lessonKeys = new Set(
    acknowledgments.map((a) => progressKey(a.studentId, a.topicId)),
  );
  const codeKeys = new Set(
    accepted.map((s) => progressKey(s.studentId, s.problem.topicId)),
  );
  const grouped = new Map<string, typeof attempts>();
  for (const a of attempts) {
    const key = progressKey(a.studentId, a.topicId);
    const group = grouped.get(key) ?? [];
    group.push(a);
    grouped.set(key, group);
  }
  for (const studentId of studentIds)
    for (const topicId of topicIds) {
      const key = progressKey(studentId, topicId),
        history = grouped.get(key) ?? [];
      const estimate = mastery(
        history.map((a) => ({
          items: a.items.map((i) => ({
            familyId: i.question.familyId,
            selectedOption: i.selectedOption,
            isCorrect: i.isCorrect,
          })),
        })),
      );
      const lessonAcknowledged = lessonKeys.has(key),
        quizSubmitted = history.length > 0,
        codingAccepted = codeKeys.has(key);
      const topic = topics.find((t) => t.id === topicId)!;
      const requiredActivities =
        topic.completionRule === "LEGACY_V1"
          ? ["LESSON", "QUIZ", "CODING"]
          : topic.requiredActivities;
      const blockedActivities = blocks(topic.blockedActivities);
      const evidence: Record<string, boolean> = {
        LESSON: lessonAcknowledged,
        QUIZ: quizSubmitted,
        CODING: codingAccepted,
        PRACTICAL: false,
      };
      results.set(key, {
        ...estimate,
        ...(!requiredActivities.includes("QUIZ")
          ? { state: "NOT_APPLICABLE", score: null, evidenceCount: 0 }
          : {}),
        lessonAcknowledged,
        quizSubmitted,
        codingAccepted,
        requiredActivities,
        blockedActivities,
        completed: requiredActivities.every(
          (a) =>
            evidence[a] && !blockedActivities.some((b) => b.activity === a),
        ),
      });
    }
  return results;
}
