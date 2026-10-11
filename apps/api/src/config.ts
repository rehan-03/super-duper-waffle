import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { z } from "zod";
export const projectRoot = fileURLToPath(new URL("../../../", import.meta.url));
dotenv.config({ path: new URL("../../../.env", import.meta.url), quiet: true });
const schema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  HOST: z.enum(["127.0.0.1", "0.0.0.0"]).default("127.0.0.1"),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(2).default(0),
  APP_ORIGIN: z.url().default("http://localhost:5173"),
  DATABASE_URL: z.string().min(1),
  COOKIE_SECURE: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  MAIL_MODE: z.enum(["filesystem", "smtp"]).default("filesystem"),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_SECURE: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  MAIL_FROM: z.string().default("AlgoLearn <noreply@algolearn.local>"),
});
const parsed = schema.safeParse(process.env);
if (!parsed.success)
  throw new Error(
    "Invalid server configuration. Check .env against .env.example.",
  );
export const config = parsed.data;
if (
  config.NODE_ENV === "production" &&
  (!config.COOKIE_SECURE ||
    !config.APP_ORIGIN.startsWith("https://") ||
    config.MAIL_MODE !== "smtp" ||
    !config.SMTP_HOST)
)
  throw new Error(
    "Production requires HTTPS, secure cookies and SMTP delivery.",
  );
