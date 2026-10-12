import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
const root = fileURLToPath(new URL("../", import.meta.url));
dotenv.config({ path: path.join(root, ".env"), quiet: true });
const bin =
  process.env.POSTGRES_BIN || "C:\\Program Files\\PostgreSQL\\16\\bin";
const result = spawnSync(
  path.join(bin, process.platform === "win32" ? "pg_ctl.exe" : "pg_ctl"),
  ["-D", path.join(root, ".local", "postgres"), "-m", "fast", "-w", "stop"],
  { encoding: "utf8", windowsHide: true },
);
if (result.status !== 0)
  throw new Error(
    "Could not stop the dedicated AlgoLearn cluster. No system service was changed.",
  );
console.log("Stopped only the dedicated AlgoLearn development cluster.");
