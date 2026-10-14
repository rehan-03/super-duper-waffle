import { algorithmKeys } from "@algolearn/shared";
import { z } from "zod";

export const activities = ["LESSON", "QUIZ", "CODING", "PRACTICAL"] as const;
export const blockedActivitySchema = z
  .object({
    activity: z.enum(activities),
    reason: z.string().trim().min(10).max(1000),
  })
  .strict();
export type BlockedActivity = z.infer<typeof blockedActivitySchema>;
export function blocks(value: unknown): BlockedActivity[] {
  return z.array(blockedActivitySchema).parse(value);
}
export type Reviewable = {
  reviewed: boolean;
  reviewerId?: string | null;
  reviewedAt?: Date | null;
};
export function hasReview(value: Reviewable) {
  return value.reviewed && !!value.reviewerId && !!value.reviewedAt;
}
export type ValidationTopic = Reviewable & {
  key: string;
  title: string;
  lesson: string;
  objectives: string[];
  prerequisiteKeys: string[];
  visualizerKey: string | null;
  requiredActivities: string[];
  blockedActivities: unknown;
  authoringStatus?: string;
  questions: (Reviewable & { difficulty: string })[];
  problems: (Reviewable & {
    tests: { hidden: boolean }[];
    starterCodes: unknown;
  })[];
};
export function validateContent(topics: ValidationTopic[]) {
  const errors: string[] = [];
  if (!topics.length) errors.push("Add at least one learning topic.");
  const byKey = new Map(topics.map((t) => [t.key, t]));
  const visiting = new Set<string>(),
    visited = new Set<string>();
  const visit = (key: string) => {
    if (visiting.has(key)) {
      errors.push("Prerequisites contain a cycle.");
      return;
    }
    if (visited.has(key)) return;
    const t = byKey.get(key);
    if (!t) {
      errors.push(`Missing prerequisite: ${key}.`);
      return;
    }
    visiting.add(key);
    t.prerequisiteKeys.forEach(visit);
    visiting.delete(key);
    visited.add(key);
  };
  for (const t of topics) {
    visit(t.key);
    if (!hasReview(t))
      errors.push(`${t.title}: review the lesson and activity requirements.`);
    if (t.authoringStatus && t.authoringStatus !== "COMPLETE_DRAFT")
      errors.push(
        `${t.title}: topic-specific authoring is ${t.authoringStatus.toLowerCase()}.`,
      );
    if (t.lesson.trim().length < 30 || !t.objectives.length)
      errors.push(`${t.title}: complete the lesson and objectives.`);
    if (
      t.visualizerKey &&
      !algorithmKeys.includes(t.visualizerKey as (typeof algorithmKeys)[number])
    )
      errors.push(`${t.title}: unknown visualization.`);
    const blocked = blocks(t.blockedActivities);
    for (const b of blocked)
      if (!t.requiredActivities.includes(b.activity))
        errors.push(`${t.title}: blocked activity must be required.`);
    if (
      t.requiredActivities.includes("PRACTICAL") &&
      !blocked.some((b) => b.activity === "PRACTICAL")
    )
      errors.push(
        `${t.title}: external practical requires an explicit infrastructure blocker.`,
      );
    if (t.requiredActivities.includes("QUIZ")) {
      for (const [difficulty, count] of [
        ["EASY", 6],
        ["MEDIUM", 7],
        ["HARD", 7],
      ] as const)
        if (
          t.questions.filter((q) => hasReview(q) && q.difficulty === difficulty)
            .length < count
        )
          errors.push(
            `${t.title}: requires ${count} reviewed ${difficulty.toLowerCase()} questions.`,
          );
    }
    if (
      t.requiredActivities.includes("CODING") &&
      t.problems.filter(
        (p) =>
          hasReview(p) &&
          p.tests.length === 8 &&
          p.tests.filter((tc) => !tc.hidden).length === 3 &&
          ["c", "cpp", "java", "python"].every(
            (l) =>
              typeof (p.starterCodes as Record<string, unknown>)[l] ===
                "string" &&
              String((p.starterCodes as Record<string, unknown>)[l]).trim()
                .length > 0,
          ),
      ).length < 2
    )
      errors.push(
        `${t.title}: requires two reviewed problems with four starters and 3 sample/5 hidden tests.`,
      );
  }
  return [...new Set(errors)];
}
