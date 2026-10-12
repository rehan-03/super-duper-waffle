import { Router } from "express";
import { z } from "zod";
import { randomInt } from "node:crypto";
import { algorithms, algorithmKeys, quizMix } from "@algolearn/shared";
import { db } from "./db.js";
import { loadProgress, progressKey } from "./progress.js";
import {
  ApiError,
  parse,
  id,
  courseAccess,
  requireRole,
  publicUser,
  type AuthRequest,
} from "./http.js";
export const learningRouter = Router();
export async function topicAccess(
  req: AuthRequest,
  topicId: string,
  write = false,
  author = false,
) {
  const topic = await db.courseTopic.findUnique({
    where: { id: topicId },
    include: {
      revision: true,
      sourceSubject: {
        include: { source: true, academicYear: true, semester: true },
      },
    },
  });
  if (!topic) throw new ApiError(404, "NOT_FOUND", "Topic not found.");
  await courseAccess(req, topic.revision.courseId, write);
  if (
    req.auth!.user.role === "STUDENT" &&
    topic.revision.status !== "PUBLISHED"
  )
    throw new ApiError(404, "NOT_FOUND", "Topic not found.");
  if (
    author &&
    (req.auth!.user.role === "STUDENT" || topic.revision.status !== "DRAFT")
  )
    throw new ApiError(
      409,
      "IMMUTABLE",
      "Published content is read-only. Create a new draft revision.",
    );
  return topic;
}
export async function progress(studentId: string, topicId: string) {
  return (await loadProgress([studentId], [topicId])).get(
    progressKey(studentId, topicId),
  )!;
}
async function courseProgress(
  req: AuthRequest,
  courseId: string,
  studentId = req.auth!.user.id,
) {
  const course = await courseAccess(req, courseId);
  const topics = course.publishedRevisionId
    ? await db.courseTopic.findMany({
        where: { revisionId: course.publishedRevisionId },
        orderBy: { position: "asc" },
      })
    : [];
  const data = await loadProgress(
    [studentId],
    topics.map((t) => t.id),
  );
  return {
    course,
    topics: topics.map((t) => ({
      ...t,
      progress: data.get(progressKey(studentId, t.id))!,
    })),
  };
}
function recommendations(
  topics: Awaited<ReturnType<typeof courseProgress>>["topics"],
) {
  const results: {
    topicId: string;
    title: string;
    reason: string;
    action: string;
  }[] = [];
  const add = (t: (typeof topics)[number], reason: string, action: string) => {
    if (results.length < 3 && !results.some((x) => x.topicId === t.id))
      results.push({ topicId: t.id, title: t.title, reason, action });
  };
  for (const t of topics) {
    for (const key of t.prerequisiteKeys) {
      const p = topics.find((x) => x.key === key);
      if (
        p &&
        ["UNASSESSED", "INSUFFICIENT_EVIDENCE", "WEAK"].includes(
          p.progress.state,
        )
      )
        add(
          p,
          `${p.title} is a prerequisite for ${t.title}.`,
          p.progress.state === "WEAK"
            ? "Review lesson and visualization"
            : "Complete diagnostic practice",
        );
    }
  }
  const ordered = [...topics].sort(
    (a, b) =>
      (a.progress.score ?? -1) - (b.progress.score ?? -1) ||
      a.position - b.position,
  );
  for (const t of ordered)
    if (t.progress.state !== "MASTERED")
      add(
        t,
        t.progress.score === null
          ? "There is not enough quiz evidence yet."
          : `Your current quiz estimate is ${t.progress.score}%.`,
        t.progress.state === "WEAK"
          ? "Review and retry"
          : "Practice this topic",
      );
  for (const t of topics)
    if (
      t.prerequisiteKeys.every(
        (key) =>
          topics.find((x) => x.key === key)?.progress.state === "MASTERED",
      ) &&
      !t.progress.completed
    )
      add(
        t,
        "Your prerequisites have sufficient assessed mastery.",
        "Continue learning",
      );
  return results;
}
learningRouter.get(
  "/student/dashboard",
  requireRole("STUDENT"),
  async (req: AuthRequest, res) => {
    const memberships = await db.courseMembership.findMany({
      where: { userId: req.auth!.user.id, memberRole: "STUDENT" },
      orderBy: { createdAt: "desc" },
    });
    const courses = await Promise.all(
      memberships.map((m) => courseProgress(req, m.courseId)),
    );
    const all = courses.flatMap((c) => c.topics);
    res.json({
      courses,
      recommendations: courses
        .flatMap((c) =>
          recommendations(c.topics).map((r) => ({
            ...r,
            courseId: c.course.id,
          })),
        )
        .slice(0, 3),
      stats: {
        enrolledCourses: courses.length,
        publishedTopics: all.length,
        completedTopics: all.filter((t) => t.progress.completed).length,
        assessedTopics: all.filter((t) => t.progress.score !== null).length,
      },
    });
  },
);
learningRouter.get(
  "/courses/:id/progress",
  requireRole("STUDENT"),
  async (req: AuthRequest, res) =>
    res.json(await courseProgress(req, id(req.params.id))),
);
learningRouter.get(
  "/courses/:id/recommendations",
  requireRole("STUDENT"),
  async (req: AuthRequest, res) => {
    const p = await courseProgress(req, id(req.params.id));
    res.json({ recommendations: recommendations(p.topics) });
  },
);
learningRouter.get("/courses/:id/topics", async (req: AuthRequest, res) => {
  const course = await courseAccess(req, id(req.params.id));
  const topics = course.publishedRevisionId
    ? await db.courseTopic.findMany({
        where: { revisionId: course.publishedRevisionId },
        orderBy: { position: "asc" },
        select: {
          id: true,
          key: true,
          title: true,
          unitLabel: true,
          position: true,
          objectives: true,
          prerequisiteKeys: true,
        },
      })
    : [];
  const progressData =
    req.auth!.user.role === "STUDENT"
      ? await loadProgress(
          [req.auth!.user.id],
          topics.map((topic) => topic.id),
        )
      : null;
  res.json({
    topics: topics.map((topic) => ({
      ...topic,
      ...(progressData
        ? {
            progress: progressData.get(
              progressKey(req.auth!.user.id, topic.id),
            ),
          }
        : {}),
    })),
  });
});
learningRouter.get("/topics/:id", async (req: AuthRequest, res) => {
  const topic = await topicAccess(req, id(req.params.id));
  const problems = await db.problem.findMany({
    where: {
      topicId: topic.id,
      ...(req.auth!.user.role === "STUDENT" ? { reviewed: true } : {}),
    },
    select: { id: true, title: true },
  });
  res.json({
    topic,
    problems,
    progress:
      req.auth!.user.role === "STUDENT"
        ? await progress(req.auth!.user.id, topic.id)
        : null,
  });
});
learningRouter.post(
  "/topics/:id/acknowledgment",
  requireRole("STUDENT"),
  async (req: AuthRequest, res) => {
    const topic = await topicAccess(req, id(req.params.id), true);
    await db.lessonAcknowledgment.upsert({
      where: {
        studentId_topicId: { studentId: req.auth!.user.id, topicId: topic.id },
      },
      create: { studentId: req.auth!.user.id, topicId: topic.id },
      update: {},
    });
    res.json(await progress(req.auth!.user.id, topic.id));
  },
);
function shuffled<T>(items: T[]) {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}
learningRouter.post(
  "/topics/:id/quiz-attempts",
  requireRole("STUDENT"),
  async (req: AuthRequest, res) => {
    const topic = await topicAccess(req, id(req.params.id), true),
      studentId = req.auth!.user.id;
    const result = await db.$transaction(async (tx) => {
      // Serialize create/resume and grading per learner/topic.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${studentId + topic.id}))`;
      const existing = await tx.quizAttempt.findFirst({
        where: { studentId, topicId: topic.id, status: "IN_PROGRESS" },
      });
      if (existing) return existing;
      const previous = await tx.quizAttempt.findFirst({
        where: { studentId, topicId: topic.id, status: "COMPLETED" },
        orderBy: { submittedAt: "desc" },
        include: { items: { include: { question: true } } },
      });
      const families = new Set(
        previous?.items.map((i) => i.question.familyId) ?? [],
      );
      const questions = await tx.question.findMany({
        where: { topicId: topic.id, reviewed: true },
      });
      const state = (await progress(studentId, topic.id)).state,
        mix = quizMix(state),
        selected: string[] = [];
      for (const [index, difficulty] of ["EASY", "MEDIUM", "HARD"].entries()) {
        const matching = questions.filter((q) => q.difficulty === difficulty);
        const ordered = [
          ...shuffled(matching.filter((q) => !families.has(q.familyId))),
          ...shuffled(matching.filter((q) => families.has(q.familyId))),
        ];
        if (ordered.length < mix[index]!)
          throw new ApiError(
            409,
            "CONTENT_INCOMPLETE",
            "This topic does not have enough reviewed questions.",
          );
        selected.push(...ordered.slice(0, mix[index]).map((q) => q.id));
      }
      return tx.quizAttempt.create({
        data: {
          studentId,
          topicId: topic.id,
          items: {
            create: shuffled(selected).map((questionId, index) => ({
              questionId,
              position: index + 1,
            })),
          },
        },
      });
    });
    res.status(201).json({ attemptId: result.id });
  },
);
async function attemptAccess(
  req: AuthRequest,
  attemptId: string,
  write = false,
) {
  const a = await db.quizAttempt.findUnique({
    where: { id: attemptId },
    include: {
      topic: { include: { revision: true } },
      items: { orderBy: { position: "asc" }, include: { question: true } },
    },
  });
  if (!a) throw new ApiError(404, "NOT_FOUND", "Attempt not found.");
  await courseAccess(req, a.topic.revision.courseId, write);
  if (req.auth!.user.role === "STUDENT" && a.studentId !== req.auth!.user.id)
    throw new ApiError(404, "NOT_FOUND", "Attempt not found.");
  return a;
}
learningRouter.get("/quiz-attempts/:id", async (req: AuthRequest, res) => {
  const a = await attemptAccess(req, id(req.params.id));
  const learning =
    a.status === "COMPLETED"
      ? await courseProgress(req, a.topic.revision.courseId, a.studentId)
      : null;
  res.json({
    attempt: {
      id: a.id,
      topicId: a.topicId,
      title: a.topic.title,
      status: a.status,
      score: a.score,
      createdAt: a.createdAt,
      submittedAt: a.submittedAt,
      items: a.items.map((i) => ({
        id: i.id,
        position: i.position,
        selectedOption: i.selectedOption,
        version: i.version,
        question: { prompt: i.question.prompt, options: i.question.options },
        ...(a.status === "COMPLETED"
          ? {
              isCorrect: i.isCorrect,
              correctOption: i.question.correctOption,
              explanation: i.question.explanation,
            }
          : {}),
      })),
      ...(learning
        ? {
            progress: await progress(a.studentId, a.topicId),
            recommendations: recommendations(learning.topics),
          }
        : {}),
    },
  });
});
learningRouter.put(
  "/quiz-attempts/:id/answers/:itemId",
  requireRole("STUDENT"),
  async (req: AuthRequest, res) => {
    const a = await attemptAccess(req, id(req.params.id), true),
      b = parse(
        z
          .object({
            selectedOption: z.number().int().min(0).max(9).nullable(),
            version: z.number().int().min(0),
          })
          .strict(),
        req.body,
      );
    const item = a.items.find((i) => i.id === id(req.params.itemId));
    if (!item) throw new ApiError(404, "NOT_FOUND", "Question not found.");
    if (
      b.selectedOption !== null &&
      b.selectedOption >= (item.question.options as unknown[]).length
    )
      throw new ApiError(422, "ANSWER_INVALID", "Choose an available option.");
    const saved = await db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${a.studentId + a.topicId}))`;
      const current = await tx.quizAttempt.findUniqueOrThrow({
        where: { id: a.id },
      });
      if (current.status !== "IN_PROGRESS")
        throw new ApiError(
          409,
          "ALREADY_SUBMITTED",
          "This quiz is already submitted.",
        );
      const r = await tx.quizItem.updateMany({
        where: { id: item.id, version: b.version },
        data: { selectedOption: b.selectedOption, version: { increment: 1 } },
      });
      if (!r.count)
        throw new ApiError(
          409,
          "SAVE_CONFLICT",
          "This answer changed in another tab. Refresh the attempt.",
        );
      return tx.quizItem.findUniqueOrThrow({ where: { id: item.id } });
    });
    res.json({ version: saved.version });
  },
);
learningRouter.post(
  "/quiz-attempts/:id/submit",
  requireRole("STUDENT"),
  async (req: AuthRequest, res) => {
    const a = await attemptAccess(req, id(req.params.id), true);
    const graded = await db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${a.studentId + a.topicId}))`;
      const current = await tx.quizAttempt.findUniqueOrThrow({
        where: { id: a.id },
        include: { items: { include: { question: true } } },
      });
      if (current.status === "COMPLETED") return current;
      let correct = 0;
      for (const item of current.items) {
        const isCorrect = item.selectedOption === item.question.correctOption;
        if (isCorrect) correct++;
        await tx.quizItem.update({
          where: { id: item.id },
          data: { isCorrect },
        });
      }
      return tx.quizAttempt.update({
        where: { id: a.id },
        data: {
          status: "COMPLETED",
          score: (correct / current.items.length) * 100,
          submittedAt: new Date(),
        },
      });
    });
    res.json({
      attemptId: graded.id,
      score: graded.score,
      progress: await progress(a.studentId, a.topicId),
    });
  },
);
learningRouter.get(
  "/topics/:id/quiz-history",
  async (req: AuthRequest, res) => {
    const t = await topicAccess(req, id(req.params.id));
    res.json({
      attempts: await db.quizAttempt.findMany({
        where: { topicId: t.id, studentId: req.auth!.user.id },
        take: 100,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          status: true,
          score: true,
          submittedAt: true,
          createdAt: true,
        },
      }),
    });
  },
);

