import { afterEach, expect, test, vi } from "vitest";
import { configureTestEnvironment } from "../../scripts/test-environment.mjs";

afterEach(() => vi.unstubAllEnvs());

function environment() {
  for (const key of [
    "DATABASE_URL",
    "TEST_DATABASE_URL",
    "NODE_ENV",
    "MAIL_MODE",
    "COOKIE_SECURE",
    "JUDGE0_URL",
    "JUDGE0_LANGUAGES",
    "JUDGE0_API_KEY",
    "JUDGE0_ISOLATION_VERIFIED",
    "JAVA_LIMITS_CALIBRATED",
  ])
    vi.stubEnv(key, process.env[key]);
}

test("isolated tests honor environment URLs and disable external services", () => {
  environment();
  vi.stubEnv(
    "DATABASE_URL",
    "postgresql://local:unused@127.0.0.1:5432/algolearn",
  );
  vi.stubEnv(
    "TEST_DATABASE_URL",
    "postgresql://local:unused@127.0.0.1:5432/algolearn_test",
  );
  vi.stubEnv("MAIL_MODE", "smtp");
  vi.stubEnv("JUDGE0_URL", "https://executor.invalid");
  vi.stubEnv("JUDGE0_ISOLATION_VERIFIED", "true");
  expect(configureTestEnvironment()).toBe(process.env.TEST_DATABASE_URL);
  expect(process.env.DATABASE_URL).toBe(process.env.TEST_DATABASE_URL);
  expect(process.env.MAIL_MODE).toBe("filesystem");
  expect(process.env.JUDGE0_URL).toBe("");
  expect(process.env.JUDGE0_ISOLATION_VERIFIED).toBe("false");
});

test("tests reject the development database even with different credentials and URL spelling", () => {
  environment();
  vi.stubEnv(
    "DATABASE_URL",
    "postgres://owner:unused@127.0.0.1/algolearn_test",
  );
  vi.stubEnv(
    "TEST_DATABASE_URL",
    "postgresql://test:unused@127.0.0.1:5432/algolearn_test?schema=public",
  );
  expect(() => configureTestEnvironment()).toThrow("distinct from development");
  vi.stubEnv(
    "TEST_DATABASE_URL",
    "postgresql://local:unused@127.0.0.1/algolearn",
  );
  expect(() => configureTestEnvironment()).toThrow("isolated algolearn_test");
});
