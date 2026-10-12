import { mkdir, writeFile } from "node:fs/promises";
import dotenv from "dotenv";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
const root = fileURLToPath(new URL("../", import.meta.url));
dotenv.config({ path: path.join(root, ".env"), quiet: true });
const url = new URL(process.env.DATABASE_URL ?? "");
if (
  url.hostname !== "127.0.0.1" ||
  url.port !== "55432" ||
  url.pathname !== "/algolearn"
)
  throw new Error(
    "This helper backs up only the dedicated local AlgoLearn database.",
  );
const folder = path.join(root, ".local", "backups");
await mkdir(folder, { recursive: true });
const file = path.join(folder, `algolearn-${Date.now()}.dump`);
const bin =
  process.env.POSTGRES_BIN ?? "C:\\Program Files\\PostgreSQL\\16\\bin";
const result = spawnSync(
  path.join(bin, `pg_dump${process.platform === "win32" ? ".exe" : ""}`),
  ["--format=custom", "--no-owner", "--no-privileges", "--file", file],
  {
    windowsHide: true,
    stdio: "ignore",
    env: {
      ...process.env,
      PGHOST: url.hostname,
      PGPORT: url.port,
      PGUSER: decodeURIComponent(url.username),
      PGPASSWORD: decodeURIComponent(url.password),
      PGDATABASE: "algolearn",
    },
  },
);
if (result.status !== 0)
  throw new Error("Local backup failed. No credentials are printed.");
await writeFile(
  path.join(folder, "latest.json"),
  JSON.stringify({ file, createdAt: new Date().toISOString() }),
  { mode: 0o600 },
);
console.log(
  "Local development snapshot saved in ignored .local/backups. Production requires encrypted backups and point-in-time recovery.",
);
