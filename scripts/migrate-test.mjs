import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const text = await readFile(path.join(root, ".env"), "utf8");
const url = text.match(/^TEST_DATABASE_URL=(.+)$/m)?.[1]?.trim();
if (!url || new URL(url).pathname !== "/algolearn_test")
  throw new Error("Dedicated algolearn_test URL required.");
const cli = path.join(root, "node_modules/prisma/build/index.js");
const result = spawnSync(process.execPath, [cli, "migrate", "deploy"], {
  cwd: path.join(root, "apps/api"),
  env: { ...process.env, DATABASE_URL: url },
  stdio: "inherit",
  windowsHide: true,
});
process.exitCode = result.status ?? 1;
