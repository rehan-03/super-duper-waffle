import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import dotenv from "dotenv";
const root = fileURLToPath(new URL("../", import.meta.url));
const values = dotenv.parse(await readFile(path.join(root, ".env"), "utf8"));
const database = process.env.TEST_DATABASE_URL ?? values.TEST_DATABASE_URL;
if (
  !database ||
  new URL(database).pathname !== "/algolearn_test" ||
  database === (process.env.DATABASE_URL ?? values.DATABASE_URL)
)
  throw new Error(
    "Tests require an isolated algolearn_test database distinct from development.",
  );
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
