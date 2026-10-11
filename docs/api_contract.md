# API contract notes

`openapi.json` enumerates all 57 implemented operations, authentication/role metadata, path/query/header inputs, mutation bodies, key response schemas and errors. JSON is served under `/api/v1` via the same origin. Topic/problem IDs resolve course scope on the server; redundant course IDs in illustrative PRD paths were simplified without relaxing authorization.

Mutations require exact configured `Origin`; authenticated mutations also require `X-CSRF-Token` from `/me`. Cookies are HttpOnly/SameSite=Lax, Secure in production, expire after 24 hours, and are revocable. Anonymous activation/reset links are single-use. Errors use `{code,message,fieldErrors?,requestId?}`; validators return 422, conflicts 409, infrastructure 503. Maximum JSON body is 2 MiB; source/input/output fields also enforce UTF-8 byte limits. Lists are bounded and private responses are no-store.

## Report/envelope extensions

| GET endpoint                               | Response fields                                                                                                                                                                                        |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/student/dashboard`                       | `courses`: course plus current published topics and derived progress; `recommendations`: topicId/title/reason/action/courseId; `stats`: enrolledCourses/publishedTopics/completedTopics/assessedTopics |
| `/courses/:id/progress`                    | `course`, `topics`: current published course topics with `progress`                                                                                                                                    |
| `/courses/:id/recommendations`             | `recommendations`: up to three topicId/title/reason/action entries, prioritized by prerequisite, evidence and curriculum order                                                                         |
| `/courses/:id/topics`                      | `topics`: id/key/title/unitLabel/position/prerequisiteKeys summaries                                                                                                                                   |
| `/topics/:id/quiz-history`                 | `attempts`: own latest 100 id/status/score/submittedAt/createdAt                                                                                                                                       |
| `/problems/:id/submissions`                | `submissions`: own latest 100 id/language/mode/status/verdict/passedCount/totalCount/createdAt                                                                                                         |
| `/faculty/courses/:id/revisions`           | `revisions`: number/status/createdAt/publishedAt plus lesson topics, questions including reviewed keys, problems including reviewed test cases; assigned staff only                                    |
| `/faculty/courses/:id/students?page=1`     | `total`, `page`, `course`, `students`: up to 100 user/course/current topics with derived progress                                                                                                      |
| `/faculty/courses/:id/students/:studentId` | `user`, `course`, `topics`, latest 100 `attempts` and latest 100 `submissions`; enrollment and faculty assignment required                                                                             |
| `/faculty/courses/:id/analytics`           | `enrolledStudents`, `topicSummaries`: topicId/title/completed/weak/insufficientEvidence; `attention`: up to ten users with weakTopics/insufficientTopics                                               |
| `/admin/overview`                          | actual users/courses/sources/subjects/units counts                                                                                                                                                     |
| `/admin/users?page=1&q=`                   | total/page/users, up to 100 matching name/email records                                                                                                                                                |
| `/admin/courses/:id/memberships`           | memberships: id/memberRole/public user fields                                                                                                                                                          |
| `/admin/audit-events`                      | newest 100 events with actor name; no credentials/content                                                                                                                                              |
| `/admin/health`                            | database, executor availability/details, queued/running/recentFailures, rolling process API metrics                                                                                                    |
| `/coding/config`                           | available, four language keys, unavailable/check-service message; no host credentials                                                                                                                  |

Subject details additionally return their source filename/hash, year/semester, units/topic text groups and source-page references with extracted text. Staff browse the global reference catalog; students access only assigned course subjects. Source issues are retained verbatim as audit notes; unnumbered lab/activity descriptions remain page text.

## Mutation envelopes

Account activation returns `{user}`; reset/change returns `{message}`; logout/removal returns 204. Admin invitation returns `{user,message}`, status updates `{user}`, course creation/archive `{course}`, assignment `{membership}`. Faculty draft creation/publishing returns `{revision}`, lesson changes `{topic}`, question changes `{question}`, problem changes `{problem}`, ordering `{message}`. Lesson acknowledgment returns progress directly. Quiz create/resume returns `{attemptId}`, answer saving `{version}`, final grading `{attemptId,score,progress}`. Draft saving returns `{version}`. Execution returns 202 `{submissionId,status,pollAfterMs:2000}`.

Answer keys/explanations are omitted until the attempt is completed. Hidden execution cases are exactly `{position,hidden:true,verdict}`. They never include input, expected output, stdout, diagnostics, time, memory or Judge0 tokens. Public cases include permitted output/diagnostics/time/memory. Infrastructure failures remain separate from wrong answers.

Create/resume and grade serialize by student/topic. Draft version conflicts require explicit resolution. Execution UUID idempotency keys bind the complete request and cannot be reused for changed content. Published content/reparent operations are guarded in PostgreSQL. Archived courses reject writes while retained records remain readable to currently authorized users.

Prisma relation fields may extend non-secret curriculum/course/report objects. Application clients should use the documented fields rather than depend on undocumented extensions. Production OpenAPI should further tighten report schemas as client contracts stabilize; that does not authorize expanding exposed sensitive fields.

## Public student registration

`POST /auth/signup` accepts only `{name,email}` (trimmed name, 2–100 characters; valid normalized email, maximum 254 characters). It requires the configured Origin and has no session/CSRF requirement. It creates only a pending STUDENT with no password or enrollment. All valid new/existing addresses receive the same 202 `{message,delivery}` response, where delivery is `development-outbox` or `email` according to server mail configuration. Pending students receive a fresh 24-hour single-use activation link; active/deactivated/staff accounts are untouched. Delivery failures are redacted; retry signup to resend. `/auth/activate` verifies the link and sets the password before login. Public signup/activation/recovery share a 20-request/IP/15-minute limiter (200 in isolated tests).
