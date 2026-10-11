# PRD release evidence

| Gate                 | Evidence/status                                                                                              |
| -------------------- | ------------------------------------------------------------------------------------------------------------ |
| Official import      | 4 PDFs, 229 pages, 89 subjects, 303 units; repeatability/provenance/constraints locally verified             |
| Accounts/permissions | Real API/DB lifecycle, CSRF, role/course/peer, archive/removal tests and role browser journeys               |
| Visualizers          | Six deterministic traces, boundaries and browser controls tested; faculty trace review pending               |
| Assessment           | Real quiz autosave/resume/grade and rule-window/evidence tests; reviewed launch bank pending                 |
| Content snapshots    | Publication validation and database immutability/reparent guards implemented                                 |
| Editor               | Four independent languages autosave/switch/reload through real Monaco and PostgreSQL                         |
| Live execution       | Queue/HTTP worker contracts verified; blocked until isolated Judge0 is configured and verified               |
| Launch content       | Pending 6 reviewed lessons, 120 MCQs and 12 problems; no fabricated production seed                          |
| Accessibility        | Sign-in/role automated WCAG, mobile/reduced-motion checks; manual learning-page/screen-reader review pending |
| Monitoring           | Redacted logs, rolling API samples, DB/queue/worker health implemented; external collection/alerts pending   |
| Backups              | Local isolated restore verified; production encryption/PITR/timed restore pending                            |
| Containers/CI        | Prepared; execution in target environment pending                                                            |
| Retention            | Institution policy/course-end decision and purge implementation pending                                      |
| Performance          | Batched progress implemented; 100-active-user load targets not yet certified                                 |
| Security/pilot       | Live sandbox abuse tests, deployment review and ten-student pilot pending                                    |

Local verification on 2026-10-11 after the public student signup amendment: 5 unit tests, 20 API/database/domain/worker tests and 8 browser tests passed (33 total); type checks and production build passed. The new registration journey includes real pending-account creation, private activation delivery, password setup, login and an empty unenrolled student dashboard. Duplicate/concurrent signup, immutable existing accounts, staff-role rejection and mobile signup accessibility are covered. SMTP delivery still requires target-environment verification.

This checklist is not a production release declaration. Record dated evidence before every gate is marked complete. Graphs, trees, AI, SSO/LMS, multi-file projects and SaaS tenancy remain future scope.
