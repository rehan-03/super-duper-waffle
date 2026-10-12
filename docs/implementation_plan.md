# AlgoLearn implementation plan

## Inspection and source decisions

The initial PBL1 directory contains only `prd.md` and four official syllabus PDFs. The architecture is embedded in the PRD. There was no separate technical blueprint, UI design file, application, database schema, or package manifest. This plan and `ui_ux_design.md` record a practical baseline before implementation; they are not evidence of prior user approval of unspecified details.

The PRD remains authoritative. Implement a modular Express application, React frontend, PostgreSQL, Prisma, and a separate execution worker with isolated Judge0. Never execute student code in the API process. Use patched stable Prisma 6.19.3, verified with Node 24; do not adopt registry release candidates. Lock dependency versions and validate Node 24 compatibility.

### Decisions and unresolved source issues

- Administrators provision courses, users, faculty assignments and enrollment; faculty author content for assigned courses. The PRD faculty flow saying “create course/enroll” conflicts with its administrative API. Use the narrower permission model until explicitly amended.
- Official syllabus records and published learning activities are different entities. A curriculum reference is not an available quiz, coding problem, or visualizer. No generated question banks or invented progress will be seeded.
- Preserve the detail-heading code `23014010` and report scheme aliases `2301410` and older `2301411`. Do not silently choose a new canonical code.
- SY Data Structures companion fields conflict with actual course headings. Democracy content provides three units while evaluation references five. Foreign Language has no detailed topics. Four exit-pathway entries have scheme-only descriptions. Preserve gaps.
- Published learning revisions will be immutable. Progress and execution records must include the course revision; add durable lesson acknowledgments so progress can be rebuilt. Draft keys will include course scope. These clarify omissions in the PRD schema.
- “Sufficiently assessed” prerequisite behavior and whether blank quiz responses count toward the ten answered-family evidence floor use explicit engineering defaults in implementation_decisions.md; faculty confirmation remains a pilot gate.
- The six MVP algorithm activities remain the complete release scope. Full syllabus import does not expand that release to all subjects or electives.

Implementation now covers the functional application slices. Reviewed launch content, live Judge0, operational deployment and release gates remain pending; see README and release_checklist.md.

## Milestones and dependencies

| Milestone     | Deliverable                                                                                                                                                                                               | Depends on                                 | Exit gate                                                                                                             |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| 1: Foundation | Workspace, migration, official source import, activation/login/logout/reset, cookie sessions, CSRF, role boundaries, student dashboard, course curriculum browsing, working account/course administration | Source audit, local PostgreSQL             | Real DB integration tests; login and enrolled-course journey in browser; responsive layouts; no mocked dashboard data |
| 2: Learning   | Immutable course/content publication, six reviewed lessons and deterministic visualizers, acknowledgments                                                                                                 | 1; faculty content review                  | Input boundary and trace invariant tests; all controls, transcript and reduced motion; refresh-safe acknowledgments   |
| 3: Assessment | 120 reviewed MCQs, 10-item quizzes, autosave, grading, history, reproducible mastery, explained recommendations, faculty reports                                                                          | 2; resolve evidence/prerequisite decisions | Rule fixtures, idempotency, concurrent saves, no answer leaks, accessible quiz journey                                |
| 4: Coding     | Monaco, per-language drafts, durable jobs/worker, private Judge0, samples and hidden tests, 12 reviewed problems                                                                                          | 1 and 2; validated isolated host           | All four languages; sandbox abuse tests; retry/recovery; hidden data never exposed; 90-second terminal outcomes       |
| 5: Release    | Full content validation, load/security/a11y gates, backup/restore, faculty onboarding                                                                                                                     | 1–4                                        | Every P0/P1 PRD criterion passes; ten-student usability pilot                                                         |

Complete one tested vertical slice before beginning the next. Do not expose controls for unimplemented actions. Continue through all milestones as requested; report external infrastructure/content-review blockers honestly instead of simulating success.

## Structure

`apps/web`: React routing, accessible UI primitives, role shells, feature pages and HTTP client. `apps/api`: validated configuration, Prisma data layer, authentication, curriculum, dashboard and administration routes. `apps/api/prisma`: schema and checked-in migrations. `apps/api/data`: source-preserving curriculum seed. `scripts`: local development provisioning only. `tests`: real API/database and browser tests. `docs`: design, API contracts and source audit. The worker lives in `apps/api/src/worker.ts` and runs independently with its own deployment command.

## Foundation database

All IDs are UUIDs. Users have one role and active/pending/deactivated status; emails are lowercase and unique. Session and activation/reset tokens are random, hashed at rest, expiring and revocable. Auth token consumption and password/session updates are transactional.

