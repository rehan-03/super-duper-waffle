# AlgoLearn

Curriculum-integrated adaptive learning, saved in `C:\vs code\PBL1`. The original `prd.md` and four PDFs in `Syllabus/` are preserved. See `docs/implementation_decisions.md`, `docs/ui_ux_design.md`, `docs/curriculum_source_audit.md`, `docs/openapi.json` and `docs/release_checklist.md`.

## What works

- Student sign-up and login, email activation/reset, institution-provisioned faculty/admin accounts, secure cookie sessions, CSRF, role and course ownership checks.
- Curriculum browser: four years, eight semesters, 89 subject references, 303 units/source paragraph groups, 229 PDF pages. Imports preserve provenance and ambiguity notes and are repeatable.
- Student dashboard, lesson acknowledgment, separate completion/mastery, recommendations and course progress.
- Six deterministic visualizers with play/pause, next/previous/reset, speed, input validation, pseudocode and transcripts.
- Faculty lesson/question/problem authoring, ordered prerequisites, publication validation, immutable revisions and cleared review flags on revision copies.
- Adaptive ten-question quizzes, versioned autosave, server grading, resume, history and reproducible weakness detection.
- Locally bundled Monaco for C/C++/Java/Python, independent drafts, two-second autosave, conflict resolution and submission history.
- Durable execution queue, private Judge0 adapter, worker leases/deadlines/idempotency/recovery and hidden-test filtering. **Live execution remains disabled because no isolated Judge0 host is set up.** No local fallback executes user code.
- Faculty topic/student reports; admin invitations, full-account search, enrollment/removal, archive, audit and real service health.
- Responsive role layouts, Motion animations, reduced motion, keyboard navigation, accessible controls, loading/error/retry states and page recovery.

Curriculum seeding never creates quizzes, problems, scores, learners or progress. Development learning data starts empty. Test fixtures belong only to `algolearn_test`. Faculty must author/review the six lessons, 120 questions and 12 problems required for launch.

## Stack and structure

React/TypeScript, Vite, Tailwind CSS, Motion, React Router, Monaco; Node 24 LTS, Express 5, Zod, Argon2id; PostgreSQL 16 with Prisma 6.19.3. One modular API and a separate Node worker share PostgreSQL-backed jobs. Vitest, real-database/API tests and Playwright validate the application.

```text
apps/web/src/          Role routes, UI primitives and learning/editor pages
apps/api/src/          Auth, curriculum, assessment, progress, execution and worker
apps/api/prisma/       Schema and three checked-in migrations
apps/api/data/         Source-preserving curriculum catalog
packages/shared/src/  Deterministic traces and adaptive rules
scripts/              Local database, isolated tests, backup/restore
tests/                Unit and browser checks
docs/                 Design, source audit, contracts and release evidence
Syllabus/             Unchanged official PDFs
```

## Local setup

Requirements: Node.js 24 LTS, npm and PostgreSQL binaries. Default: `C:\Program Files\PostgreSQL\16\bin`; set `POSTGRES_BIN` for another location. Use an institution-approved maintained patch release for deployment.

Run from `C:\vs code\PBL1`:

```powershell
npm.cmd ci
npm.cmd run setup:local
npm.cmd run db:generate
npm.cmd run db:migrate
npm.cmd run db:seed
npm.cmd run bootstrap:admin
npm.cmd run dev
```

Open **http://localhost:5173**. API: loopback port 4000. Run `npm.cmd run worker` in a second terminal. With no executor it records an unavailable heartbeat and executes nothing.

Local setup initializes only `.local/postgres` on `127.0.0.1:55432`, generates random credentials in ignored `.env`, and creates `algolearn` and `algolearn_test`. It does not change or stop the existing Windows PostgreSQL service. Repeat to restart this cluster; `npm.cmd run db:stop` stops only this cluster. `.env`, `.local`, tokens, code and database dumps must never be committed.

Manual setup: copy `.env.example`, supply database URLs, then generate/migrate/seed. Docker alternative: privately configure `POSTGRES_PASSWORD`, run `docker compose up -d`, and create the isolated test database separately. Stop the dedicated native cluster first if Docker uses the same port.

## First administrator and real content

Students can open **http://localhost:5173/signup** (also linked from Log in), enter their full name and email, then open the activation link and choose a password of at least 12 characters. Registration creates only a pending student account, with no password, enrollment, quizzes or progress. Repeat sign-up with the same email to request a fresh link; existing active accounts must log in or reset their password. Public sign-up never grants staff roles or changes an existing account's details.

