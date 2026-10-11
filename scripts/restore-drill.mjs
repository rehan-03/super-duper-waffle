import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
const root = fileURLToPath(new URL("../", import.meta.url)),
  folder = path.resolve(root, ".local/backups");
const text = await readFile(path.join(root, ".env"), "utf8"),
  url = new URL(text.match(/^DATABASE_URL=(.+)$/m)?.[1]?.trim() ?? "");
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
    throw new Error(`${tool} failed during the isolated restore drill.`);
  return result.stdout;
};
const started = performance.now();
let created = false;
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
  console.log(
    JSON.stringify({
      restoreDrill: "passed",
      ...counts,
      elapsedSeconds: Math.round((performance.now() - started) / 1000),
    }),
  );
} finally {
  if (created) run("dropdb", [database]);
}
