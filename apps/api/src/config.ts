import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { z } from "zod";
export const projectRoot = fileURLToPath(new URL("../../../", import.meta.url));
dotenv.config({ path: new URL("../../../.env", import.meta.url), quiet: true });
const optionalSecret = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().min(1).optional(),
);
const mailFrom = z
  .string()
  .min(3)
  .max(320)
  .refine((value) => !/[\r\n]/.test(value))
  .refine((value) => {
    const address = value.match(/<([^<>]+)>$/)?.[1] ?? value;
    return z.email().safeParse(address).success;
  });
const schema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  HOST: z.enum(["127.0.0.1", "0.0.0.0"]).default("127.0.0.1"),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(2).default(0),
  APP_ORIGIN: z
    .url()
    .refine((value) => {
      const origin = new URL(value);
      return (
        ["http:", "https:"].includes(origin.protocol) &&
        !origin.username &&
        !origin.password &&
        origin.pathname === "/" &&
        !origin.search &&
        !origin.hash
      );
    })
    .transform((value) => new URL(value).origin)
    .default("http://localhost:5173"),
  DATABASE_URL: z.string().min(1),
  COOKIE_SECURE: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  MAIL_MODE: z.enum(["filesystem", "smtp"]).default("filesystem"),
  SMTP_HOST: optionalSecret,
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
  SMTP_SECURE: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  SMTP_USER: optionalSecret,
  SMTP_PASSWORD: optionalSecret,
  MAIL_FROM: mailFrom.default("AlgoLearn <noreply@algolearn.local>"),
});
const parsed = schema.safeParse(process.env);
if (!parsed.success)
  throw new Error(
    "Invalid server configuration. Check .env against .env.example.",
  );
export const config = parsed.data;
const appHostname = new URL(config.APP_ORIGIN).hostname;
if (
  config.MAIL_MODE === "filesystem" &&
  (config.HOST !== "127.0.0.1" ||
    !["localhost", "127.0.0.1"].includes(appHostname))
)
  throw new Error(
    "Filesystem mail preview is development-only and requires loopback HOST and APP_ORIGIN.",
  );
if (Boolean(config.SMTP_USER) !== Boolean(config.SMTP_PASSWORD))
  throw new Error("SMTP_USER and SMTP_PASSWORD must be configured together.");
if (
  config.NODE_ENV === "production" &&
  (!config.COOKIE_SECURE ||
    !config.APP_ORIGIN.startsWith("https://") ||
    config.MAIL_MODE !== "smtp" ||
    !config.SMTP_HOST ||
    !config.SMTP_USER ||
    !config.SMTP_PASSWORD ||
    config.MAIL_FROM.includes("@algolearn.local"))
)
  throw new Error(
    "Production requires HTTPS, secure cookies, an institutional MAIL_FROM, and authenticated SMTP_HOST/SMTP_USER/SMTP_PASSWORD.",
  );