Curriculum source stores filename, SHA-256 and PDF page count; source pages retain extracted text. Subject records include pattern/year/nullable semester/pathway, observed code, source page range and issues. Unit number and source page references are preserved. Topic text stores source paragraph groups without invented learning objectives. Course-to-subject links connect institutional offerings to official references. Membership is unique per course/user and role-compatible. Audit records cover user, course and enrollment mutations. No learning scores exist until assessment source events exist.

Indexes: session token hash unique and user/expiry; token hash unique and user/purpose/expiry; subject year/semester and source/code unique; unit subject/number unique; topic unit/position unique; membership user and unique course/user; audit timestamp. Publication/version and assessment/execution tables are added with their corresponding vertical slice, not unused placeholders.

## Authentication and API contracts

JSON under `/api/v1`; shared origin via the Vite development proxy. Authenticated mutations require `X-CSRF-Token` matching the hashed session token's CSRF secret and a configured Origin. Anonymous auth mutations require exact Origin validation; no cross-origin credentials are allowed. Production uses HTTPS, Secure/HttpOnly/SameSite cookies, Helmet and generic errors. Argon2id hashes passwords. No open registration or browser-controlled roles.

| Route                                 | Request / response                                                                   | Access                                    |
| ------------------------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------- |
| `POST /auth/login`                    | `{email,password}` → `{user,csrfToken}` + rotated cookie                             | Public; rate limited; exact Origin        |
| `POST /auth/activate`                 | `{token,password}` → activated user                                                  | Public; single-use; exact Origin          |
| `POST /auth/password-reset`           | `{email}` → generic acknowledgment                                                   | Public; rate limited                      |
| `POST /auth/password-reset/confirm`   | `{token,password}` → acknowledgment, all sessions revoked                            | Public; single-use                        |
| `POST /auth/logout`                   | empty → 204; revoke session                                                          | Session + CSRF                            |
| `GET /me`                             | `{user,csrfToken}`                                                                   | Session; no-store                         |
| `PATCH /me/password`                  | `{currentPassword,password}` → acknowledgment; revoke sessions                       | Session + CSRF                            |
| `GET /student/dashboard`              | actual enrolled courses; completion/mastery explicitly unavailable before activities | Student                                   |
| `GET /courses`                        | accessible courses                                                                   | Assigned faculty, enrolled student, admin |
| `GET /courses/:id/curriculum`         | subject/unit/topic text with PDF provenance                                          | Course membership/admin                   |
| `GET /curriculum`                     | paginated reference inventory                                                        | Faculty/admin                             |
| `GET /curriculum/:id`                 | subject units and source text                                                        | Faculty/admin                             |
| `GET/POST /admin/users`               | list or `{email,name,role}`; issue activation                                        | Admin; mutation CSRF                      |
| `PATCH /admin/users/:id`              | `{status}` → changed user; revokes deactivated sessions                              | Admin; CSRF; self-deactivation rejected   |
| `GET/POST /admin/courses`             | list or `{code,title,term,subjectIds}`                                               | Admin; mutation CSRF                      |
| `POST /admin/courses/:id/memberships` | `{userId,memberRole}` → idempotent membership                                        | Admin; CSRF                               |
| `GET /admin/audit-events`             | newest 100 events; no secrets                                                        | Admin                                     |
| `GET /health`                         | database connectivity only, no configuration                                         | Public                                    |

Errors: `{code,message,fieldErrors?,requestId}` with 400/401/403/404/409/422/429/503. Lists are bounded. Validate UUIDs, enums and body length. Authorization is repeated server-side on every course lookup. Emails, passwords, tokens and connection strings never enter request logs.

## Testing and deployment

Unit checks cover validation and token hashing. Integration tests use a separate real PostgreSQL test database: activation consumption, login, reset/revocation, CSRF, session expiry, inactive accounts, role denial, enrollment isolation, curriculum integrity and administrative audit. Browser tests exercise actual HTTP/database flows with fixtures created in that test database; API responses are not intercepted. Check keyboard navigation, 375px overflow and reduced motion. Build/typecheck both apps.

The local bootstrap can create a dedicated PostgreSQL cluster on loopback port 55432 using installed Windows binaries; it does not modify an existing PostgreSQL service. Development mail is available through a loopback-only browser preview that does not disclose storage paths. Production requires authenticated SMTP with a verified sender and HTTPS; never deploy development delivery mode. Docker Compose provides an alternative PostgreSQL environment. Production uses migration deploy, managed PostgreSQL, separate API/worker/executor environments, redacted monitoring, reviewed backups and secret provisioning. Production readiness remains the release milestone.
