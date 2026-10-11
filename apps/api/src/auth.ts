import { Router } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { z } from "zod";
import { db } from "./db.js";
import { config } from "./config.js";
import {
  emailSchema,
  passwordSchema,
  newToken,
  hashToken,
  hashPassword,
  verifyPassword,
} from "./security.js";
import {
  ApiError,
  parse,
  publicUser,
  requireAuth,
  csrf,
  type AuthRequest,
} from "./http.js";
import { deliverLink } from "./mail.js";
export const authRouter = Router();
authRouter.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 2000,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
      code: "RATE_LIMITED",
      message: "Too many account requests. Please try again later.",
    },
  }),
);
authRouter.use(
  "/login",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: config.NODE_ENV === "test" ? 200 : 10,
    keyGenerator: (req) =>
      hashToken(
        `${ipKeyGenerator(req.ip ?? "unknown")}:${typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : ""}`,
      ),
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
      code: "RATE_LIMITED",
      message: "Too many sign-in attempts. Please try again later.",
    },
  }),
);
authRouter.use(
  ["/signup", "/activate", "/password-reset", "/password-reset/confirm"],
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: config.NODE_ENV === "test" ? 200 : 20,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
      code: "RATE_LIMITED",
      message: "Too many recovery requests. Please try again later.",
    },
  }),
);
const cookieOptions = {
  httpOnly: true,
  secure: config.COOKIE_SECURE,
  sameSite: "lax" as const,
  path: "/",
};
// Dummy Argon2 hash ensures nonexistent accounts still perform a password check.
const dummyHash = await hashPassword(newToken());
authRouter.post("/signup", async (req, res) => {
  const body = parse(
    z
      .object({ name: z.string().trim().min(2).max(100), email: emailSchema })
      .strict(),
    req.body,
  );
  const user = await db.$transaction(async (tx) => {
    // The unique email constraint makes simultaneous retries safe. Public signup
    // never changes an existing account's name, role, password or status.
    const created = await tx.user.createMany({
      data: [{ ...body, role: "STUDENT", status: "PENDING" }],
      skipDuplicates: true,
    });
    const account = await tx.user.findUniqueOrThrow({
      where: { email: body.email },
    });
    if (created.count === 1)
      await tx.auditEvent.create({
        data: {
          actorId: account.id,
          action: "STUDENT_SELF_REGISTERED",
          entityType: "User",
          entityId: account.id,
          metadata: {},
        },
      });
    return account;
  });
  // Passwords are chosen only after ownership of the email is verified.
  // As with recovery, delivery and its failure must not enumerate accounts.
  if (user.role === "STUDENT" && user.status === "PENDING")
    void invite(user.id).catch(() =>
      console.error("Signup activation delivery failed."),
    );
  res.status(202).json({
    message:
      "If this email is eligible for student registration, an activation link will be sent. Open it within 24 hours to choose your password. Already activated? Log in or reset your password.",
    delivery:
      config.MAIL_MODE === "filesystem" ? "development-outbox" : "email",
  });
});
authRouter.post("/login", async (req: AuthRequest, res) => {
  const body = parse(
    z
      .object({ email: emailSchema, password: z.string().min(1).max(128) })
      .strict(),
    req.body,
  );
  const user = await db.user.findUnique({ where: { email: body.email } });
  const valid = await verifyPassword(
    user?.passwordHash ?? dummyHash,
    body.password,
  );
  if (!valid || !user || user.status !== "ACTIVE")
    throw new ApiError(
      401,
      "INVALID_CREDENTIALS",
      "Email or password is incorrect.",
    );
  const token = newToken(),
    csrfToken = newToken();
  await db.$transaction(async (tx) => {
    if (req.auth)
      await tx.session.update({
        where: { id: req.auth.session.id },
        data: { revokedAt: new Date() },
      });
    await tx.session.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(token),
        csrfToken,
        expiresAt: new Date(Date.now() + 86400000),
      },
    });
  });
  res
    .cookie("algolearn_session", token, { ...cookieOptions, maxAge: 86400000 })
    .json({ user: publicUser(user), csrfToken });
});
authRouter.post("/logout", requireAuth, csrf, async (req: AuthRequest, res) => {
  await db.session.update({
    where: { id: req.auth!.session.id },
    data: { revokedAt: new Date() },
  });
  res.clearCookie("algolearn_session", cookieOptions).sendStatus(204);
});
async function consume(
  token: string,
  password: string,
  purpose: "ACTIVATION" | "RESET",
) {
  const passwordHash = await hashPassword(password);
  return db.$transaction(async (tx) => {
    const record = await tx.authToken.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { user: true },
    });
    if (
      !record ||
      record.purpose !== purpose ||
      record.usedAt ||
      record.expiresAt <= new Date() ||
      record.user.status === "DEACTIVATED" ||
      (purpose === "ACTIVATION" && record.user.status !== "PENDING")
    )
      throw new ApiError(
        422,
        "TOKEN_INVALID",
        "This link is invalid, expired, or already used.",
      );
    const claimed = await tx.authToken.updateMany({
      where: { id: record.id, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });
    if (claimed.count !== 1)
      throw new ApiError(
        422,
        "TOKEN_INVALID",
        "This link has already been used.",
      );
    const user = await tx.user.update({
      where: { id: record.userId },
      data: { passwordHash, status: "ACTIVE" },
    });
    await tx.session.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await tx.authToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    await tx.auditEvent.create({
      data: {
        actorId: user.id,
        action:
          purpose === "ACTIVATION" ? "ACCOUNT_ACTIVATED" : "PASSWORD_RESET",
        entityType: "User",
        entityId: user.id,
        metadata: {},
      },
    });
    return publicUser(user);
  });
}
const tokenBody = z
  .object({ token: z.string().min(32).max(256), password: passwordSchema })
  .strict();
