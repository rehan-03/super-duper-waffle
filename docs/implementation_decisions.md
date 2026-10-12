# Implementation decisions

The PRD is authoritative. The following clarify its missing decisions and are explicit engineering defaults, not silently invented syllabus requirements.

- Blank quiz responses are incorrect in quiz and rolling-score denominators; only nonblank latest-family responses count toward the ten answered-family evidence floor. Repeated/revised families contribute their latest response, including a newer blank. Insufficient evidence has no displayed mastery percentage and uses the diagnostic mix.
- A prerequisite is sufficiently assessed for an advancement recommendation when its estimate is mastered (at least 80%, with ten answered families). Exploration stays unrestricted. These policy interpretations should be confirmed by the faculty product owner before the pilot.
- Progress is scoped to a published course revision. New revisions start new topic evidence; historical attempts and immutable problem/source snapshots remain readable. No silent mastery carryover.
- Official year/semester/subject/unit/topic text and PDF provenance are reference records. Course offerings, faculty content revisions and learner activity are separate. Learning topics link to assigned official subjects and optional units, with validated PDF page ranges.
- Administrators manage enrollment/course provisioning; faculty author only assigned courses. This resolves the PRD's conflicting faculty flow using its narrower role/API permissions.
- Prisma 6.19.3 is selected as the patched stable compatibility target after dependency auditing. The React/Express/PostgreSQL/Prisma architecture is unchanged; registry release candidates are not used. Node 24 and the actual migrated schema/client are tested together.
- Source glyph limitations and contradictory course codes require human review against original PDFs. No missing source material, scores, learners or assessed question banks are invented by curriculum seeding.
- The secure worker requires configured deployed toolchain IDs, confirmed isolated-host/network restrictions and a current healthy heartbeat. Without those, execution returns an explicit unavailable response; no local process fallback runs user code.
- Local invitation/reset delivery uses an explicitly development-only, loopback-only browser preview without exposing storage paths. Production validates HTTPS, secure-cookie, authenticated SMTP and verified-sender configuration, then verifies the SMTP connection before listening. Institutional content review, live sandbox abuse tests and operational release gates remain mandatory.

## User-requested authentication amendment

The user explicitly requested public sign-up/login options after the original institution-provisioned account requirement. Public registration is now supported for students only. A new record is pending and has no password until its single-use activation link verifies email ownership and sets a password. Faculty/admin accounts and all course enrollment remain administrator-managed. Existing accounts are never overwritten; duplicate registration returns the same generic accepted response, and a pending student can request a fresh activation link. Registration is rate limited and audited, with no invented learning activity. The original PRD is preserved; this amendment records the later instruction.
