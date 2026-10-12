# PRD release evidence

| Gate                 | Evidence/status                                                                                              |
| -------------------- | ------------------------------------------------------------------------------------------------------------ |
| Official import      | 4 PDFs, 229 pages, 89 subjects, 303 units; repeatability/provenance/constraints locally verified             |
| Accounts/permissions | Real API/DB lifecycle, CSRF, role/course/peer, archive/removal and repeatable development provisioning tests |
| Visualizers          | Six deterministic traces, boundaries and browser controls tested; faculty trace review pending               |
| Assessment           | Real quiz autosave/resume/grade and rule-window/evidence tests; reviewed launch bank pending                 |
| Content snapshots    | Publication validation and database immutability/reparent guards implemented                                 |
| Editor               | Four independent languages autosave/switch/reload through real Monaco and PostgreSQL                         |
| Live execution       | Queue/HTTP worker contracts verified; blocked until isolated Judge0 is configured and verified               |
| Launch content       | Pending 6 reviewed lessons, 120 MCQs and 12 problems; no fabricated production seed                          |
| Accessibility        | Sign-in/role-dashboard automated WCAG; keyboard visualizer, mobile/reduced-motion checks; manual learning-page/screen-reader review pending |
| Monitoring           | Redacted logs, rolling API samples, DB/queue/worker health implemented; external collection/alerts pending   |
| Backups              | Local isolated restore verified; production encryption/PITR/timed restore pending                            |
| Containers/CI        | Prepared; execution in target environment pending                                                            |
| Retention            | Institution policy/course-end decision and purge implementation pending                                      |
| Performance          | Batched progress implemented; 100-active-user load targets not yet certified                                 |
| Security/pilot       | Live sandbox abuse tests, deployment review and ten-student pilot pending                                    |

Local verification on 2026-10-12: 9 unit tests, 24 API/database/domain/worker tests and 11 development browser tests passed (44 total). The compiled production browser suite also passed its 10 applicable tests, with the development-only filesystem test skipped. Lint, type checks, production build, dependency audit, migrations, the idempotent official syllabus import and development semester-course provisioning passed. Browser coverage includes registration/activation/login, role dashboards, enrollment and curriculum access, course objectives/prerequisites/progress, quiz mastery evidence, visualizer keyboard controls, coding drafts in four languages, faculty workflows, admin curriculum/users/audit/health, account motion preference and mobile layouts. Automated WCAG checks cover sign-in and all role dashboards. SMTP delivery still requires target-environment credentials and inbox verification.

This checklist is not a production release declaration. Record dated evidence before every gate is marked complete. Graphs, trees, AI, SSO/LMS, multi-file projects and SaaS tenancy remain future scope.
