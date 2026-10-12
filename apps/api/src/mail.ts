import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import nodemailer from "nodemailer";
import { config, projectRoot } from "./config.js";
import { newToken } from "./security.js";
const outboxDirectory = path.join(projectRoot, ".local", "outbox");
const appHostname = new URL(config.APP_ORIGIN).hostname;
export const localMailPreviewEnabled =
  config.MAIL_MODE === "filesystem" &&
  config.NODE_ENV !== "production" &&
  config.HOST === "127.0.0.1" &&
  ["localhost", "127.0.0.1"].includes(appHostname);
const smtpTransport =
  config.MAIL_MODE === "smtp"
    ? nodemailer.createTransport({
        host: config.SMTP_HOST,
        port: config.SMTP_PORT,
        secure: config.SMTP_SECURE,
        auth: config.SMTP_USER
          ? { user: config.SMTP_USER, pass: config.SMTP_PASSWORD }
          : undefined,
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 30_000,
      })
    : null;
type MailPurpose = "ACTIVATION" | "RESET";
type StoredMail = {
  to: string;
  purpose: MailPurpose;
  subject: string;
  text: string;
  url: string;
  createdAt: string;
};
export type LocalMailPreview = Pick<
  StoredMail,
  "to" | "purpose" | "subject" | "createdAt"
> & { actionUrl: string };
function mailSubject(purpose: MailPurpose) {
  return purpose === "ACTIVATION"
    ? "Activate your AlgoLearn account"
    : "Reset your AlgoLearn password";
}
export async function deliverLink(
  email: string,
  purpose: MailPurpose,
  token: string,
) {
  const route = purpose === "ACTIVATION" ? "activate" : "reset-password";
  // Fragments keep bearer tokens out of server/access logs and referrer URLs.
  const url = `${config.APP_ORIGIN}/${route}#token=${token}`;
  const subject = mailSubject(purpose);
  const text = `${subject}: ${url}\nThis single-use link expires in ${purpose === "ACTIVATION" ? "24 hours" : "30 minutes"}. If you did not request this message, you can safely ignore it.`;
  if (config.MAIL_MODE === "filesystem") {
    await mkdir(outboxDirectory, { recursive: true });
    await writeFile(
      path.join(
        outboxDirectory,
        `${Date.now()}-${newToken().slice(0, 16)}.json`,
      ),
      JSON.stringify(
        {
          to: email,
          purpose,
          subject,
          text,
          url,
          createdAt: new Date().toISOString(),
        } satisfies StoredMail,
        null,
        2,
      ),
      { mode: 0o600 },
    );
    return;
  }
  await smtpTransport!.sendMail({
    from: config.MAIL_FROM,
    to: email,
    subject,
    text,
  });
}
export async function verifyMailTransport() {
  if (smtpTransport) await smtpTransport.verify();
}
export async function listLocalMailPreviews(): Promise<LocalMailPreview[]> {
  if (!localMailPreviewEnabled) return [];
  let files: string[];
  try {
    files = await readdir(outboxDirectory);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
  const messages: LocalMailPreview[] = [];
  for (const filename of files
    .filter((file) => /^\d+-[A-Za-z0-9_-]+\.json$/.test(file))
    .sort()
    .reverse()
    .slice(0, 100)) {
    try {
      const raw = JSON.parse(
        await readFile(path.join(outboxDirectory, filename), "utf8"),
      ) as Partial<StoredMail>;
      if (
        typeof raw.to !== "string" ||
        !["ACTIVATION", "RESET"].includes(raw.purpose ?? "") ||
        typeof raw.url !== "string"
      )
        continue;
      const action = new URL(raw.url);
      if (
        action.origin !== config.APP_ORIGIN ||
        !["/activate", "/reset-password"].includes(action.pathname) ||
        !new URLSearchParams(action.hash.slice(1)).get("token")
      )
        continue;
      const timestamp = Number(filename.split("-", 1)[0]);
      messages.push({
        to: raw.to,
        purpose: raw.purpose as MailPurpose,
        subject:
          typeof raw.subject === "string"
            ? raw.subject
            : mailSubject(raw.purpose as MailPurpose),
        createdAt:
          typeof raw.createdAt === "string" &&
          !Number.isNaN(Date.parse(raw.createdAt))
            ? raw.createdAt
            : new Date(timestamp).toISOString(),
        actionUrl: action.pathname + action.hash,
      });
    } catch {
      // Ignore malformed or partially-written local preview files.
    }
  }
  return messages;
}
