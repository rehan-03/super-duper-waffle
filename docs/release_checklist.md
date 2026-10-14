# Release checklist

The syllabus-wide release is not ready. Passing platform checks does not close missing content, source review or external infrastructure gates. Exact results are in verification_report.md; draft and simulation counts are in content_coverage.md.

| Gate                            | Current evidence / remaining work                                                                                                                                                        |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Preservation                    | Backups and unchanged development-record fingerprints; populated old-schema migration compatibility test passes                                                                          |
| Reference import                | Four hashes/229 page counts; 89 subjects/303 units retained; 25 extraction-difference pages and complete formula/diagram/lab audit unresolved                                            |
| Topic and activity model        | Independent stable keys, optional visualizers, source mappings, activity completion, explicit blockers and legacy compatibility implemented/tested                                       |
| Review/publication              | Saved-version identity/time, material-edit invalidation, validation preview, immutable snapshots and prerequisites/source checks implemented/tested; actual institutional review pending |
| Content                         | 12 complete supplemental modules, 391 incomplete drafts and 2 missing-source drafts; full explicit subtopic and assessment authoring remains incomplete                                  |
| Assessments                     | 220 original draft questions and 20 coding specifications with 3 samples/5 hidden cases; remaining topic-specific assessment banks unfinished                                            |
| Simulations                     | 17 implemented traces; additional explicit named algorithms remain unsupported and inventoried                                                                                           |
| Student/faculty/admin workflows | Real browser/API/database tests cover learning, blocked activities, review studio, coverage, enrollment/account/archive/audit, autosave and recovery                                     |
| Security                        | Role/ownership/origins/CSRF/sessions, immutable revisions, hidden-case protection and concurrent saves verified with local fixtures                                                      |
| Build and checks                | Lint/types/unit/integration/build pass; final development/production frontend browser evidence in verification report                                                                    |
| Isolated execution              | Fixture contract checks pass; live provider/toolchains/abuse/isolation verification required before availability is enabled                                                              |
| Mail and deployment             | Real SMTP inbox delivery, containers, remote CI, TLS/proxy, monitoring, encrypted PITR/restore/load verification still external                                                          |
| Institutional pilot             | Faculty/content approval, student usability pilot and retention policy required                                                                                                          |

Do not publish incomplete drafts, claim unsupported simulations are available, infer external practical completion, or fabricate scores/reviews/execution results to satisfy these gates.
