import { configureTestEnvironment } from "./test-environment.mjs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const url = configureTestEnvironment();
const cli = path.join(root, "node_modules/prisma/build/index.js");
const result = spawnSync(process.execPath, [cli, "migrate", "deploy"], {
  cwd: path.join(root, "apps/api"),
  env: { ...process.env, DATABASE_URL: url },
  stdio: "inherit",
  windowsHide: true,
});
process.exitCode = result.status ?? 1;
