import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { configureTestEnvironment } from "./test-environment.mjs";
const root = fileURLToPath(new URL("../", import.meta.url));
const database = configureTestEnvironment();
const env = { ...process.env, DATABASE_URL: database, NODE_ENV: "test" };
for (const args of [
  [path.join(root, "node_modules/prisma/build/index.js"), "migrate", "deploy"],
  [path.join(root, "node_modules/tsx/dist/cli.mjs"), "src/seed.ts"],
]) {
  const result = spawnSync(process.execPath, args, {
    cwd: path.join(root, "apps/api"),
    env,
    windowsHide: true,
    stdio: "inherit",
  });
  if (result.status !== 0) throw new Error("Test database preparation failed.");
}
