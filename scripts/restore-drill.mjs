import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import dotenv from "dotenv";
const root = fileURLToPath(new URL("../", import.meta.url)),
  folder = path.resolve(root, ".local/backups");
dotenv.config({ path: path.join(root, ".env"), quiet: true });
const url = new URL(process.env.DATABASE_URL ?? "");
if (
  url.hostname !== "127.0.0.1" ||
  url.port !== "55432" ||
  url.pathname !== "/algolearn"
)
  throw new Error(
    "Restore drills run only on the dedicated local development cluster.",
  );
const latest = JSON.parse(
    await readFile(path.join(folder, "latest.json"), "utf8"),
  ),
  file = path.resolve(latest.file);
if (
  path.dirname(file) !== folder ||
  !/^algolearn-\d+\.dump$/.test(path.basename(file))
)
  throw new Error("Invalid local backup path.");
const bin =
    process.env.POSTGRES_BIN ?? "C:\\Program Files\\PostgreSQL\\16\\bin",
  database = `algolearn_restore_${Date.now()}`;
const env = {
  ...process.env,
  PGHOST: url.hostname,
  PGPORT: url.port,
  PGUSER: decodeURIComponent(url.username),
  PGPASSWORD: decodeURIComponent(url.password),
};
const run = (tool, args) => {
  const result = spawnSync(
    path.join(bin, `${tool}${process.platform === "win32" ? ".exe" : ""}`),
    args,
    {
      windowsHide: true,
      encoding: "utf8",
      env,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  if (result.status !== 0)
    throw new Error(
      `${tool} failed during the isolated restore drill (${result.error?.code ?? result.status}): ${result.stderr?.replaceAll(decodeURIComponent(url.password), "[redacted]") ?? "No diagnostic output."}`,
    );
  return result.stdout;
};
const started = performance.now();
let created = false;
let restoredCounts;
try {
  run("createdb", [database]);
  created = true;
  run("pg_restore", [
    "--no-owner",
    "--no-privileges",
    "--dbname",
    database,
    file,
  ]);
  const query = `SELECT json_build_object('sources',(SELECT count(*) FROM "CurriculumSource"),'subjects',(SELECT count(*) FROM "Subject"),'units',(SELECT count(*) FROM "CurriculumUnit"),'migrations',(SELECT count(*) FROM "_prisma_migrations" WHERE finished_at IS NOT NULL))`;
  const counts = JSON.parse(
    run("psql", [
      "--dbname",
      database,
      "--tuples-only",
      "--no-align",
      "--command",
      query,
    ]),
  );
  if (counts.sources !== 4 || counts.subjects !== 89 || counts.units !== 303)
    throw new Error(
      "Restored curriculum did not match its expected verified inventory.",
    );
  restoredCounts = counts;
} finally {
  if (created)
    run("psql", [
      "--dbname",
      "postgres",
      "--set",
      "ON_ERROR_STOP=1",
      "--command",
      `DROP DATABASE "${database}"`,
    ]);
}
console.log(
  JSON.stringify({
    restoreDrill: "passed",
    ...restoredCounts,
    elapsedSeconds: Math.round((performance.now() - started) / 1000),
  }),
);
