import { db } from "./db.js";
import { emailSchema, newToken, hashToken } from "./security.js";
import { deliverLink } from "./mail.js";
import { invite } from "./auth.js";
const email = emailSchema.parse(
  process.env.BOOTSTRAP_ADMIN_EMAIL ?? "admin@algolearn.local",
);
const existing = await db.user.findFirst({ where: { role: "ADMIN" } });
if (existing) {
  if (existing.status === "PENDING" && existing.email === email) {
    await invite(existing.id);
    console.log(
      "Pending administrator invitation resent to the private development outbox or configured SMTP.",
    );
  } else
    console.log("An administrator already exists; no account was modified.");
} else {
  const token = newToken();
  const user = await db.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { email, name: "Platform administrator", role: "ADMIN" },
    });
    await tx.authToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(token),
        purpose: "ACTIVATION",
        expiresAt: new Date(Date.now() + 86400000),
      },
    });
    await tx.auditEvent.create({
      data: {
        action: "BOOTSTRAP_ADMIN",
        entityType: "User",
        entityId: user.id,
        metadata: {},
      },
    });
    return user;
  });
  await deliverLink(user.email, "ACTIVATION", token);
  console.log(
    "Administrator invitation delivered. Development links are in the ignored .local/outbox directory.",
  );
}
await db.$disconnect();
