import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const local = path.join(root, ".local");
const data = path.join(local, "postgres");
const envFile = path.join(root, ".env");
const bin =
  process.env.POSTGRES_BIN || "C:\\Program Files\\PostgreSQL\\16\\bin";
const exe = (name) =>
  path.join(bin, `${name}${process.platform === "win32" ? ".exe" : ""}`);
if (!existsSync(exe("initdb")))
  throw new Error(
    "Set POSTGRES_BIN to installed PostgreSQL binaries. Docker Compose is another documented option.",
  );
await mkdir(local, { recursive: true });
function run(name, args, extraEnv = {}) {
  const result = spawnSync(exe(name), args, {
    cwd: root,
    windowsHide: true,
    encoding: "utf8",
    stdio: name === "pg_ctl" ? "ignore" : "pipe",
    env: { ...process.env, ...extraEnv },
  });
  if (result.status !== 0)
    throw new Error(`${name} failed. ${result.stderr || result.stdout}`);
  return result.stdout;
}
if (!existsSync(envFile)) {
  const password = randomBytes(32).toString("hex");
  const content = `NODE_ENV=development\nPORT=4000\nAPP_ORIGIN=http://localhost:5173\nDATABASE_URL=postgresql://algolearn:${password}@127.0.0.1:55432/algolearn\nTEST_DATABASE_URL=postgresql://algolearn:${password}@127.0.0.1:55432/algolearn_test\nCOOKIE_SECURE=false\nMAIL_MODE=filesystem\nBOOTSTRAP_ADMIN_EMAIL=admin@algolearn.local\n`;
  await writeFile(envFile, content, { mode: 0o600 });
}
const envText = await readFile(envFile, "utf8");
const match = envText.match(/^DATABASE_URL=(.+)$/m);
if (!match) throw new Error("DATABASE_URL is missing.");
const url = new URL(match[1].trim());
if (
  url.hostname !== "127.0.0.1" ||
  url.port !== "55432" ||
  url.username !== "algolearn"
)
  throw new Error(
    "Local setup operates only on its dedicated loopback port 55432 and algolearn role. Existing database configuration was not modified.",
  );
const pwfile = path.join(local, "init-password.tmp");
if (!existsSync(path.join(data, "PG_VERSION"))) {
  await writeFile(pwfile, decodeURIComponent(url.password) + "\n", {
    mode: 0o600,
  });
  try {
    run("initdb", [
      "-D",
      data,
      "-U",
      "algolearn",
      "--auth=scram-sha-256",
      "--encoding=UTF8",
      "--locale=C",
      "--pwfile",
      pwfile,
    ]);
  } finally {
    await unlink(pwfile).catch(() => {});
  }
  await writeFile(
    path.join(data, "postgresql.auto.conf"),
    "listen_addresses = '127.0.0.1'\nport = 55432\n",
    { mode: 0o600 },
  );
}
const status = spawnSync(exe("pg_ctl"), ["-D", data, "status"], {
  windowsHide: true,
  encoding: "utf8",
});
if (status.status !== 0)
  run("pg_ctl", [
    "-D",
    data,
    "-l",
    path.join(local, "postgres.log"),
    "-w",
    "start",
  ]);
const connection = [
  "-h",
  "127.0.0.1",
  "-p",
  "55432",
  "-U",
  "algolearn",
  "-d",
  "postgres",
  "-v",
  "ON_ERROR_STOP=1",
];
for (const name of ["algolearn", "algolearn_test"]) {
  const present = run(
    "psql",
    [
      ...connection,
      "-tAc",
      `SELECT 1 FROM pg_database WHERE datname='${name}'`,
    ],
    { PGPASSWORD: decodeURIComponent(url.password) },
  ).trim();
  if (!present)
    run("psql", [...connection, "-c", `CREATE DATABASE ${name}`], {
      PGPASSWORD: decodeURIComponent(url.password),
    });
}
console.log(
  "Dedicated PostgreSQL cluster ready on 127.0.0.1:55432. Existing service untouched. Local credentials remain in ignored .env.",
);
