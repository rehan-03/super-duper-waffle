# Deployment and operations

Use one API plus a separate worker and private PostgreSQL. Only the worker network can reach private Judge0. Sandboxes cannot reach application data, metadata or public networks. No database credentials are passed to Judge0.

```mermaid
flowchart LR
  Browser -->|HTTPS| Edge["TLS edge / Nginx frontend"]
  Edge -->|same-origin /api| API["Express API"]
  API --> DB[("Private PostgreSQL")]
  Worker["Execution worker"] --> DB
  Worker -->|private authenticated API| Judge["Dedicated Judge0"]
  Judge --> Sandbox["Restricted sandboxes"]
  API --> Metrics["Redacted metrics / logs"]
  Worker --> Metrics
  DB --> Backup["Encrypted backup + PITR"]
```

## Rollout

Build API/worker from the root Dockerfile and frontend with `docker build -f apps/web/Dockerfile .`. The root `migrations` target retains the migration tool; runtime runs as the Node user. Worker command: `node apps/api/dist/worker.js`. Local production application builds and compiled browser workflows are verified; container builds remain unverified because the local Docker daemon is unavailable.

Provide private PostgreSQL/SMTP settings, `NODE_ENV=production`, HTTPS `APP_ORIGIN`, `COOKIE_SECURE=true`, `MAIL_MODE=smtp`. Bind API to `0.0.0.0` only inside a restricted container network. Nginx expects the service `api:4000`; terminate TLS at the edge. Set only the actual trusted proxy-hop count; default is zero. Nginx replaces forwarded IP headers. Verify client-IP handling with the chosen edge.

## Email delivery

Provision an authenticated SMTP account with the institution or a transactional provider. Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, and a provider-verified `MAIL_FROM`. Use `SMTP_SECURE=false` for provider-documented STARTTLS (normally port 587), or `SMTP_SECURE=true` for implicit TLS (normally port 465). Store the username/password in the platform secret manager and rotate them according to institutional policy; never bake them into images or commit them.

Production configuration rejects filesystem delivery, insecure cookies, non-HTTPS origins, missing SMTP credentials, and the development `.local` sender. API startup verifies the SMTP connection before opening its HTTP listener. Treat a failed verification as a deployment failure and inspect provider/network logs without printing credentials. After deployment, send activation and reset messages to controlled real inboxes, verify spam/domain authentication behavior (SPF, DKIM and DMARC), expiry and single use, then remove the test accounts.

Development/test uses a loopback-only preview at `/dev/mail-preview`; it sends no external mail. The API rejects that mode when `HOST` or `APP_ORIGIN` is non-loopback, and the preview endpoint also checks the requesting socket is loopback. Never expose a development process through a tunnel or reverse proxy.

Run reviewed migrations before rollout. Import verified PDFs/catalog in a separate trusted seed/bootstrap job for a fresh institutional database. Runtime startup does not create accounts/content. Retain the previous application image, use additive/backward-compatible migrations and preserve published snapshots during rollback.

CI uses lockfile installs, linting, builds, type checks, database/browser tests and dependency auditing with read-only repository permissions. Pin reviewed action/image digests before institutional rollout. Remote CI and container execution are pending. Official guidance: [checkout](https://github.com/actions/checkout), [Node setup](https://github.com/actions/setup-node).

## Monitoring

Structured request logs contain method, route template, opaque request ID, status and elapsed time. Bodies, query strings, code, passwords, tokens, emails and connection URLs are excluded. Admin health reports recent process p95/counts, database connectivity, queue/running counts and infrastructure failures. Worker heartbeats report connection/toolchain failures without credentials.

Set external alerts for sustained 5xx/save failures, API p95 >=500 ms, acknowledgment p95 >=1 second, queue depth/age, stale worker, executor failures, disk and database health. Process-local p95 is not a certified load-test result. Current rate-limit storage assumes one API instance; add shared/edge limiting before horizontal scaling.

## Backup and retention

Production requires encrypted storage/backups, least-privilege identities, nightly snapshots and WAL/PITR with RPO <=1 hour. Demonstrate RTO <=4 hours with timed isolated staging restores. The local restore drill validates development recovery only.

PRD retention defaults: learning records 12 months after course end, raw code/output 90 days, audit events 180 days. The PRD omits a canonical course-end timestamp and explicitly requires institutional policy confirmation. Confirm those decisions before implementing/enabling scheduled purge/anonymization. Never infer course-end dates from term labels. Retention implementation remains an open release gate; no destructive scheduler is enabled.

## Live executor gate

Record deployed version/patch level, language inventory and enforced CPU/memory/process/file/network settings. Test all four compilers, correct/incorrect solutions, compiler errors, loops, processes, memory/output exhaustion, network/metadata and unauthorized files. Test worker termination during creation/polling, expired leases, overload and host outages. Jobs must settle within 90 seconds, without duplicate uncertain execution. Inspect actual responses/logs for hidden-test secrecy.

## Additive syllabus upgrade

Capture an encrypted institutional backup before deploying the additive topic/review migrations. The local migration compatibility suite reconstructs the old schema with populated published records and verifies retained memberships, acknowledgments, attempts, drafts and submissions after upgrading. Review metadata is never backfilled with invented actors. Historical topic keys and completion rules are retained.

The runtime image must include `apps/api/data/coverage.json` as well as the official curriculum catalog; compiled draft modules read it at startup. Local `db:seed:drafts` is forbidden in production. In institutional deployment, assigned faculty import selected source-aligned drafts into an existing revision, review them, resolve authoring/source gaps and explicitly publish. Missing SMTP, live executor isolation and institutional review remain deployment gates.
