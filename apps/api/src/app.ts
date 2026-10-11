import express from "express";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { db } from "./db.js";
import { config } from "./config.js";
import { authRouter, invite } from "./auth.js";
import {
  passwordSchema,
  emailSchema,
  hashPassword,
  verifyPassword,
} from "./security.js";
import {
  ApiError,
  parse,
  id,
  publicUser,
  authenticate,
  requireAuth,
  requireRole,
  csrf,
  checkOrigin,
  courseAccess,
  type AuthRequest,
} from "./http.js";
import { learningRouter } from "./learning.js";
import { executionRouter } from "./execution.js";
import { recordRequest } from "./metrics.js";
export const app = express();
app.disable("x-powered-by");
if (config.TRUST_PROXY_HOPS) app.set("trust proxy", config.TRUST_PROXY_HOPS);
app.use(helmet());
// Reviewed problem authoring includes four starters and eight test cases.
// All individual fields retain stricter UTF-8 byte limits below this body cap.
app.use((_req, res, next) => {
  res.set("Cache-Control", "no-store");
  res.locals.requestId = randomUUID();
  next();
});
app.use((req, res, next) => {
  const started = performance.now();
  res.on("finish", () => {
    const elapsedMs = performance.now() - started;
    recordRequest(elapsedMs, res.statusCode);
    if (config.NODE_ENV !== "test")
      console.log(
        JSON.stringify({
          event: "request",
          requestId: res.locals.requestId,
          method: req.method,
          route: req.route?.path ?? "unmatched",
          status: res.statusCode,
          elapsedMs: Math.round(elapsedMs),
        }),
      );
  });
  next();
});
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());
app.get("/api/v1/health", async (_req, res) => {
  await db.$queryRaw`SELECT 1`;
  res.json({ status: "ok" });
});
app.use("/api/v1", checkOrigin, authenticate);
app.use("/api/v1/auth", authRouter);
app.use(
  "/api/v1",
  requireAuth,
  csrf,
  rateLimit({
    windowMs: 60000,
    limit: config.NODE_ENV === "test" ? 1000 : 240,
    keyGenerator: (req) => (req as AuthRequest).auth!.user.id,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
      code: "RATE_LIMITED",
      message: "Too many requests. Please wait a moment.",
    },
  }),
);
app.get("/api/v1/me", (req: AuthRequest, res) =>
  res.json({
    user: publicUser(req.auth!.user),
    csrfToken: req.auth!.session.csrfToken,
  }),
);
app.patch("/api/v1/me/password", async (req: AuthRequest, res) => {
  const b = parse(
    z
      .object({
        currentPassword: z.string().max(128),
        password: passwordSchema,
      })
      .strict(),
    req.body,
  );
  if (
    !req.auth!.user.passwordHash ||
    !(await verifyPassword(req.auth!.user.passwordHash, b.currentPassword))
  )
    throw new ApiError(
      422,
      "PASSWORD_INCORRECT",
      "Current password is incorrect.",
    );
  const passwordHash = await hashPassword(b.password);
  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: req.auth!.user.id },
      data: { passwordHash },
    });
    await tx.session.updateMany({
      where: { userId: req.auth!.user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await tx.authToken.updateMany({
      where: { userId: req.auth!.user.id, usedAt: null },
      data: { usedAt: new Date() },
    });
  });
  res.json({ message: "Password changed. Sign in again." });
});
const subjectInclude = {
  source: { select: { filename: true, sha256: true } },
  academicYear: true,
  semester: true,
  units: {
    orderBy: { number: "asc" as const },
    include: { topics: { orderBy: { position: "asc" as const } } },
  },
};
app.get("/api/v1/courses", async (req: AuthRequest, res) => {
  const courses = await db.course.findMany({
    where:
      req.auth!.user.role === "ADMIN"
        ? {}
        : {
            memberships: {
              some: {
                userId: req.auth!.user.id,
                memberRole: req.auth!.user.role,
              },
            },
          },
    include: {
      subjects: {
        include: {
          subject: { include: { academicYear: true, semester: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  res.json({ courses });
});
app.get("/api/v1/courses/:id/curriculum", async (req: AuthRequest, res) => {
  const course = await courseAccess(req, id(req.params.id));
  const links = await db.courseSubject.findMany({
    where: { courseId: course.id },
    include: { subject: { include: subjectInclude } },
  });
  res.json({ course, subjects: links.map((x) => x.subject) });
});
app.get(
  "/api/v1/curriculum",
  requireRole("FACULTY", "ADMIN"),
  async (req, res) => {
    const page = parse(
      z.coerce.number().int().min(1).default(1),
      req.query.page,
    );
    const year = req.query.year
      ? parse(z.coerce.number().int().min(1).max(4), req.query.year)
      : undefined;
    const semester = req.query.semester
      ? parse(z.coerce.number().int().min(1).max(8), req.query.semester)
      : undefined;
    const query =
      typeof req.query.q === "string" ? req.query.q.slice(0, 100) : "";
    const where = {
      ...(year ? { academicYear: { number: year } } : {}),
      ...(semester ? { semester: { number: semester } } : {}),
      ...(query
        ? {
            OR: [
              { title: { contains: query, mode: "insensitive" as const } },
              { code: { contains: query, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };
    res.json({
      subjects: await db.subject.findMany({
        where,
        include: {
          source: { select: { filename: true } },
          academicYear: true,
          semester: true,
          _count: { select: { units: true } },
        },
        orderBy: [{ academicYear: { number: "asc" } }, { code: "asc" }],
        skip: (page - 1) * 100,
        take: 100,
      }),
      total: await db.subject.count({ where }),
      page,
    });
  },
);
app.get(
  "/api/v1/curriculum/:id",
  requireRole("FACULTY", "ADMIN"),
  async (req, res) => {
    const subject = await db.subject.findUnique({
      where: { id: id(req.params.id) },
      include: {
        ...subjectInclude,
        sourceReferences: {
          include: { sourcePage: true },
          orderBy: { sourcePage: { number: "asc" } },
        },
      },
    });
    if (!subject) throw new ApiError(404, "NOT_FOUND", "Subject not found.");
    res.json({ subject });
  },
);
app.get(
  "/api/v1/courses/:courseId/subjects/:subjectId",
  async (req: AuthRequest, res) => {
    const course = await courseAccess(req, id(req.params.courseId)),
      subjectId = id(req.params.subjectId);
    if (
      !(await db.courseSubject.findUnique({
        where: { courseId_subjectId: { courseId: course.id, subjectId } },
      }))
    )
      throw new ApiError(404, "NOT_FOUND", "Subject not found in this course.");
    const subject = await db.subject.findUniqueOrThrow({
      where: { id: subjectId },
      include: {
        ...subjectInclude,
        sourceReferences: {
          include: { sourcePage: true },
          orderBy: { sourcePage: { number: "asc" } },
        },
      },
    });
    res.json({ subject });
  },
);
app.get("/api/v1/admin/overview", requireRole("ADMIN"), async (_req, res) =>
  res.json({
    users: await db.user.count(),
    courses: await db.course.count(),
    sources: await db.curriculumSource.count(),
    subjects: await db.subject.count(),
    units: await db.curriculumUnit.count(),
  }),
);
app.get("/api/v1/admin/users", requireRole("ADMIN"), async (req, res) => {
  const page = parse(z.coerce.number().int().min(1).default(1), req.query.page);
  const query =
    typeof req.query.q === "string" ? req.query.q.trim().slice(0, 100) : "";
  const where = query
    ? {
        OR: [
          { name: { contains: query, mode: "insensitive" as const } },
          { email: { contains: query, mode: "insensitive" as const } },
        ],
      }
    : {};
  res.json({
    users: (
      await db.user.findMany({
        where,
        take: 100,
        skip: (page - 1) * 100,
        orderBy: { createdAt: "desc" },
      })
    ).map(publicUser),
    total: await db.user.count({ where }),
    page,
  });
});
app.post(
  "/api/v1/admin/users",
  requireRole("ADMIN"),
  async (req: AuthRequest, res) => {
    const b = parse(
      z
        .object({
          email: emailSchema,
          name: z.string().trim().min(1).max(100),
          role: z.enum(["STUDENT", "FACULTY", "ADMIN"]),
        })
        .strict(),
      req.body,
    );
    const user = await db.$transaction(async (tx) => {
      const u = await tx.user.create({ data: b });
      await tx.auditEvent.create({
        data: {
          actorId: req.auth!.user.id,
          action: "USER_INVITED",
          entityType: "User",
          entityId: u.id,
          metadata: { role: u.role },
        },
      });
      return u;
    });
    await invite(user.id);
    res
      .status(201)
      .json({
        user: publicUser(user),
        message:
          config.MAIL_MODE === "filesystem"
            ? "Invitation delivered to the local development outbox."
            : "Invitation emailed.",
      });
  },
);
app.post(
  "/api/v1/admin/users/:id/invitation",
  requireRole("ADMIN"),
  async (req: AuthRequest, res) => {
    const userId = id(req.params.id);
    await invite(userId);
    await db.auditEvent.create({
      data: {
        actorId: req.auth!.user.id,
        action: "INVITATION_RESENT",
        entityType: "User",
        entityId: userId,
        metadata: {},
      },
    });
    res.json({ message: "Invitation delivered." });
  },
);
app.patch(
  "/api/v1/admin/users/:id",
  requireRole("ADMIN"),
  async (req: AuthRequest, res) => {
    const userId = id(req.params.id),
      b = parse(
        z.object({ status: z.enum(["ACTIVE", "DEACTIVATED"]) }).strict(),
        req.body,
      );
    if (userId === req.auth!.user.id)
      throw new ApiError(
        409,
        "SELF_CHANGE",
        "You cannot change your own account status.",
      );
    const existing = await db.user.findUnique({ where: { id: userId } });
    if (!existing) throw new ApiError(404, "NOT_FOUND", "Account not found.");
    if (!existing.passwordHash && b.status === "ACTIVE")
      throw new ApiError(
        409,
        "ACTIVATION_REQUIRED",
        "Pending accounts must activate through their invitation.",
      );
    const user = await db.$transaction(async (tx) => {
      const u = await tx.user.update({ where: { id: userId }, data: b });
      if (b.status === "DEACTIVATED") {
        await tx.session.updateMany({
          where: { userId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
        await tx.authToken.updateMany({
          where: { userId, usedAt: null },
          data: { usedAt: new Date() },
        });
      }
      await tx.auditEvent.create({
        data: {
          actorId: req.auth!.user.id,
          action: "USER_STATUS_CHANGED",
          entityType: "User",
          entityId: userId,
          metadata: b,
        },
      });
      return u;
    });
    res.json({ user: publicUser(user) });
  },
);
app.post(
  "/api/v1/admin/courses",
  requireRole("ADMIN"),
  async (req: AuthRequest, res) => {
    const b = parse(
      z
        .object({
          code: z.string().trim().min(1).max(32),
          title: z.string().trim().min(1).max(150),
          term: z.string().trim().min(1).max(100),
          subjectIds: z.array(z.uuid()).min(1).max(30),
        })
        .strict(),
      req.body,
    );
    const subjects = [...new Set(b.subjectIds)];
    if (
      (await db.subject.count({ where: { id: { in: subjects } } })) !==
      subjects.length
    )
      throw new ApiError(
        422,
        "SUBJECT_INVALID",
        "Select existing curriculum subjects.",
      );
    const course = await db.$transaction(async (tx) => {
      const c = await tx.course.create({
        data: {
          code: b.code,
          title: b.title,
          term: b.term,
          subjects: { create: subjects.map((subjectId) => ({ subjectId })) },
        },
      });
      await tx.auditEvent.create({
        data: {
          actorId: req.auth!.user.id,
          action: "COURSE_CREATED",
          entityType: "Course",
          entityId: c.id,
          metadata: {},
        },
      });
      return c;
    });
    res.status(201).json({ course });
  },
);
app.patch(
  "/api/v1/admin/courses/:id",
  requireRole("ADMIN"),
  async (req: AuthRequest, res) => {
    const courseId = id(req.params.id),
      b = parse(
        z.object({ status: z.enum(["ACTIVE", "ARCHIVED"]) }).strict(),
        req.body,
      );
    const course = await db.$transaction(async (tx) => {
      const c = await tx.course.update({ where: { id: courseId }, data: b });
      await tx.auditEvent.create({
        data: {
          actorId: req.auth!.user.id,
          action: "COURSE_STATUS_CHANGED",
          entityType: "Course",
          entityId: courseId,
          metadata: b,
        },
      });
      return c;
    });
    res.json({ course });
  },
);
app.post(
  "/api/v1/admin/courses/:id/memberships",
  requireRole("ADMIN"),
  async (req: AuthRequest, res) => {
    const courseId = id(req.params.id),
      b = parse(
        z
          .object({
            userId: z.uuid(),
            memberRole: z.enum(["STUDENT", "FACULTY"]),
          })
          .strict(),
        req.body,
      );
    await courseAccess(req, courseId, true);
    const user = await db.user.findUnique({ where: { id: b.userId } });
    if (!user || user.role !== b.memberRole || user.status === "DEACTIVATED")
      throw new ApiError(
        422,
        "MEMBERSHIP_INVALID",
        "Choose a compatible active or pending account.",
      );
    const membership = await db.$transaction(async (tx) => {
      const m = await tx.courseMembership.upsert({
        where: { courseId_userId: { courseId, userId: b.userId } },
        create: { courseId, ...b },
        update: {},
      });
      await tx.auditEvent.create({
        data: {
          actorId: req.auth!.user.id,
          action: "MEMBERSHIP_ASSIGNED",
          entityType: "CourseMembership",
          entityId: m.id,
          metadata: { memberRole: b.memberRole },
        },
      });
      return m;
    });
    res.status(201).json({ membership });
  },
);
app.get(
  "/api/v1/admin/courses/:id/memberships",
  requireRole("ADMIN"),
  async (req: AuthRequest, res) => {
    const course = await courseAccess(req, id(req.params.id));
    const members = await db.courseMembership.findMany({
      where: { courseId: course.id },
      orderBy: { createdAt: "asc" },
      include: { user: true },
    });
    res.json({
      memberships: members.map((m) => ({
        id: m.id,
        memberRole: m.memberRole,
        user: publicUser(m.user),
      })),
    });
  },
);
app.delete(
  "/api/v1/admin/courses/:id/memberships/:membershipId",
  requireRole("ADMIN"),
  async (req: AuthRequest, res) => {
    const course = await courseAccess(req, id(req.params.id), true),
      membershipId = id(req.params.membershipId);
    const membership = await db.courseMembership.findFirst({
      where: { id: membershipId, courseId: course.id },
    });
    if (!membership)
      throw new ApiError(404, "NOT_FOUND", "Assignment not found.");
    await db.$transaction(async (tx) => {
      await tx.courseMembership.delete({ where: { id: membership.id } });
      await tx.auditEvent.create({
        data: {
          actorId: req.auth!.user.id,
          action: "MEMBERSHIP_REMOVED",
          entityType: "CourseMembership",
          entityId: membership.id,
          metadata: {
            courseId: course.id,
            userId: membership.userId,
            memberRole: membership.memberRole,
          },
        },
      });
    });
    res.sendStatus(204);
  },
);
app.get("/api/v1/admin/audit-events", requireRole("ADMIN"), async (_req, res) =>
  res.json({
    events: await db.auditEvent.findMany({
      take: 100,
      orderBy: { createdAt: "desc" },
      include: { actor: { select: { name: true } } },
    }),
  }),
);
// Feature routers attach here before the common error boundary.
export function mountFeatures(path: string, router: express.Router) {
  app.use(path, router);
}
export function finalize() {
  app.use((_req, _res) => {
    throw new ApiError(404, "NOT_FOUND", "Page or endpoint not found.");
  });
  app.use(
    (
      error: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      if (error instanceof ApiError) {
        res
          .status(error.status)
          .json({
            code: error.code,
            message: error.message,
            fieldErrors: error.fields,
            requestId: res.locals.requestId,
          });
        return;
      }
      const code =
        typeof error === "object" && error !== null && "code" in error
          ? String(error.code)
          : "";
      if (
        typeof error === "object" &&
        error !== null &&
        "type" in error &&
        error.type === "entity.too.large"
      ) {
        res
          .status(413)
          .json({
            code: "BODY_TOO_LARGE",
            message: "Request exceeds the 2 MiB body limit.",
          });
        return;
      }
      if (code === "P2002") {
        res
          .status(409)
          .json({
            code: "CONFLICT",
            message: "A record with these details already exists.",
            requestId: res.locals.requestId,
          });
        return;
      }
      if (code === "P2025") {
        res
          .status(404)
          .json({
            code: "NOT_FOUND",
            message: "Record not found.",
            requestId: res.locals.requestId,
          });
        return;
      }
      if (error instanceof SyntaxError) {
        res
          .status(400)
          .json({ code: "INVALID_JSON", message: "Invalid request body." });
        return;
      }
      console.error("Request failed", { requestId: res.locals.requestId });
      res
        .status(503)
        .json({
          code: "UNAVAILABLE",
          message: "The service could not complete this request. Please retry.",
          requestId: res.locals.requestId,
        });
    },
  );
}
app.use("/api/v1", learningRouter, executionRouter);
finalize();
