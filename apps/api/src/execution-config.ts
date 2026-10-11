import { z } from "zod";
import { config } from "./config.js";
const schema = z.object({
  JUDGE0_URL: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.url().optional(),
  ),
  JUDGE0_API_KEY: z.string().optional(),
  JUDGE0_ISOLATION_VERIFIED: z.enum(["true", "false"]).default("false"),
  JUDGE0_LANGUAGES: z.string().optional(),
  JAVA_LIMITS_CALIBRATED: z.enum(["true", "false"]).default("false"),
});
export const executionConfig = schema.parse(process.env);
export const languageMap = executionConfig.JUDGE0_LANGUAGES
  ? z
      .object({
        c: z.number().int().positive(),
        cpp: z.number().int().positive(),
        java: z.number().int().positive(),
        python: z.number().int().positive(),
      })
      .strict()
      .parse(JSON.parse(executionConfig.JUDGE0_LANGUAGES))
  : null;
export const executionConfigured =
  !!executionConfig.JUDGE0_URL &&
  !!languageMap &&
  executionConfig.JUDGE0_ISOLATION_VERIFIED === "true";
export const executorTimeout = 90000;
export const development = config.NODE_ENV !== "production";
