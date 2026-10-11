import { useEffect, useState, type FormEvent } from "react";

import { Link, useParams } from "react-router-dom";

import { api, useData } from "./api";

import { useAuth } from "./auth";

import {
  Header,
  Card,
  Badge,
  Empty,
  Loading,
  ErrorState,
  Button,
  Field,
  Alert,
  Meter,
  readable,
} from "./ui";

import type {
  Course,
  Dashboard,
  Subject,
  Topic,
  Progress,
  User,
} from "./types";

export function DashboardPage() {
  const { user } = useAuth();
  return user!.role === "STUDENT" ? (
    <StudentDashboard />
  ) : user!.role === "ADMIN" ? (
    <AdminOverview />
  ) : (
    <FacultyOverview />
  );
}

function StudentDashboard() {
  const { user } = useAuth();
  const q = useData<Dashboard>("/student/dashboard");
  if (q.loading) return <Loading />;
  if (q.error) return <ErrorState error={q.error} retry={q.refresh} />;
  const d = q.data!;
  return (
    <>
      <Header
        eyebrow="YOUR LEARNING SPACE"
        title={`Hello, ${user!.name.split(" ")[0]}`}
        description="A clear next step. A deeper understanding."
      />
      <div className="stats-grid">
        <Stat label="Enrolled courses" value={d.stats.enrolledCourses} />
        <Stat label="Completed topics" value={d.stats.completedTopics} />
        <Stat label="Assessed topics" value={d.stats.assessedTopics} />
      </div>
      <div className="dashboard-grid">
        <section>
          <div className="section-title">
            <h2>My courses</h2>
            <Link to="/courses">View courses ↗</Link>
          </div>
          {d.courses.length ? (
            <div className="card-stack">
              {d.courses.map((c) => (
                <CourseCard
                  key={c.course.id}
                  course={c.course}
                  topics={c.topics}
                />
              ))}
            </div>
          ) : (
            <Card>
              <Empty title="Your learning journey starts here">
                <p>
                  Your institution will enroll you in a course. Assigned courses
                  and their curriculum will appear here.
                </p>
              </Empty>
            </Card>
          )}
        </section>
        <section>
          <h2>Recommended next</h2>
          {d.recommendations.length ? (
            d.recommendations.map((r) => (
              <Card key={r.topicId} className="recommendation">
                <Badge>Personalized practice</Badge>
                <h3>{r.title}</h3>
                <p>{r.reason}</p>
                <Link className="text-action" to={`/topics/${r.topicId}`}>
                  {r.action} →
                </Link>
              </Card>
            ))
          ) : (
            <Card>
              <Empty title="No recommendation yet">
                <p>
                  {d.stats.publishedTopics
                    ? "Complete a topic quiz to build assessment evidence."
                    : "Your faculty’s reviewed learning activities will appear after publication."}
                </p>
              </Empty>
            </Card>
          )}
          <Card className="learning-note">
            <h3>Two views of progress</h3>
            <p>
              Completion tracks your learning checklist. Mastery estimates your
              quiz performance from distinct question families.
            </p>
          </Card>
        </section>
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <Card className="stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </Card>
  );
}

export function CourseCard({
  course,
  topics,
}: {
  course: Course;
  topics?: (Topic & { progress: Progress })[];
}) {
  return (
    <Card className="course-card">
      <div className="row spread">
        <Badge>{course.code}</Badge>
        <span className="muted">{course.term}</span>
      </div>
      <h3>{course.title}</h3>
      {course.status === "ARCHIVED" && <Badge>Archived · read-only</Badge>}
      {topics && topics.length > 0 ? (
        <Meter
          value={
            (topics.filter((t) => t.progress.completed).length /
              topics.length) *
            100
          }
          label="Topic completion"
        />
      ) : (
        <p className="muted">
          Official curriculum reference ·{" "}
          {course.publishedRevisionId
            ? "Learning activities published"
            : "Activities awaiting publication"}
        </p>
      )}
      <Link className="text-action" to={`/courses/${course.id}`}>
        Open curriculum →
      </Link>
    </Card>
  );
}

