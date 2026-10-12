import { configureTestEnvironment } from "./test-environment.mjs";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const database = configureTestEnvironment();
const child = spawn(
  process.execPath,
  process.env.E2E_PRODUCTION === "true"
    ? ["dist/server.js"]
    : [path.join(root, "node_modules/tsx/dist/cli.mjs"), "src/server.ts"],
  {
    cwd: path.join(root, "apps/api"),
    env: {
      ...process.env,
      DATABASE_URL: database,
      NODE_ENV: "test",
      APP_ORIGIN: "http://localhost:5174",
      PORT: "4001",
      HOST: "127.0.0.1",
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
