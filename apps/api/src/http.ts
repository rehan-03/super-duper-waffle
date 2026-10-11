import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { db } from "./db.js";
import { config } from "./config.js";
import { hashToken, safeEqual } from "./security.js";
import type { User, Session } from "./generated/prisma/client.js";
export type AuthRequest = Request & { auth?: { user: User; session: Session } };
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields?: Record<string, string[]>,
  ) {
    super(message);
  }
}
export function parse<T>(schema: z.ZodType<T>, data: unknown): T {
  const r = schema.safeParse(data);
  if (!r.success)
    throw new ApiError(
      422,
      "VALIDATION",
      "Please check the highlighted fields.",
      z.flattenError(r.error).fieldErrors as Record<string, string[]>,
    );
  return r.data;
}
export function id(value: unknown) {
  return parse(z.uuid(), value);
}
export function publicUser(user: User) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
  };
}
export async function authenticate(
  req: AuthRequest,
  _res: Response,
  next: NextFunction,
) {
  const token = req.cookies?.algolearn_session;
  if (typeof token === "string") {
    const session = await db.session.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { user: true },
    });
    if (
      session &&
      !session.revokedAt &&
      session.expiresAt > new Date() &&
      session.user.status === "ACTIVE"
    )
      req.auth = { session, user: session.user };
  }
  next();
}
export function requireAuth(
  req: AuthRequest,
  _res: Response,
  next: NextFunction,
) {
  if (!req.auth)
    throw new ApiError(401, "UNAUTHENTICATED", "Please sign in to continue.");
  next();
}
export const requireRole =
  (...roles: string[]) =>
  (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.auth)
      throw new ApiError(401, "UNAUTHENTICATED", "Please sign in.");
    if (!roles.includes(req.auth.user.role))
      throw new ApiError(
        403,
        "FORBIDDEN",
        "You do not have access to this page.",
      );
    next();
  };
export function checkOrigin(req: Request, _res: Response, next: NextFunction) {
  if (
    ["POST", "PUT", "PATCH", "DELETE"].includes(req.method) &&
    req.get("origin") !== config.APP_ORIGIN
  )
    throw new ApiError(403, "ORIGIN", "This request must come from AlgoLearn.");
  next();
}
export function csrf(req: AuthRequest, _res: Response, next: NextFunction) {
  if (
    ["POST", "PUT", "PATCH", "DELETE"].includes(req.method) &&
    req.auth &&
    !safeEqual(req.get("x-csrf-token") ?? "", req.auth.session.csrfToken)
  )
    throw new ApiError(403, "CSRF", "Refresh this page before trying again.");
  next();
}
export async function courseAccess(
  req: AuthRequest,
  courseId: string,
  write = false,
) {
  const course = await db.course.findFirst({
    where: {
      id: courseId,
      ...(req.auth!.user.role === "ADMIN"
        ? {}
        : {
            memberships: {
              some: {
                userId: req.auth!.user.id,
                memberRole: req.auth!.user.role,
              },
            },
          }),
    },
  });
  if (!course) throw new ApiError(404, "NOT_FOUND", "Course not found.");
  if (write && course.status === "ARCHIVED")
    throw new ApiError(409, "ARCHIVED", "This course is read-only.");
  return course;
}