export function CoursesPage() {
  const q = useData<{ courses: Course[] }>("/courses");
  const { user } = useAuth();
  return (
    <>
      <Header
        eyebrow="CURRICULUM"
        title="My courses"
        description="Your assigned courses and their official syllabus."
      />
      {q.loading ? (
        <Loading />
      ) : q.error ? (
        <ErrorState error={q.error} retry={q.refresh} />
      ) : q.data!.courses.length ? (
        <div className="course-grid">
          {q.data!.courses.map((c) => (
            <div key={c.id}>
              <CourseCard course={c} />
              {user!.role !== "STUDENT" && (
                <div className="row card-links">
                  <Link to={`/faculty/courses/${c.id}`}>
                    Manage learning content
                  </Link>
                  <Link to={`/faculty/courses/${c.id}/students`}>
                    View students
                  </Link>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <Empty title="No assigned courses">
          <p>Your course administrator manages assignments and enrollment.</p>
        </Empty>
      )}
    </>
  );
}

export function CoursePage() {
  const { courseId } = useParams();
  const q = useData<{ course: Course; subjects: Subject[] }>(
      `/courses/${courseId}/curriculum`,
    ),
    t = useData<{ topics: Topic[] }>(`/courses/${courseId}/topics`);
  if (q.loading) return <Loading />;
  if (q.error) return <ErrorState error={q.error} retry={q.refresh} />;
  return (
    <>
      <Link className="breadcrumb" to="/courses">
        My courses /
      </Link>
      <Header
        eyebrow={q.data!.course.code}
        title={q.data!.course.title}
        description={q.data!.course.term}
      />
      {q.data!.course.status === "ARCHIVED" && (
        <div className="notice">
          Archived course: records remain readable; new activity is disabled.
        </div>
      )}
      <h2>Learning activities</h2>
      {t.loading ? (
        <Loading />
      ) : t.error ? (
        <ErrorState error={t.error} retry={t.refresh} />
      ) : t.data!.topics.length ? (
        <div className="course-grid">
          {t.data!.topics.map((topic) => (
            <Card key={topic.id}>
              <Badge>{topic.unitLabel}</Badge>
              <h3>{topic.title}</h3>
              <p>Learn · Visualize · Quiz · Code</p>
              <Link className="text-action" to={`/topics/${topic.id}`}>
                Explore topic →
              </Link>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <p>
            Faculty-reviewed learning activities have not been published yet.
            The official syllabus is available below.
          </p>
        </Card>
      )}
      <div className="section-title">
        <h2>Official curriculum</h2>
        <Badge>Pattern 2023</Badge>
      </div>
      {q.data!.subjects.map((s) => (
        <SubjectPanel
          key={s.id}
          subject={s}
          sourceLink={`/courses/${courseId}/subjects/${s.id}`}
        />
      ))}
    </>
  );
}

export function SubjectPanel({
  subject: s,
  sourceLink,
}: {
  subject: Subject;
  sourceLink?: string;
}) {
  return (
    <Card className="subject-panel">
      <div className="row spread">
        <div>
          <p className="eyebrow">
            {s.academicYear.label} ·{" "}
            {s.semester?.label ?? "Conditional exit pathway"}
          </p>
          <h3>
            {s.code} · {s.title}
          </h3>
        </div>
        <Badge>Syllabus reference</Badge>
      </div>
      <p className="source-note">
        {s.source.filename} · PDF pages {s.startPage}–{s.endPage}
      </p>
      {s.issues.length > 0 && (
        <details className="source-issues">
          <summary>Source notes ({s.issues.length})</summary>
          <ul>
            {s.issues.map((issue, i) => (
              <li key={i}>{issue}</li>
            ))}
          </ul>
        </details>
      )}
      {s.units?.length ? (
        s.units.map((u) => (
          <details key={u.id} className="unit">
            <summary>
              Unit {u.number} · {u.title}
              <span>Topics</span>
            </summary>
            {u.topics.map((t) => (
              <p className="topic-text" key={t.id}>
                {t.text}
              </p>
            ))}
            <small>PDF page(s): {u.sourcePages.join(", ")}</small>
          </details>
        ))
      ) : (
        <p>
          No numbered topic units were supplied. Laboratory/activity
          descriptions, where present, remain in the source details.
        </p>
      )}
      {sourceLink && (
        <Link to={sourceLink} className="text-action">
          Read source details →
        </Link>
      )}
    </Card>
  );
}

export function CurriculumPage() {
  const [year, setYear] = useState(""),
    [semester, setSemester] = useState(""),
    [search, setSearch] = useState("");
  const q = useData<{ subjects: Subject[]; total: number }>(
    `/curriculum?year=${year}&semester=${semester}&q=${encodeURIComponent(search)}`,
  );
  return (
    <>
      <Header
        eyebrow="OFFICIAL SOURCE CATALOG"
        title="Curriculum references"
        description="Four years. Eight semesters. Source-preserving syllabus records."
      />
      <div className="filter-row">
        <Field label="Academic year">
          <select
            value={year}
            onChange={(e) => {
              setYear(e.target.value);
              setSemester("");
            }}
          >
            <option value="">All years</option>
            {[1, 2, 3, 4].map((n) => (
              <option value={n} key={n}>
                Year {n}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Semester">
          <select
            value={semester}
            onChange={(e) => setSemester(e.target.value)}
          >
            <option value="">All semesters and exit pathways</option>
            {[1, 2, 3, 4, 5, 6, 7, 8]
              .filter((n) => !year || Math.ceil(n / 2) === Number(year))
              .map((n) => (
                <option key={n} value={n}>
                  Semester {n}
                </option>
              ))}
          </select>
        </Field>
        <Field label="Find subject">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Subject name or code"
          />
        </Field>
      </div>
      {q.loading ? (
        <Loading />
      ) : q.error ? (
        <ErrorState error={q.error} retry={q.refresh} />
      ) : (
        <>
          <p className="muted">
            {q.data!.total} subject references · elective alternatives are shown
            separately
          </p>
          <div className="course-grid">
            {q.data!.subjects.map((s) => (
              <Card key={s.id}>
                <p className="eyebrow">
                  {s.academicYear.label} · {s.semester?.label ?? "Exit pathway"}
                </p>
                <h3>{s.title}</h3>
                <Badge>{s.code}</Badge>
                <p className="source-note">
                  PDF pages {s.startPage}–{s.endPage}
                </p>
                <Link to={`/curriculum/${s.id}`} className="text-action">
                  Read reference →
                </Link>
              </Card>
            ))}
          </div>
          {!q.data!.total && (
            <Empty title="No matching subject">
              <p>Try a different name, year or semester.</p>
            </Empty>
          )}
        </>
      )}
    </>
  );
}

export function SubjectPage() {
  const { subjectId, courseId } = useParams();
  const q = useData<{ subject: Subject }>(
    courseId
      ? `/courses/${courseId}/subjects/${subjectId}`
      : `/curriculum/${subjectId}`,
  );
  if (q.loading) return <Loading />;
  if (q.error) return <ErrorState error={q.error} retry={q.refresh} />;
  const s = q.data!.subject;
  return (
    <>
      <Header
        title={s.title}
        description="Original source context, units and topic groups."
      />
      <SubjectPanel subject={s} />
      <h2>Source-page text</h2>
      <p className="muted">
        Extracted reference text can contain layout or glyph limitations. Check
        the original PDF before authoring assessments.
      </p>
      {s.sourceReferences?.map((ref) => (
        <details className="card" key={ref.sourcePage.number}>
          <summary>PDF page {ref.sourcePage.number}</summary>
          <pre className="source-text">{ref.sourcePage.text}</pre>
        </details>
      ))}
    </>
  );
}

export function ProgressPage() {
  const c = useData<{ courses: Course[] }>("/courses"),
    [selected, setSelected] = useState("");
  useEffect(() => {
    if (c.data?.courses.length && !selected) setSelected(c.data.courses[0]!.id);
  }, [c.data, selected]);
  const p = useData<{
    course: Course;
    topics: (Topic & { progress: Progress })[];
  }>(selected ? `/courses/${selected}/progress` : null);
  return (
    <>
      <Header
        eyebrow="YOUR PROGRESS"
        title="See how you’re learning"
        description="Completion and quiz mastery measure different things."
      />
      {c.error ? (
        <ErrorState error={c.error} retry={c.refresh} />
      ) : c.loading ? (
        <Loading />
      ) : !c.data!.courses.length ? (
        <Empty title="No course progress yet">
          <p>
            Progress becomes available after enrollment and published
            activities.
          </p>
        </Empty>
      ) : (
        <>
          <Field label="Course">
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
            >
              {c.data!.courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </Field>
          {p.loading ? (
            <Loading />
          ) : p.error ? (
            <ErrorState error={p.error} retry={p.refresh} />
          ) : p.data?.topics.length ? (
            p.data.topics.map((t) => (
              <Card key={t.id}>
                <div className="row spread">
                  <h3>
                    <Link to={`/topics/${t.id}`}>{t.title}</Link>
                  </h3>
                  <Badge>{readable(t.progress.state)}</Badge>
                </div>
                <div className="progress-details">
                  <p>
                    Lesson:{" "}
                    {t.progress.lessonAcknowledged ? "acknowledged" : "pending"}{" "}
                    · Quiz: {t.progress.quizSubmitted ? "submitted" : "pending"}{" "}
                    · Code: {t.progress.codingAccepted ? "accepted" : "pending"}
                  </p>
                  <p>
                    {t.progress.score === null
                      ? "Not enough evidence for a mastery estimate"
                      : `Estimated mastery: ${t.progress.score}%`}{" "}
                    · {t.progress.evidenceCount} distinct answered families
                  </p>
                  <strong>
                    {t.progress.completed
                      ? "Topic complete"
                      : "Learning checklist in progress"}
                  </strong>
                </div>
              </Card>
            ))
          ) : (
            <Empty title="No published activities">
              <p>Your curriculum references remain available in My courses.</p>
            </Empty>
          )}
        </>
      )}
    </>
  );
}

function FacultyOverview() {
  const q = useData<{ courses: Course[] }>("/courses");
  return (
    <>
      <Header
        eyebrow="TEACHING WORKSPACE"
        title="Faculty overview"
        description="Prepare reviewed content and understand student progress."
      />
      {q.loading ? (
        <Loading />
      ) : q.error ? (
        <ErrorState error={q.error} retry={q.refresh} />
      ) : (
        <>
          <div className="stats-grid">
            <Stat label="Assigned courses" value={q.data!.courses.length} />
            <Stat
              label="Published courses"
              value={
                q.data!.courses.filter((c) => c.publishedRevisionId).length
              }
            />
            <Stat
              label="Awaiting publication"
              value={
                q.data!.courses.filter((c) => !c.publishedRevisionId).length
              }
            />
          </div>
          <div className="course-grid">
            {q.data!.courses.map((c) => (
              <Card key={c.id}>
                <Badge>{c.code}</Badge>
                <h3>{c.title}</h3>
                <p>
                  {c.publishedRevisionId
                    ? "Published revision available"
                    : "Learning content awaiting publication"}
                </p>
                <div className="card-stack">
                  <Link className="text-action" to={`/faculty/courses/${c.id}`}>
                    Manage content →
                  </Link>
                  <Link to={`/faculty/courses/${c.id}/students`}>
                    View student progress →
                  </Link>
                </div>
              </Card>
            ))}
          </div>
          {!q.data!.courses.length && (
            <Empty title="No assigned courses">
              <p>
                An administrator must assign you to a course before you can
                author or view student records.
              </p>
            </Empty>
          )}
        </>
      )}
    </>
  );
}

function FacultySummary({ courseId }: { courseId: string }) {
  const q = useData<{
    enrolledStudents: number;
    topicSummaries: {
      topicId: string;
      title: string;
      completed: number;
      weak: number;
      insufficientEvidence: number;
    }[];
    attention: { user: User; weakTopics: number }[];
  }>(`/faculty/courses/${courseId}/analytics`);

  if (q.loading) return <Loading />;
  if (q.error) return <ErrorState error={q.error} retry={q.refresh} />;

  return (
    <div>
      <p>{q.data!.enrolledStudents} enrolled students</p>
      {q.data!.topicSummaries.map((t) => (
        <p key={t.topicId}>
          <strong>{t.title}</strong>: {t.completed} complete · {t.weak} weak ·{" "}
          {t.insufficientEvidence} awaiting evidence
        </p>
      ))}
      {q.data!.attention.length > 0 && (
        <>
          <h4>Students needing attention</h4>
          {q.data!.attention.map((s) => (
            <p key={s.user.id}>
              <Link to={`/faculty/courses/${courseId}/students/${s.user.id}`}>
                {s.user.name}
              </Link>{" "}
              · {s.weakTopics} weak topics
            </p>
          ))}
        </>
      )}
    </div>
  );
}

function AdminOverview() {
  const q = useData<{
    users: number;
    courses: number;
    sources: number;
    subjects: number;
    units: number;
  }>("/admin/overview");
  return (
    <>
      <Header
        eyebrow="PLATFORM ADMINISTRATION"
        title="Institution overview"
        description="Manage access, course assignments and verified curriculum sources."
      />
      {q.loading ? (
        <Loading />
      ) : q.error ? (
        <ErrorState error={q.error} retry={q.refresh} />
      ) : (
        <>
          <div className="stats-grid">
            <Stat label="Accounts" value={q.data!.users} />
            <Stat label="Courses" value={q.data!.courses} />
            <Stat label="Official PDF sources" value={q.data!.sources} />
          </div>
          <div className="course-grid">
            <Card>
              <h3>Manage access</h3>
              <p>Create invitations, assign faculty and enroll students.</p>
              <Link className="text-action" to="/admin/users">
                Manage accounts →
              </Link>
            </Card>
            <Card>
              <h3>Build course offerings</h3>
              <p>
                Connect institutional courses to official syllabus references.
              </p>
              <Link className="text-action" to="/admin/courses">
                Manage courses →
              </Link>
            </Card>
            <Card>
              <h3>Verified reference inventory</h3>
              <p>
                {q.data!.subjects} subjects · {q.data!.units} units. Missing
                details and code variants are preserved.
              </p>
              <Link className="text-action" to="/curriculum">
                Browse curriculum →
              </Link>
            </Card>
          </div>
        </>
      )}
    </>
  );
}

export function UsersPage() {
  const [page, setPage] = useState(1),
    q = useData<{ users: User[]; total: number }>(`/admin/users?page=${page}`),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const element = e.currentTarget,
      form = new FormData(element);
    setBusy(true);
    setError("");
    try {
      const r = await api<{ message: string }>("/admin/users", {
        name: form.get("name"),
        email: form.get("email"),
        role: form.get("role"),
      });
      setMessage(r.message);
      element.reset();
      q.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function act(user: User, invite = false) {
    if (
      !invite &&
      !window.confirm(
        `${user.status === "DEACTIVATED" ? "Reactivate" : "Deactivate"} ${user.name}? Deactivation immediately revokes sessions.`,
      )
    )
      return;
    setError("");
    try {
      if (invite) await api(`/admin/users/${user.id}/invitation`, {});
      else
        await api(
          `/admin/users/${user.id}`,
          { status: user.status === "DEACTIVATED" ? "ACTIVE" : "DEACTIVATED" },
          "PATCH",
        );
      setMessage(invite ? "Invitation delivered." : "Account status updated.");
      q.refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <>
      <Header
        title="User accounts"
        description="Institution-provisioned access with a single role per account."
      />
      {error && <Alert>{error}</Alert>}
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
      <Card>
        <h2>Invite a user</h2>
        <form className="inline-form" onSubmit={submit}>
          <Field label="Full name">
            <input name="name" required maxLength={100} />
          </Field>
          <Field label="Email">
            <input name="email" type="email" required />
          </Field>
          <Field label="Role">
            <select name="role">
              <option value="STUDENT">Student</option>
              <option value="FACULTY">Faculty</option>
              <option value="ADMIN">Administrator</option>
            </select>
          </Field>
          <Button disabled={busy}>Send invitation</Button>
        </form>
      </Card>
      {q.loading ? (
        <Loading />
      ) : q.error ? (
        <ErrorState error={q.error} retry={q.refresh} />
      ) : (
        <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {q.data!.users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td>{readable(u.role)}</td>
                    <td>
                      <Badge>{readable(u.status)}</Badge>
                    </td>
                    <td>
                      {u.status === "PENDING" ? (
                        <Button kind="secondary" onClick={() => act(u, true)}>
                          Resend invitation
                        </Button>
                      ) : (
                        <Button kind="secondary" onClick={() => act(u)}>
                          {u.status === "DEACTIVATED"
                            ? "Reactivate"
                            : "Deactivate"}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="row">
            <Button
              kind="secondary"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous page
            </Button>
            <span>Page {page}</span>
            <Button
              kind="secondary"
              disabled={page * 100 >= q.data!.total}
              onClick={() => setPage((p) => p + 1)}
            >
              Next page
            </Button>
          </div>
        </>
      )}
    </>
  );
}

export function AdminCoursesPage() {
  const q = useData<{ courses: Course[] }>("/courses"),
    subjects = useData<{ subjects: Subject[] }>("/curriculum"),
    [accountSearch, setAccountSearch] = useState(""),
    users = useData<{ users: User[]; total: number }>(
      `/admin/users?q=${encodeURIComponent(accountSearch)}`,
    ),
    [selected, setSelected] = useState(""),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    members = useData<{
      memberships: { id: string; memberRole: string; user: User }[];
    }>(selected ? `/admin/courses/${selected}/memberships` : null);
  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const element = e.currentTarget,
      f = new FormData(element);
    setBusy(true);
    setError("");
    try {
      await api("/admin/courses", {
        code: f.get("code"),
        title: f.get("title"),
        term: f.get("term"),
        subjectIds: f.getAll("subjectIds"),
      });
      element.reset();
      q.refresh();
      setMessage("Course created. Assign faculty and enroll students below.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function enroll(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget),
      u = users.data?.users.find((u) => u.id === f.get("userId"));
    if (!u) return;
    try {
      await api(`/admin/courses/${selected}/memberships`, {
        userId: u.id,
        memberRole: u.role,
      });
      setMessage(`${u.name} assigned to the course.`);
      members.refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function archive(c: Course) {
    if (
      !window.confirm(
        `${c.status === "ACTIVE" ? "Archive" : "Reactivate"} ${c.title}? Archived courses are read-only.`,
      )
    )
      return;
    try {
      await api(
        `/admin/courses/${c.id}`,
        { status: c.status === "ACTIVE" ? "ARCHIVED" : "ACTIVE" },
        "PATCH",
      );
      q.refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <>
      <Header
        title="Courses & enrollment"
        description="Create real course offerings and assign compatible existing accounts."
      />
      {error && <Alert>{error}</Alert>}
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
      <Card>
        <h2>Create course</h2>
        <form onSubmit={create} className="form-grid">
          <Field label="Course code">
            <input name="code" required maxLength={32} />
          </Field>
          <Field label="Title">
            <input name="title" required maxLength={150} />
          </Field>
          <Field label="Term">
            <input
              name="term"
              placeholder="e.g. Semester IV, 2026–27"
              required
            />
          </Field>
          <Field
            label="Official subjects"
            hint="Select references relevant to this course; electives are alternatives."
          >
            <select multiple name="subjectIds" required size={6}>
              {subjects.data?.subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code} · {s.title}
                </option>
              ))}
            </select>
          </Field>
          {subjects.error && (
            <ErrorState error={subjects.error} retry={subjects.refresh} />
          )}
          <Button disabled={busy || !subjects.data}>Create course</Button>
        </form>
      </Card>
      <Card>
        <h2>Assign faculty or enroll a student</h2>
        <form onSubmit={enroll} className="inline-form">
          <Field label="Course">
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              required
            >
              <option value="">Choose a course</option>
              {q.data?.courses
                .filter((c) => c.status === "ACTIVE")
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="Find account by name or email">
            <input
              value={accountSearch}
              onChange={(e) => setAccountSearch(e.target.value)}
              placeholder="Search all institutional accounts"
            />
          </Field>
          <Field label="Account">
            <select name="userId" required>
              <option value="">Choose an account</option>
              {users.data?.users
                .filter((u) => u.role !== "ADMIN" && u.status !== "DEACTIVATED")
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} · {readable(u.role)}
                  </option>
                ))}
            </select>
          </Field>
          <Button disabled={!selected || !users.data}>Assign to course</Button>
        </form>
        {users.error && (
          <ErrorState error={users.error} retry={users.refresh} />
        )}
        <p className="muted">
          Search accounts to find people beyond the first 100 matches.
        </p>
        {selected && (
          <>
            <h3>Current assignments</h3>
            {members.loading ? (
              <Loading />
            ) : members.error ? (
              <ErrorState error={members.error} retry={members.refresh} />
            ) : (
              members.data!.memberships.map((m) => (
                <div className="row spread" key={m.id}>
                  <p>
                    {m.user.name} · {readable(m.memberRole)}
                  </p>
                  <Button
                    kind="secondary"
                    onClick={async () => {
                      if (
                        !window.confirm(
                          `Remove ${m.user.name} from this course? Saved learning records will be retained.`,
                        )
                      )
                        return;
                      try {
                        await api(
                          `/admin/courses/${selected}/memberships/${m.id}`,
                          undefined,
                          "DELETE",
                        );
                        members.refresh();
                        setMessage("Assignment removed.");
                      } catch (e) {
                        setError((e as Error).message);
                      }
                    }}
                  >
                    Remove {m.user.name}
                  </Button>
                </div>
              ))
            )}
          </>
        )}
      </Card>
      {q.loading ? (
        <Loading />
      ) : q.error ? (
        <ErrorState error={q.error} retry={q.refresh} />
      ) : (
        <div className="course-grid">
          {q.data!.courses.map((c) => (
            <Card key={c.id}>
              <h3>{c.title}</h3>
              <p>
                {c.code} · {c.term}
              </p>
              <Badge>{readable(c.status)}</Badge>
              <div className="row">
                <Link to={`/courses/${c.id}`}>View curriculum</Link>
                <Button kind="secondary" onClick={() => archive(c)}>
                  {c.status === "ACTIVE" ? "Archive" : "Reactivate"}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

export function AuditPage() {
  const q = useData<{
    events: {
      id: string;
      action: string;
      entityType: string;
      createdAt: string;
      actor: { name: string } | null;
    }[];
  }>("/admin/audit-events");
  return (
    <>
      <Header
        title="Audit history"
        description="Latest 100 account, enrollment and publication changes."
      />
      {q.loading ? (
        <Loading />
      ) : q.error ? (
        <ErrorState error={q.error} retry={q.refresh} />
      ) : (
        q.data!.events.map((e) => (
          <Card key={e.id}>
            <div className="row spread">
              <strong>{readable(e.action)}</strong>
              <time>{new Date(e.createdAt).toLocaleString()}</time>
            </div>
            <p>
              {e.actor?.name ?? "System"} · {e.entityType}
            </p>
          </Card>
        ))
      )}
    </>
  );
}

export function HealthPage() {
  const q = useData<{
    database: string;
    executor: { available: boolean; details: unknown };
    queued: number;
    running: number;
    recentFailures: number;
    api: {
      recentP95Ms: number | null;
      requestsSinceStart: number;
      serverErrorsSinceStart: number;
    };
  }>("/admin/health");
  return (
    <>
      <Header
        title="Service health"
        description="Live database and worker status."
        action={
          <Button kind="secondary" onClick={q.refresh}>
            Refresh status
          </Button>
        }
      />
      {q.loading ? (
        <Loading />
      ) : q.error ? (
        <ErrorState error={q.error} retry={q.refresh} />
      ) : (
        <>
          <div className="stats-grid">
            <Stat label="Database" value={q.data!.database} />
            <Stat label="Queued jobs" value={q.data!.queued} />
            <Stat label="Running jobs" value={q.data!.running} />
          </div>
          <Card>
            <h2>API monitoring</h2>
            <p>
              {q.data!.api.requestsSinceStart} requests ·{" "}
              {q.data!.api.serverErrorsSinceStart} server errors since process
              start
            </p>
            <p>
              Recent request p95:{" "}
              {q.data!.api.recentP95Ms === null
                ? "Awaiting samples"
                : `${q.data!.api.recentP95Ms} ms`}
              . This reflects recent requests, not a load-test certification.
            </p>
          </Card>
          <Card>
            <h2>Secure executor</h2>
            <Badge>
              {q.data!.executor.available ? "Available" : "Unavailable"}
            </Badge>
            <p>
              The worker must verify configured toolchains and connect to an
              isolated, network-restricted Judge0 host.
            </p>
            <p>
              Infrastructure failures in last five minutes:{" "}
              {q.data!.recentFailures}
            </p>
          </Card>
        </>
      )}
    </>
  );
}

export function AccountPage() {
  const { user, logout } = useAuth(),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    try {
      await api(
        "/me/password",
        {
          currentPassword: f.get("currentPassword"),
          password: f.get("password"),
        },
        "PATCH",
      );
      window.dispatchEvent(new Event("session-expired"));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Header
        title="Your account"
        description="Manage your sign-in security."
      />
      <Card>
        <h2>{user!.name}</h2>
        <p>{user!.email}</p>
        <Badge>{readable(user!.role)}</Badge>
      </Card>
      <Card>
        <h2>Change password</h2>
        {error && <Alert>{error}</Alert>}
        <form onSubmit={submit} className="narrow-form">
          <Field label="Current password">
            <input
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              required
            />
          </Field>
          <Field
            label="New password"
            hint="At least 12 characters. This revokes your current sessions."
          >
            <input
              name="password"
              type="password"
              minLength={12}
              maxLength={128}
              autoComplete="new-password"
              required
            />
          </Field>
          <Button disabled={busy}>Update password</Button>
        </form>
      </Card>
      <Card>
        <h2>Accessibility</h2>
        <p>
          Animations follow your device’s reduced-motion setting. All learning
          controls also work without playback.
        </p>
        <Button kind="secondary" onClick={() => void logout()}>
          Sign out
        </Button>
      </Card>
    </>
  );
}