In local development, activation messages go to private `.local/outbox` JSON files **instead of an email inbox**. Open the `url` in the message addressed to your own email; do not share or commit these files. Production requires configured SMTP. Links expire after 24 hours and are single-use. Once activated, a new student sees an empty dashboard until an administrator enrolls them.

Bootstrap creates a pending administrator at `BOOTSTRAP_ADMIN_EMAIL` (default `admin@algolearn.local`) with no default password. Development mail is delivered as private JSON files in ignored `.local/outbox`. Open the `url` in the message addressed to your administrator, set your own password and sign in. Tokens use URL fragments and are not printed in server logs. Activation links expire after 24 hours; repeat bootstrap to resend a pending administrator's invitation.

Admin invites actual users, creates a course linked to official subjects, assigns faculty and enrolls students. Assigned faculty creates a draft, maps lessons to supplied subject/unit/PDF pages, authors and reviews content, sets order/prerequisites and publishes. Each topic needs 6 easy/7 medium/7 hard reviewed questions and two reviewed problems with three samples/five hidden tests. Edits create immutable revisions; historical activity retains its original content.

Electives and conditional exit pathways are reference alternatives, not automatically assigned course loads. Check the source audit before resolving contradictory codes or using extracted text for assessment authoring.

## Secure execution

Leave `JUDGE0_URL` unset and `JUDGE0_ISOLATION_VERIFIED=false` until a dedicated patched Linux host is verified. Configure a private URL/token and a JSON `JUDGE0_LANGUAGES` map with `c`, `cpp`, `java`, `python` IDs from the deployed `/languages`. Keep credentials in private environment/secret storage. The browser never calls Judge0.

Verify host network/metadata/application-data isolation and abuse limits before enabling the flag. A healthy worker heartbeat and correct toolchain inventory are also required. Enable `JAVA_LIMITS_CALIBRATED=true` only after actual calibration.

Limits: source/output 64 KiB, input 16 KiB, CPU 2 seconds, wall 10 seconds, memory 256 MiB, files 1 MiB; calibrated Java CPU 5 seconds/memory 512 MiB. Two outstanding requests/five per minute per student, queue 100, global concurrency 10, deadline 90 seconds. Ambiguous creation fails without blind resubmission. Hidden outputs/diagnostics are discarded; responses show only hidden case number/verdict.

## Verification

```powershell
npm.cmd run typecheck
npm.cmd test
npx.cmd playwright install chromium
npm.cmd run test:e2e
npm.cmd run build
npm.cmd audit --audit-level=high
```

Tests automatically migrate/seed the isolated `algolearn_test` database, then create test-only content/users. They reject a test URL targeting development. Never point tests at institutional data. API tests clear test account/course records; browser fixtures remain in that isolated database for debugging.

Coverage: import repeatability/provenance/constraints; all six traces; mastery evidence/windows/boundaries; RBAC/CSRF/account lifecycle; archive/removal; publication immutability; quizzes/draft conflicts; hidden results; worker idempotency/retries/deadlines/lease recovery; real role journeys; four-language editor autosave/restore; mobile reflow and automated WCAG checks.

Worker contract tests use a loopback HTTP fixture that **does not compile or execute code**. They prove adapter/queue behavior, not live compilation or isolation. Automated accessibility tests do not replace manual screen-reader/keyboard review.

## Backup and deployment

```powershell
node scripts/backup-local.mjs
node scripts/restore-drill.mjs
```

Local backups go into ignored `.local/backups`. The drill restores into a newly created temporary database, verifies source counts, and removes only that temporary database. It does not modify development or the existing service. Local snapshots do not certify production encryption or point-in-time recovery.

Dockerfiles, restrictive Nginx configuration and CI are prepared; container builds/remote CI have not run here. `docs/deployment.md` covers HTTPS, SMTP, secrets, private networks, migration rollout, monitoring and operational gates.

## Remaining release requirements

Verified Judge0/live four-language and abuse tests; reviewed six-topic content; target container/CI deployment; institutional retention/course-end decision and scheduled purging; encrypted backups/PITR and timed production restore; 100-active-user load test; manual accessibility/security checks and ten-student pilot. These gates remain open; this is not a production-ready declaration.