// Content authoring is course-scoped and separated from official curriculum records.
learningRouter.use("/faculty", requireRole("FACULTY", "ADMIN"));
async function draftAccess(req: AuthRequest, revisionId: string) {
  const r = await db.courseRevision.findUnique({ where: { id: revisionId } });
  if (!r) throw new ApiError(404, "NOT_FOUND", "Revision not found.");
  await courseAccess(req, r.courseId, true);
  if (r.status !== "DRAFT")
    throw new ApiError(
      409,
      "IMMUTABLE",
      "Create a draft to edit published content.",
    );
  return r;
}
learningRouter.get(
  "/faculty/courses/:id/revisions",
  async (req: AuthRequest, res) => {
    const course = await courseAccess(req, id(req.params.id));
    res.json({
      revisions: await db.courseRevision.findMany({
        where: { courseId: course.id },
        orderBy: { number: "desc" },
        include: {
          topics: {
            orderBy: { position: "asc" },
            include: {
              questions: true,
              problems: {
                include: { tests: { orderBy: { position: "asc" } } },
              },
            },
          },
        },
      }),
    });
  },
);
learningRouter.post(
  "/faculty/courses/:id/revisions",
  async (req: AuthRequest, res) => {
    const course = await courseAccess(req, id(req.params.id), true);
    const revision = await db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${course.id}))`;
      const pending = await tx.courseRevision.findFirst({
        where: { courseId: course.id, status: "DRAFT" },
      });
      if (pending) return pending;
      const latest = await tx.courseRevision.findFirst({
        where: { courseId: course.id },
        orderBy: { number: "desc" },
        include: {
          topics: {
            include: {
              questions: true,
              problems: { include: { tests: true } },
            },
          },
        },
      });
      const number = (latest?.number ?? 0) + 1;
      const copiedTopics = latest?.topics.map((t) => ({
        key: t.key,
        title: t.title,
        unitLabel: t.unitLabel,
        position: t.position,
        lesson: t.lesson,
        objectives: t.objectives,
        prerequisiteKeys: t.prerequisiteKeys,
        reviewed: false,
        sourceSubjectId: t.sourceSubjectId,
        sourceUnitId: t.sourceUnitId,
        sourcePages: t.sourcePages,
        questions: {
          create: t.questions.map((q) => ({
            familyId: q.familyId,
            revisionNumber: number,
            objective: q.objective,
            difficulty: q.difficulty,
            prompt: q.prompt,
            options: q.options!,
            correctOption: q.correctOption,
            explanation: q.explanation,
            reviewed: false,
          })),
        },
        problems: {
          create: t.problems.map((p) => ({
            familyId: p.familyId,
            revisionNumber: number,
            title: p.title,
            statement: p.statement,
            starterCodes: p.starterCodes!,
            reviewed: false,
            tests: {
              create: p.tests.map((tc) => ({
                position: tc.position,
                input: tc.input,
                expectedOutput: tc.expectedOutput,
                hidden: tc.hidden,
              })),
            },
          })),
        },
      }));
      return tx.courseRevision.create({
        data: {
          courseId: course.id,
          number,
          topics: copiedTopics ? { create: copiedTopics } : undefined,
        },
      });
    });
    res.status(201).json({ revision });
  },
);
const topicBody = z
  .object({
    key: z.enum(algorithmKeys as [string, ...string[]]),
    unitLabel: z.string().trim().min(1).max(100),
    lesson: z.string().trim().min(30).max(30000),
    objectives: z.array(z.string().trim().min(1).max(200)).min(1).max(10),
    prerequisiteKeys: z
      .array(z.enum(algorithmKeys as [string, ...string[]]))
      .max(5)
      .default([]),
    reviewed: z.boolean().default(false),
    sourceSubjectId: z.uuid(),
    sourceUnitId: z.uuid().nullable().default(null),
    sourcePages: z.array(z.number().int().positive()).min(1).max(10),
  })
  .strict();
async function validateTopicSource(
  courseId: string,
  b: {
    sourceSubjectId: string;
    sourceUnitId: string | null;
    sourcePages: number[];
  },
) {
  const link = await db.courseSubject.findUnique({
    where: { courseId_subjectId: { courseId, subjectId: b.sourceSubjectId } },
    include: { subject: true },
  });
  if (
    !link ||
    b.sourcePages.some(
      (page) => page < link.subject.startPage || page > link.subject.endPage,
    )
  )
    throw new ApiError(
      422,
      "SOURCE_INVALID",
      "Select an assigned official subject and pages inside its supplied range.",
    );
  if (
    b.sourceUnitId &&
    !(await db.curriculumUnit.findFirst({
      where: { id: b.sourceUnitId, subjectId: b.sourceSubjectId },
    }))
  )
    throw new ApiError(
      422,
      "SOURCE_INVALID",
      "The unit must belong to the selected subject.",
    );
}
learningRouter.post(
  "/faculty/revisions/:id/topics",
  async (req: AuthRequest, res) => {
    const r = await draftAccess(req, id(req.params.id)),
      b = parse(topicBody, req.body);
    await validateTopicSource(r.courseId, b);
    const position =
      (await db.courseTopic.count({ where: { revisionId: r.id } })) + 1;
    const t = await db.courseTopic.create({
      data: {
        revisionId: r.id,
        ...b,
        title: algorithms[b.key as keyof typeof algorithms].title,
        position,
      },
    });
    res.status(201).json({ topic: t });
  },
);
learningRouter.patch("/faculty/topics/:id", async (req: AuthRequest, res) => {
  const t = await topicAccess(req, id(req.params.id), true, true),
    b = parse(topicBody, req.body);
  await validateTopicSource(t.revision.courseId, b);
  if (b.key !== t.key)
    throw new ApiError(
      422,
      "KEY_IMMUTABLE",
      "The algorithm identity cannot change.",
    );
  res.json({
    topic: await db.courseTopic.update({ where: { id: t.id }, data: b }),
  });
});
learningRouter.put(
  "/faculty/revisions/:id/topic-order",
  async (req: AuthRequest, res) => {
    const r = await draftAccess(req, id(req.params.id)),
      b = parse(
        z
          .object({ topicIds: z.array(z.uuid()).max(algorithmKeys.length) })
          .strict(),
        req.body,
      );
    const topics = await db.courseTopic.findMany({
      where: { revisionId: r.id },
    });
    if (
      b.topicIds.length !== topics.length ||
      new Set(b.topicIds).size !== topics.length ||
      b.topicIds.some((x) => !topics.some((t) => t.id === x))
    )
      throw new ApiError(
        422,
        "ORDER_INVALID",
        "Include each topic exactly once.",
      );
    await db.$transaction(async (tx) => {
      for (const [i, tid] of b.topicIds.entries())
        await tx.courseTopic.update({
          where: { id: tid },
          data: { position: i + 100 },
        });
      for (const [i, tid] of b.topicIds.entries())
        await tx.courseTopic.update({
          where: { id: tid },
          data: { position: i + 1 },
        });
    });
    res.json({ message: "Topic order saved." });
  },
);
const questionBody = z
  .object({
    objective: z.string().trim().min(1).max(200),
    difficulty: z.enum(["EASY", "MEDIUM", "HARD"]),
    prompt: z.string().trim().min(10).max(5000),
    options: z.array(z.string().trim().min(1).max(1000)).min(2).max(6),
    correctOption: z.number().int().min(0).max(5),
    explanation: z.string().trim().min(10).max(5000),
    reviewed: z.boolean().default(false),
  })
  .strict()
  .refine((b) => b.correctOption < b.options.length, {
    message: "Correct option must exist.",
    path: ["correctOption"],
  });
learningRouter.post(
  "/faculty/topics/:id/questions",
  async (req: AuthRequest, res) => {
    const t = await topicAccess(req, id(req.params.id), true, true),
      b = parse(questionBody, req.body);
    res.status(201).json({
      question: await db.question.create({
        data: { topicId: t.id, revisionNumber: t.revision.number, ...b },
      }),
    });
  },
);
learningRouter.patch(
  "/faculty/questions/:id",
  async (req: AuthRequest, res) => {
    const q = await db.question.findUnique({
      where: { id: id(req.params.id) },
    });
    if (!q) throw new ApiError(404, "NOT_FOUND", "Question not found.");
    await topicAccess(req, q.topicId, true, true);
    res.json({
      question: await db.question.update({
        where: { id: q.id },
        data: parse(questionBody, req.body),
      }),
    });
  },
);
const byteText = (max: number) =>
  z
    .string()
    .refine(
      (value) => Buffer.byteLength(value, "utf8") <= max,
      `Maximum ${max} UTF-8 bytes.`,
    );
const problemBody = z
  .object({
    title: z.string().trim().min(3).max(150),
    statement: z.string().trim().min(30).max(20000),
    starterCodes: z
      .object({
        c: byteText(65536),
        cpp: byteText(65536),
        java: byteText(65536),
        python: byteText(65536),
      })
      .strict(),
    reviewed: z.boolean().default(false),
    tests: z
      .array(
        z
          .object({
            input: byteText(16384),
            expectedOutput: byteText(65536),
            hidden: z.boolean(),
          })
          .strict(),
      )
      .length(8),
  })
  .strict()
  .refine((b) => b.tests.filter((t) => !t.hidden).length === 3, {
    message: "Provide exactly three sample and five hidden tests.",
    path: ["tests"],
  });
learningRouter.post(
  "/faculty/topics/:id/problems",
  async (req: AuthRequest, res) => {
    const t = await topicAccess(req, id(req.params.id), true, true),
      b = parse(problemBody, req.body);
    res.status(201).json({
      problem: await db.problem.create({
        data: {
          topicId: t.id,
          revisionNumber: t.revision.number,
          title: b.title,
          statement: b.statement,
          starterCodes: b.starterCodes,
          reviewed: b.reviewed,
          tests: {
            create: b.tests.map((tc, i) => ({ ...tc, position: i + 1 })),
          },
        },
      }),
    });
  },
);
learningRouter.patch("/faculty/problems/:id", async (req: AuthRequest, res) => {
  const p = await db.problem.findUnique({ where: { id: id(req.params.id) } });
  if (!p) throw new ApiError(404, "NOT_FOUND", "Problem not found.");
  await topicAccess(req, p.topicId, true, true);
  const b = parse(problemBody, req.body);
  const problem = await db.$transaction(async (tx) => {
    await tx.testCase.deleteMany({ where: { problemId: p.id } });
    return tx.problem.update({
      where: { id: p.id },
      data: {
        title: b.title,
        statement: b.statement,
        starterCodes: b.starterCodes,
        reviewed: b.reviewed,
        tests: { create: b.tests.map((tc, i) => ({ ...tc, position: i + 1 })) },
      },
    });
  });
  res.json({ problem });
});
learningRouter.post(
  "/faculty/revisions/:id/publish",
  async (req: AuthRequest, res) => {
    const r = await draftAccess(req, id(req.params.id));
    const result = await db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${r.courseId}))`;
      await tx.$queryRaw`SELECT id FROM "CourseRevision" WHERE id=${r.id}::uuid FOR UPDATE`;
      const revision = await tx.courseRevision.findUniqueOrThrow({
        where: { id: r.id },
        include: {
          topics: {
            include: {
              questions: true,
              problems: { include: { tests: true } },
            },
          },
        },
      });
      const errors: string[] = [];
      if (revision.status !== "DRAFT")
        throw new ApiError(
          409,
          "IMMUTABLE",
          "This revision is already published.",
        );
      if (!revision.topics.length)
        errors.push("Add at least one learning topic.");
      const visiting = new Set<string>(),
        visited = new Set<string>();
      const visit = (key: string) => {
        if (visiting.has(key)) {
          errors.push("Prerequisites contain a cycle.");
          return;
        }
        if (visited.has(key)) return;
        const t = revision.topics.find((t) => t.key === key);
        if (!t) {
          errors.push(`Missing prerequisite: ${key}.`);
          return;
        }
        visiting.add(key);
        for (const k of t.prerequisiteKeys) visit(k);
        visiting.delete(key);
        visited.add(key);
      };
      for (const t of revision.topics) {
        visit(t.key);
        if (!t.reviewed) errors.push(`${t.title}: review the lesson.`);
        for (const [difficulty, count] of [
          ["EASY", 6],
          ["MEDIUM", 7],
          ["HARD", 7],
        ] as const)
          if (
            t.questions.filter((q) => q.reviewed && q.difficulty === difficulty)
              .length < count
          )
            errors.push(
              `${t.title}: requires ${count} reviewed ${difficulty.toLowerCase()} questions.`,
            );
        if (
          t.problems.filter(
            (p) =>
              p.reviewed &&
              p.tests.length === 8 &&
              p.tests.filter((tc) => !tc.hidden).length === 3,
          ).length < 2
        )
          errors.push(
            `${t.title}: requires two reviewed problems with 3 sample/5 hidden tests.`,
          );
      }
      if (errors.length)
        throw new ApiError(422, "PUBLICATION_INVALID", errors.join(" "));
      const updated = await tx.courseRevision.update({
        where: { id: r.id },
        data: { status: "PUBLISHED", publishedAt: new Date() },
      });
      await tx.course.update({
        where: { id: r.courseId },
        data: { publishedRevisionId: r.id },
      });
      await tx.auditEvent.create({
        data: {
          actorId: req.auth!.user.id,
          action: "COURSE_PUBLISHED",
          entityType: "CourseRevision",
          entityId: r.id,
          metadata: { number: r.number },
        },
      });
      return updated;
    });
    res.json({ revision: result });
  },
);
async function facultyCourseData(
  req: AuthRequest,
  courseId: string,
  page?: number,
) {
  const course = await courseAccess(req, courseId);
  const where = { courseId: course.id, memberRole: "STUDENT" as const };
  const [members, total, topics] = await Promise.all([
    db.courseMembership.findMany({
      where,
      ...(page ? { skip: (page - 1) * 100, take: 100 } : {}),
      orderBy: { createdAt: "asc" },
      include: { user: true },
    }),
    db.courseMembership.count({ where }),
    course.publishedRevisionId
      ? db.courseTopic.findMany({
          where: { revisionId: course.publishedRevisionId },
          orderBy: { position: "asc" },
        })
      : Promise.resolve([]),
  ]);
  const data = await loadProgress(
    members.map((m) => m.userId),
    topics.map((t) => t.id),
  );
  return {
    total,
    course,
    topics,
    students: members.map((m) => ({
      user: publicUser(m.user),
      course,
      topics: topics.map((t) => ({
        ...t,
        progress: data.get(progressKey(m.userId, t.id))!,
      })),
    })),
  };
}
learningRouter.get(
  "/faculty/courses/:id/students",
  async (req: AuthRequest, res) => {
    const page = parse(
      z.coerce.number().int().positive().default(1),
      req.query.page,
    );
    res.json({
      ...(await facultyCourseData(req, id(req.params.id), page)),
      page,
    });
  },
);
learningRouter.get(
  "/faculty/courses/:id/analytics",
  async (req: AuthRequest, res) => {
    const data = await facultyCourseData(req, id(req.params.id));
    const topicSummaries = data.topics.map((t) => ({
      topicId: t.id,
      title: t.title,
      completed: data.students.filter(
        (s) => s.topics.find((x) => x.id === t.id)?.progress.completed,
      ).length,
      weak: data.students.filter(
        (s) => s.topics.find((x) => x.id === t.id)?.progress.state === "WEAK",
      ).length,
      insufficientEvidence: data.students.filter(
        (s) => s.topics.find((x) => x.id === t.id)?.progress.score === null,
      ).length,
    }));
    const attention = data.students
      .map((s) => ({
        user: s.user,
        weakTopics: s.topics.filter((t) => t.progress.state === "WEAK").length,
        insufficientTopics: s.topics.filter((t) => t.progress.score === null)
          .length,
      }))
      .filter((s) => s.weakTopics > 0)
      .sort(
        (a, b) =>
          b.weakTopics - a.weakTopics || a.user.name.localeCompare(b.user.name),
      )
      .slice(0, 10);
    res.json({ enrolledStudents: data.total, topicSummaries, attention });
  },
);
learningRouter.get(
  "/faculty/courses/:id/students/:studentId",
  async (req: AuthRequest, res) => {
    const c = await courseAccess(req, id(req.params.id)),
      studentId = id(req.params.studentId);
    const member = await db.courseMembership.findUnique({
      where: { courseId_userId: { courseId: c.id, userId: studentId } },
      include: { user: true },
    });
    if (!member || member.memberRole !== "STUDENT")
      throw new ApiError(404, "NOT_FOUND", "Student not found in this course.");
    res.json({
      user: publicUser(member.user),
      ...(await courseProgress(req, c.id, studentId)),
      attempts: await db.quizAttempt.findMany({
        where: { studentId, topic: { revision: { courseId: c.id } } },
        take: 100,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          score: true,
          status: true,
          submittedAt: true,
          topic: { select: { title: true } },
        },
      }),
      submissions: await db.submission.findMany({
        where: { studentId, courseId: c.id },
        take: 100,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          status: true,
          verdict: true,
          language: true,
          createdAt: true,
        },
      }),
    });
  },
);
