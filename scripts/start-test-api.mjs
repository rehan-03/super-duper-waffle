import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const text = await readFile(path.join(root, ".env"), "utf8");
const database = text.match(/^TEST_DATABASE_URL=(.+)$/m)?.[1]?.trim();
if (!database || new URL(database).pathname !== "/algolearn_test")
  throw new Error("Dedicated test database required.");
const child = spawn(
  process.execPath,
  [path.join(root, "node_modules/tsx/dist/cli.mjs"), "src/server.ts"],
  {
    cwd: path.join(root, "apps/api"),
    env: {
      ...process.env,
      DATABASE_URL: database,
      NODE_ENV: "test",
      APP_ORIGIN: "http://localhost:5174",
      PORT: "4001",
    },
    stdio: "inherit",
    windowsHide: true,
  },
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => child.kill(signal));
child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
