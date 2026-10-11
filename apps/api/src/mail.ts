import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import nodemailer from "nodemailer";
import { config, projectRoot } from "./config.js";
import { newToken } from "./security.js";
export async function deliverLink(
  email: string,
  purpose: "ACTIVATION" | "RESET",
  token: string,
) {
  const route = purpose === "ACTIVATION" ? "activate" : "reset-password";
  // Fragments keep bearer tokens out of server/access logs and referrer URLs.
  const url = `${config.APP_ORIGIN}/${route}#token=${token}`;
  const text = `${purpose === "ACTIVATION" ? "Activate your AlgoLearn account" : "Reset your AlgoLearn password"}: ${url}\nThis single-use link expires in ${purpose === "ACTIVATION" ? "24 hours" : "30 minutes"}.`;
  if (config.MAIL_MODE === "filesystem") {
    const dir = path.join(projectRoot, ".local", "outbox");
    await mkdir(dir, { recursive: true });
    await writeFile(
      path.join(dir, `${Date.now()}-${newToken().slice(0, 8)}.json`),
      JSON.stringify({ to: email, purpose, text, url }, null, 2),
      { mode: 0o600 },
    );
    return;
  }
  await nodemailer
    .createTransport({
      host: config.SMTP_HOST,
      port: config.SMTP_PORT,
      secure: config.SMTP_SECURE,
      auth: config.SMTP_USER
        ? { user: config.SMTP_USER, pass: config.SMTP_PASSWORD }
        : undefined,
    })
    .sendMail({
      from: config.MAIL_FROM,
      to: email,
      subject:
        purpose === "ACTIVATION"
          ? "Activate AlgoLearn"
          : "Reset AlgoLearn password",
      text,
    });
}