authRouter.post("/activate", async (req, res) => {
  const b = parse(tokenBody, req.body);
  res.json({ user: await consume(b.token, b.password, "ACTIVATION") });
});
authRouter.post("/password-reset/confirm", async (req, res) => {
  const b = parse(tokenBody, req.body);
  await consume(b.token, b.password, "RESET");
  res.json({ message: "Password changed. Sign in with your new password." });
});
authRouter.post("/password-reset", async (req, res) => {
  const { email } = parse(z.object({ email: emailSchema }).strict(), req.body);
  const user = await db.user.findUnique({ where: { email } });
  if (user?.status === "ACTIVE") {
    const token = newToken();
    await db.$transaction(async (tx) => {
      await tx.authToken.updateMany({
        where: { userId: user.id, purpose: "RESET", usedAt: null },
        data: { usedAt: new Date() },
      });
      await tx.authToken.create({
        data: {
          userId: user.id,
          purpose: "RESET",
          tokenHash: hashToken(token),
          expiresAt: new Date(Date.now() + 1800000),
        },
      });
    });
    // Delivery failure is redacted and must not reveal whether the email exists.
    void deliverLink(email, "RESET", token).catch(() =>
      console.error("Password-reset delivery failed."),
    );
  }
  res.json({
    message: "If an active account exists, a reset link has been sent.",
  });
});
export async function invite(userId: string) {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  if (user.status !== "PENDING")
    throw new ApiError(
      409,
      "ALREADY_ACTIVATED",
      "This account is not waiting for activation.",
    );
  const token = newToken();
  await db.$transaction(async (tx) => {
    await tx.authToken.updateMany({
      where: { userId, usedAt: null, purpose: "ACTIVATION" },
      data: { usedAt: new Date() },
    });
    await tx.authToken.create({
      data: {
        userId,
        purpose: "ACTIVATION",
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + 86400000),
      },
    });
  });
  try {
    await deliverLink(user.email, "ACTIVATION", token);
  } catch {
    throw new ApiError(
      503,
      "DELIVERY_FAILED",
      "Account created, but invitation delivery failed. Use Resend invitation.",
    );
  }
}
