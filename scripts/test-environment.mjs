import dotenv from "dotenv";
import { fileURLToPath } from "node:url";

export function configureTestEnvironment() {
  dotenv.config({
    path: fileURLToPath(new URL("../.env", import.meta.url)),
    quiet: true,
  });
  const database = process.env.TEST_DATABASE_URL;
  const development = process.env.DATABASE_URL;
  const target = database ? new URL(database) : null;
  const current = development ? new URL(development) : null;
  if (
    !target ||
    !["postgres:", "postgresql:"].includes(target.protocol) ||
    decodeURIComponent(target.pathname) !== "/algolearn_test" ||
    (current &&
      target.hostname === current.hostname &&
      (target.port || "5432") === (current.port || "5432") &&
      decodeURIComponent(target.pathname) ===
        decodeURIComponent(current.pathname))
  )
    throw new Error(
      "Tests require an isolated algolearn_test database distinct from development.",
    );
  process.env.DATABASE_URL = database;
  process.env.NODE_ENV = "test";
  process.env.MAIL_MODE = "filesystem";
  process.env.COOKIE_SECURE = "false";
  process.env.JUDGE0_URL = "";
  process.env.JUDGE0_LANGUAGES = "";
  process.env.JUDGE0_API_KEY = "";
  process.env.JUDGE0_ISOLATION_VERIFIED = "false";
  process.env.JAVA_LIMITS_CALIBRATED = "false";
  return database;
}
