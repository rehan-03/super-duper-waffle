import { Router } from "express";
import { z } from "zod";
import { randomInt } from "node:crypto";
import { quizMix } from "@algolearn/shared";
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
import { blocks } from "./content-validation.js";
import { executionConfigured } from "./execution-config.js";
import { contentRouter } from "./content-router.js";
import { topicAccess } from "./topic-access.js";
export { topicAccess } from "./topic-access.js";
export const learningRouter = Router();
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
        p.requiredActivities.includes("QUIZ") &&
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
    if (
      t.requiredActivities.includes("QUIZ") &&
      !blocks(t.blockedActivities).some((b) => b.activity === "QUIZ") &&
      t.progress.state !== "MASTERED"
    )
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
          topics.find((x) => x.key === key)?.progress.state === "MASTERED" ||
          topics.find((x) => x.key === key)?.progress.completed === true,
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
  const page = parse(
    z.coerce.number().int().min(1).max(10000).default(1),
    req.query.page,
  );
  const total = course.publishedRevisionId
    ? await db.courseTopic.count({
        where: { revisionId: course.publishedRevisionId },
      })
    : 0;
  const topics = course.publishedRevisionId
    ? await db.courseTopic.findMany({
        where: { revisionId: course.publishedRevisionId },
        orderBy: { position: "asc" },
        skip: (page - 1) * 100,
        take: 100,
        select: {
          id: true,
          key: true,
          visualizerKey: true,
          requiredActivities: true,
          blockedActivities: true,
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
    page,
    pageSize: 100,
    total,
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
    availability: {
      quiz:
        topic.requiredActivities.includes("QUIZ") &&
        !blocks(topic.blockedActivities).some((b) => b.activity === "QUIZ"),
      coding:
        executionConfigured &&
        !blocks(topic.blockedActivities).some((b) => b.activity === "CODING"),
      blocked: [
        ...blocks(topic.blockedActivities),
        ...(!executionConfigured && topic.requiredActivities.includes("CODING")
          ? [
              {
                activity: "CODING",
                reason:
                  "An isolated execution provider has not been configured and verified. You can save drafts; coding completion requires a real accepted submission.",
              },
            ]
          : []),
      ],
    },
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
    if (
      !topic.requiredActivities.includes("QUIZ") ||
      blocks(topic.blockedActivities).some((b) => b.activity === "QUIZ")
    )
      throw new ApiError(
        409,
        "ACTIVITY_UNAVAILABLE",
        "Quiz practice is not available for this topic.",
      );
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

learningRouter.use(contentRouter);
learningRouter.use("/faculty", requireRole("FACULTY", "ADMIN"));
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
      insufficientEvidence: data.students.filter((s) => {
        const p = s.topics.find((x) => x.id === t.id)?.progress;
        return p?.score === null && p.state !== "NOT_APPLICABLE";
      }).length,
      requiredActivities: t.requiredActivities,
      blockedActivities: blocks(t.blockedActivities),
    }));
    const attention = data.students
      .map((s) => ({
        user: s.user,
        weakTopics: s.topics.filter((t) => t.progress.state === "WEAK").length,
        insufficientTopics: s.topics.filter(
          (t) =>
            t.progress.score === null && t.progress.state !== "NOT_APPLICABLE",
        ).length,
      }))
      .filter((s) => s.weakTopics > 0)
      .sort(
        (a, b) =>
          b.weakTopics - a.weakTopics || a.user.name.localeCompare(b.user.name),
      )
      .slice(0, 10);
    const providerFailures = await db.submission.count({
      where: {
        courseId: data.course.id,
        status: "EXECUTION_FAILED",
        ...(data.course.publishedRevisionId
          ? { courseRevisionId: data.course.publishedRevisionId }
          : {}),
      },
    });
    res.json({
      enrolledStudents: data.total,
      topicSummaries,
      attention,
      providerFailures,
    });
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
