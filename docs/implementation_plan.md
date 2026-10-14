# AlgoLearn implementation plan and current status

The revised `prd.md` defines syllabus-wide intent. This document separates the implemented platform changes from unfinished authoring, additional simulations and external release gates. Earlier six-algorithm MVP scope no longer defines the requested work.

## Implemented platform changes

- Additive topic migrations preserve keys, publications, memberships and learner evidence. Historical rows retain LEGACY_V1 completion; new revisions use declared activities. Reviewer identity/time, content versions, optional simulation links, source mappings and authoring status extend the existing model.
- Topic requirements support lesson, quiz, coding and external practical activities. Completion requires each declared activity, with explicit blockers preventing completion. Theory quiz mastery is not applicable; provider failures remain separate from incorrect solutions.
- Faculty content routes are separated into `content-router.ts`, access into `topic-access.ts`, draft import into `draft-import.ts`, validation into `content-validation.ts`, and authored content into library/supplemental modules. The existing React/Express/PostgreSQL and worker boundaries remain.
- Faculty can preview/import assigned-source drafts, validate without publishing, record saved-version review, edit with version conflicts, reorder across pages and publish only complete reviewed requirements with valid sources/prerequisites. PostgreSQL invalidates reviews on material and test changes and protects published content.
- Student activity tabs reflect availability. Course topics and faculty sequences are paginated. Faculty/admin coverage displays actual source mappings and incomplete/source-blocked drafts. Administrative enrollment remains explicit; local review shelves have no institutional memberships.
- Preserve the original 13 traces; add quick, shell, radix and heap sort with deterministic steps and existing accessible controls. Inventory identifies explicit named algorithms lacking a simulation.

## Source and content progress

Four original checksums and 229 page counts are rechecked. Retain 89 subjects, 303 units, code conflicts, electives, exit alternatives and original page text. A geometry-based inventory contains 465 reference groups/activities, including 386 computing entries and 147 extracted lab rows. Twenty-five pages differ from a new text extraction; formulas, diagrams and lab continuations require further audit.

The library contains 405 drafts: 12 complete supplemental modules, 391 incomplete drafts and two missing-source drafts. Complete modules contain 220 original draft questions and 20 coding specifications with four-language starters and 3 sample/5 hidden cases each. They are not faculty-approved. Complete supplemental modules do not certify full source-group coverage. The remaining explicit topics and assessments must be authored rather than marked complete by a generic generator.

## Remaining work in required order

1. Resolve every source-group/subtopic and cross-page lab continuation, preserving the missing Graphic Designing/Video Editing details and other source ambiguities. Complete formula/diagram inspection.
2. Finish original topic-specific explanations, examples, misconceptions and assessments for each computing topic. Distinguish unsupported external practical infrastructure from incomplete authoring.
3. Implement the remaining explicit algorithm simulations listed in `content_coverage.md`, with appropriate input contracts and invariant/browser tests. Never expose unsupported links as simulations.
4. Obtain actual faculty review and publication for complete modules. Automated import/testing supplies neither.
5. Configure/verify SMTP, live isolated execution, institutional deployment, sandbox abuse/load tests, retention policy and usability pilot.

## Verification

Baseline backup and uncommitted changes were captured before migration. Tests use the isolated algolearn_test database. A migration test reconstructs the old schema with populated immutable snapshots, memberships, acknowledgments, attempts, drafts and submissions, applies new migrations and verifies their preservation. Local before/after fingerprints confirm existing development accounts, memberships and evidence are unchanged by upgrade/import. No progress or approvals are seeded.

See `verification_report.md` for exact completed checks and local service URLs. Passing platform tests is not evidence that all syllabus content or production infrastructure is ready.
