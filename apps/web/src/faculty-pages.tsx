import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { algorithms, algorithmKeys } from "@algolearn/shared";
import { api, useData } from "./api";
import {
  Alert,
  Badge,
  Button,
  Card,
  Empty,
  ErrorState,
  Field,
  Header,
  Loading,
  readable,
} from "./ui";
import type {
  Course,
  Progress,
  Revision,
  Subject,
  Topic,
  User,
  Question,
  AuthorProblem,
} from "./types";
function ReviewButton({
  kind,
  item,
  refresh,
}: {
  kind: string;
  item: {
    id: string;
    version: number;
    reviewed: boolean;
    reviewerId: string | null;
    reviewedAt: string | null;
  };
  refresh: () => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function review() {
    setBusy(true);
    setError("");
    try {
      await api(`/faculty/${kind}/${item.id}/review`, {
        version: item.version,
        approved: !item.reviewed,
      });
      refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <p>
        {item.reviewed
          ? `Reviewed ${item.reviewedAt ? new Date(item.reviewedAt).toLocaleString() : "(historical metadata unavailable)"} by ${item.reviewerId ?? "historical reviewer"}`
          : `Unreviewed saved version ${item.version}`}
      </p>
      {error && <Alert>{error}</Alert>}
      <Button type="button" kind="secondary" disabled={busy} onClick={review}>
        {item.reviewed ? "Revoke review" : "Approve saved content"}
      </Button>
      <p className="muted">
        Review applies to the saved version. Save any form changes first.
      </p>
    </div>
  );
}
function ValidationPanel({ revisionId }: { revisionId: string }) {
  const [result, setResult] = useState<{
      valid: boolean;
      errors: string[];
    } | null>(null),
    [error, setError] = useState("");
  async function validate() {
    try {
      setResult(await api(`/faculty/revisions/${revisionId}/validation`));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <Card>
      <h2>Publication readiness</h2>
      <Button kind="secondary" onClick={validate}>
        Validate draft without publishing
      </Button>
      {error && <Alert>{error}</Alert>}
      {result && (
        <>
          <p role="status">
            {result.valid
              ? "Validation passed. Faculty publication is still required."
              : `${result.errors.length} issues require attention.`}
          </p>
          <ul>
            {result.errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}
function DraftLibrary({
  courseId,
  revisionId,
  refresh,
}: {
  courseId: string;
  revisionId: string;
  refresh: () => void;
}) {
  const [page, setPage] = useState(1),
    [selected, setSelected] = useState<string[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const q = useData<{
    total: number;
    drafts: {
      key: string;
      title: string;
      lesson: string;
      authoringStatus: string;
      requiredActivities: string[];
      questions: unknown[];
      problems: unknown[];
    }[];
  }>(`/faculty/courses/${courseId}/draft-library?page=${page}`);
  async function importSelected() {
    setBusy(true);
    setError("");
    try {
      const result = await api<{
        message: string;
        imported: number;
        skipped: number;
      }>(`/faculty/revisions/${revisionId}/import-drafts`, { keys: selected });
      setMessage(
        `${result.imported} imported, ${result.skipped} already present. ${result.message}`,
      );
      setSelected([]);
      refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card>
      <details>
        <summary>Original draft library for assigned subjects</summary>
        <p>
          Imported material is unreviewed. Incomplete source groups remain
          blocked from publication until topic-specific authoring and
          assessments are finished.
        </p>
        {error && <Alert>{error}</Alert>}
        {message && <p role="status">{message}</p>}
        {q.loading ? (
          <Loading />
        ) : q.error ? (
          <ErrorState error={q.error} retry={q.refresh} />
        ) : (
          <>
            <p>
              {q.data!.total} drafts · Page {page}
            </p>
            <div className="row">
              <Button
                kind="secondary"
                disabled={page === 1}
                onClick={() => {
                  setPage((p) => p - 1);
                  setSelected([]);
                }}
              >
                Previous drafts
              </Button>
              <Button
                kind="secondary"
                disabled={page * 50 >= q.data!.total}
                onClick={() => {
                  setPage((p) => p + 1);
                  setSelected([]);
                }}
              >
                Next drafts
              </Button>
            </div>
            {q.data!.drafts.map((d) => (
              <div key={d.key}>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={selected.includes(d.key)}
                    onChange={(e) =>
                      setSelected((s) =>
                        e.target.checked
                          ? [...s, d.key]
                          : s.filter((k) => k !== d.key),
                      )
                    }
                  />
                  {d.title} · {readable(d.authoringStatus)} ·{" "}
                  {d.questions.length} questions / {d.problems.length} problems
                </label>
                <details>
                  <summary>Preview {d.title}</summary>
                  <p className="lesson-text">{d.lesson}</p>
                </details>
              </div>
            ))}
            <Button
              disabled={busy || !selected.length}
              onClick={importSelected}
            >
              Import selected drafts
            </Button>
          </>
        )}
      </details>
    </Card>
  );
}
export function ContentPage() {
  const { courseId } = useParams(),
    [page, setPage] = useState(1),
    q = useData<{ revisions: Revision[] }>(
      `/faculty/courses/${courseId}/revisions?page=${page}`,
    ),
    curriculum = useData<{ course: Course; subjects: Subject[] }>(
      `/courses/${courseId}/curriculum`,
    ),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [selected, setSelected] = useState(""),
    [busy, setBusy] = useState(false);
  const draft = q.data?.revisions.find((r) => r.status === "DRAFT"),
    topic = draft?.topics.find((t) => t.id === selected);
  useEffect(() => {
    if (draft && !draft.topics.some((t) => t.id === selected))
      setSelected(draft.topics[0]?.id ?? "");
  }, [draft, selected]);
  async function create() {
    setBusy(true);
    setError("");
    try {
      await api(`/faculty/courses/${courseId}/revisions`, {});
      q.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function publish() {
    if (
      !draft ||
      !window.confirm(
        "Publish this reviewed revision? Its content becomes immutable and visible to enrolled students.",
      )
    )
      return;
    setBusy(true);
    setError("");
    try {
      await api(`/faculty/revisions/${draft.id}/publish`, {});
      setMessage(
        "Revision published. Historical attempts keep their original content.",
      );
      q.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function reorder(tid: string, direction: number) {
    if (!draft) return;
    try {
      await api(`/faculty/topics/${tid}/move`, {
        direction: direction < 0 ? "UP" : "DOWN",
      });
      q.refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <>
      <Link className="breadcrumb" to="/courses">
        My courses /
      </Link>
      <Header
        eyebrow="FACULTY CONTENT STUDIO"
        title={curriculum.data?.course.title ?? "Course learning content"}
        description="Author separately from the official syllabus. Review every lesson, question and test set."
        action={
          draft ? (
            <Button onClick={publish} disabled={busy}>
              Validate & publish
            </Button>
          ) : (
            <Button onClick={create} disabled={busy}>
              Create draft revision
            </Button>
          )
        }
      />
      {error && <Alert>{error}</Alert>}
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
      {q.loading || curriculum.loading ? (
        <Loading />
      ) : q.error ? (
        <ErrorState error={q.error} retry={q.refresh} />
      ) : curriculum.error ? (
        <ErrorState error={curriculum.error} retry={curriculum.refresh} />
      ) : draft ? (
        <>
          <div className="row">
            <Badge>Draft revision {draft.number}</Badge>
            <p>
              {draft._count.topics} learning topics · Page {page}
            </p>
          </div>
          <div className="row">
            <Button
              kind="secondary"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous topics
            </Button>
            <Button
              kind="secondary"
              disabled={page * 100 >= draft._count.topics}
              onClick={() => setPage((p) => p + 1)}
            >
              Next topics
            </Button>
          </div>
          <ValidationPanel revisionId={draft.id} />
          <DraftLibrary
            courseId={courseId!}
            revisionId={draft.id}
            refresh={q.refresh}
          />
          <div className="author-grid">
            <Card>
              <h2>Topic sequence</h2>
              {draft.topics.map((t, i) => (
                <div key={t.id} className="author-topic">
                  <button
                    onClick={() => setSelected(t.id)}
                    aria-current={selected === t.id ? "true" : undefined}
                  >
                    {t.title}
                    <small>
                      {t.questions.filter((q) => q.reviewed).length} reviewed
                      questions · {t.problems.filter((p) => p.reviewed).length}{" "}
                      reviewed problems
                    </small>
                  </button>
                  <div className="row">
                    <Button
                      kind="secondary"
                      disabled={page === 1 && i === 0}
                      onClick={() => reorder(t.id, -1)}
                    >
                      Move up
                    </Button>
                    <Button
                      kind="secondary"
                      disabled={(page - 1) * 100 + i + 1 >= draft._count.topics}
                      onClick={() => reorder(t.id, 1)}
                    >
                      Move down
                    </Button>
                  </div>
                </div>
              ))}
            </Card>
            <div>
              {topic && (
                <TopicEditor
                  key={topic.id}
                  topic={topic}
                  refresh={q.refresh}
                  subjects={curriculum.data?.subjects ?? []}
                  existingKeys={draft.topics.map((t) => t.key)}
                />
              )}
              <Card>
                <h2>Add learning topic</h2>
                <TopicForm
                  revisionId={draft.id}
                  existingKeys={draft.topics.map((t) => t.key)}
                  subjects={curriculum.data?.subjects ?? []}
                  onSaved={q.refresh}
                />
              </Card>
            </div>
          </div>
        </>
      ) : (
        <Card>
          <Empty title="Start with a reviewed learning sequence">
            <p>
              Create a draft, map objectives to your curriculum and add reviewed
              assessment content. Publication requires 6 easy, 7 medium, 7 hard
              questions when quizzes are required, and two complete problems
              when coding is required.
            </p>
          </Empty>
        </Card>
      )}
      {q.data?.revisions
        .filter((r) => r.status === "PUBLISHED")
        .map((r) => (
          <Card key={r.id}>
            <Badge>Published revision {r.number}</Badge>
            <p>{r.topics.map((t) => t.title).join(" · ")}</p>
            <p className="muted">
              Immutable snapshot. Create a new draft to revise it.
            </p>
          </Card>
        ))}
    </>
  );
}
function TopicForm({
  revisionId,
  topic,
  existingKeys = [],
  subjects,
  onSaved,
}: {
  revisionId?: string;
  topic?: Topic;
  existingKeys?: string[];
  subjects: Subject[];
  onSaved: () => void;
}) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [sourceId, setSourceId] = useState(
      topic?.sourceSubjectId ?? subjects[0]?.id ?? "",
    );
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      const body = {
        sourceSubjectId: f.get("sourceSubjectId"),
        sourceUnitId: f.get("sourceUnitId") || null,
        sourcePages: String(f.get("sourcePages"))
          .split(/[\s,]+/)
          .filter(Boolean)
          .map(Number),
        key: f.get("key"),
        title: f.get("title"),
        version: topic?.version,
        visualizerKey: f.get("visualizerKey") || null,
        requiredActivities: ["LESSON", ...f.getAll("activities")],
        blockedActivities: ["LESSON", "QUIZ", "CODING", "PRACTICAL"]
          .map((activity) => ({
            activity,
            reason: String(f.get(`blocked-${activity}`) ?? "").trim(),
          }))
          .filter((block) => block.reason),
        sourceTopicIds: String(f.get("sourceTopicIds") ?? "")
          .split(/[\s,]+/)
          .filter(Boolean),
        authoringStatus: f.get("authoringStatus"),
        coverageKeys: topic?.coverageKeys ?? [],
        unitLabel: f.get("unitLabel"),
        lesson: f.get("lesson"),
        objectives: String(f.get("objectives"))
          .split("\n")
          .map((v) => v.trim())
          .filter(Boolean),
        prerequisiteKeys: f.getAll("prerequisites"),
        reviewed: f.get("reviewed") === "on",
      };
      await api(
        topic
          ? `/faculty/topics/${topic.id}`
          : `/faculty/revisions/${revisionId}/topics`,
        body,
        topic ? "PATCH" : "POST",
      );
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="narrow-form">
      {error && <Alert>{error}</Alert>}
      <Field
        label="Learning topic key"
        hint="Stable lowercase letters, digits and hyphens; independent from a simulation."
      >
        <input
          name="key"
          defaultValue={topic?.key ?? ""}
          readOnly={!!topic}
          required
          pattern="[a-z0-9][a-z0-9-]{0,119}"
        />
      </Field>
      <Field label="Topic title">
        <input
          name="title"
          defaultValue={topic?.title ?? ""}
          required
          minLength={3}
          maxLength={200}
        />
      </Field>
      <Field label="Authoring coverage">
        <select
          name="authoringStatus"
          defaultValue={topic?.authoringStatus ?? "COMPLETE_DRAFT"}
        >
          <option value="INCOMPLETE">Incomplete authoring</option>
          <option value="SOURCE_BLOCKED">Missing or ambiguous source</option>
          <option value="COMPLETE_DRAFT">
            Complete draft, ready for human review
          </option>
        </select>
      </Field>
      <Field label="Optional visualization">
        <select name="visualizerKey" defaultValue={topic?.visualizerKey ?? ""}>
          <option value="">No supported simulation</option>
          {algorithmKeys.map((k) => (
            <option key={k} value={k}>
              {algorithms[k].title}
            </option>
          ))}
        </select>
      </Field>
      <fieldset>
        <legend>Required activities (lesson is always required)</legend>
        {["QUIZ", "CODING", "PRACTICAL"].map((a) => (
          <label className="check" key={a}>
            <input
              type="checkbox"
              name="activities"
              value={a}
              defaultChecked={topic?.requiredActivities.includes(a) ?? false}
            />
            {readable(a)}
          </label>
        ))}
      </fieldset>
      {["LESSON", "QUIZ", "CODING", "PRACTICAL"].map((activity) => (
        <Field
          key={activity}
          label={
            activity === "PRACTICAL"
              ? "External practical blocked reason"
              : `${readable(activity)} blocked reason`
          }
          hint={
            activity === "PRACTICAL"
              ? "Required for hardware, SQL, GPU, networking or external-tool activities. These cannot earn coding completion."
              : "Leave empty when this activity is available."
          }
        >
          <textarea
            name={`blocked-${activity}`}
            defaultValue={
              topic?.blockedActivities.find((b) => b.activity === activity)
                ?.reason ?? ""
            }
          />
        </Field>
      ))}
      <Field
        label="Source topic IDs"
        hint="Optional comma-separated source paragraph IDs from the selected official unit."
      >
        <input
          name="sourceTopicIds"
          defaultValue={topic?.sourceTopicIds.join(", ") ?? ""}
        />
      </Field>
      <Field label="Official subject">
        <select
          name="sourceSubjectId"
          required
          value={sourceId}
          onChange={(e) => setSourceId(e.target.value)}
        >
          <option value="">Select a source</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.code} · {s.title}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Official unit">
        <select
          name="sourceUnitId"
          defaultValue={topic?.sourceUnitId ?? ""}
          key={sourceId}
        >
          <option value="">No numbered unit / lab reference</option>
          {subjects
            .find((s) => s.id === sourceId)
            ?.units?.map((u) => (
              <option key={u.id} value={u.id}>
                Unit {u.number} · {u.title}
              </option>
            ))}
        </select>
      </Field>
      <Field
        label="PDF source pages"
        hint="Comma-separated PDF pages inside the supplied subject range."
      >
        <input
          name="sourcePages"
          key={`pages-${sourceId}`}
          defaultValue={
            topic?.sourceSubjectId === sourceId
              ? topic.sourcePages.join(", ")
              : (subjects.find((s) => s.id === sourceId)?.startPage ?? "")
          }
          required
        />
      </Field>
      <Field label="Curriculum unit / reference">
        <input
          name="unitLabel"
          defaultValue={topic?.unitLabel ?? ""}
          placeholder="Use the official subject and unit label"
          required
          maxLength={100}
        />
      </Field>
      <details>
        <summary>Assigned official references</summary>
        {subjects.map((s) => (
          <p key={s.id}>
            {s.code}: {s.title}, PDF pages {s.startPage}–{s.endPage}
          </p>
        ))}
      </details>
      <Field label="Learning objectives — one per line">
        <textarea
          name="objectives"
          defaultValue={topic?.objectives.join("\n") ?? ""}
          required
          rows={3}
        />
      </Field>
      <Field label="Lesson">
        <textarea
          name="lesson"
          defaultValue={topic?.lesson ?? ""}
          required
          minLength={30}
          rows={8}
        />
      </Field>
      <Field
        label="Recommended prerequisites"
        hint="These guide recommendations; they do not lock activities."
      >
        <select
          multiple
          name="prerequisites"
          defaultValue={topic?.prerequisiteKeys ?? []}
          size={3}
        >
          {[...new Set([...existingKeys, ...(topic?.prerequisiteKeys ?? [])])]
            .filter((k) => k !== topic?.key)
            .map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
        </select>
      </Field>
      <label className="check">
        <input
          type="checkbox"
          name="reviewed"
          defaultChecked={topic?.reviewed ?? false}
        />
        I have reviewed this lesson for accuracy and curriculum relevance.
      </label>
      <p className="muted">
        Changes clear approval. Save, preview, then record review of the saved
        version.
      </p>
      <Button disabled={busy}>Save lesson draft</Button>
    </form>
  );
}
function TopicEditor({
  topic,
  refresh,
  subjects,
  existingKeys,
}: {
  existingKeys: string[];
  topic: Revision["topics"][number];
  refresh: () => void;
  subjects: Subject[];
}) {
  const [tab, setTab] = useState("lesson"),
    [question, setQuestion] = useState<Question | undefined>(),
    [problem, setProblem] = useState<AuthorProblem | undefined>();
  return (
    <Card>
      <div className="row spread">
        <h2>{topic.title}</h2>
        <Link to={`/topics/${topic.id}`}>Preview topic</Link>
      </div>
      <ReviewButton kind="topics" item={topic} refresh={refresh} />
      <div className="tabs">
        {["lesson", "questions", "problems"].map((t) => (
          <button key={t} aria-pressed={tab === t} onClick={() => setTab(t)}>
            {readable(t)}
          </button>
        ))}
      </div>
      {tab === "lesson" ? (
        <TopicForm
          key={`${topic.id}-${topic.version}`}
          topic={topic}
          existingKeys={existingKeys}
          onSaved={refresh}
          subjects={subjects}
        />
      ) : tab === "questions" ? (
        <>
          <p>
            Review coverage:{" "}
            {["EASY", "MEDIUM", "HARD"]
              .map(
                (d) =>
                  `${d.toLowerCase()} ${topic.questions.filter((q) => q.difficulty === d && q.reviewed).length}`,
              )
              .join(" · ")}
          </p>
          {topic.questions.map((q) => (
            <button
              className="history-row"
              key={q.id}
              onClick={() => setQuestion(q)}
            >
              {q.prompt} · {readable(q.difficulty)} ·{" "}
              {q.reviewed ? "reviewed" : "draft"}
            </button>
          ))}
          <h3>{question ? "Edit question" : "Add question"}</h3>
          <QuestionForm
            key={question?.id ?? "new-question"}
            topicId={topic.id}
            question={question}
            onSaved={() => {
              setQuestion(undefined);
              refresh();
            }}
          />
          {question && (
            <Button kind="secondary" onClick={() => setQuestion(undefined)}>
              Add a different question
            </Button>
          )}
        </>
      ) : (
        <>
          {topic.problems.map((p) => (
            <button
              key={p.id}
              className="history-row"
              onClick={() => setProblem(p)}
            >
              {p.title} · {p.reviewed ? "reviewed" : "draft"}
            </button>
          ))}
          <h3>{problem ? "Edit coding problem" : "Add coding problem"}</h3>
          <ProblemForm
            key={problem?.id ?? "new-problem"}
            topicId={topic.id}
            problem={problem}
            onSaved={() => {
              setProblem(undefined);
              refresh();
            }}
          />
          {problem && (
            <Button kind="secondary" onClick={() => setProblem(undefined)}>
              Add a different problem
            </Button>
          )}
        </>
      )}
    </Card>
  );
}
function QuestionForm({
  topicId,
  question,
  onSaved,
}: {
  topicId: string;
  question?: Question;
  onSaved: () => void;
}) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const element = e.currentTarget,
      f = new FormData(element);
    setBusy(true);
    try {
      const b = {
        version: question?.version,
        objective: f.get("objective"),
        difficulty: f.get("difficulty"),
        prompt: f.get("prompt"),
        options: String(f.get("options"))
          .split("\n")
          .map((v) => v.trim())
          .filter(Boolean),
        correctOption: Number(f.get("correctOption")) - 1,
        explanation: f.get("explanation"),
        reviewed: f.get("reviewed") === "on",
      };
      await api(
        question
          ? `/faculty/questions/${question.id}`
          : `/faculty/topics/${topicId}/questions`,
        b,
        question ? "PATCH" : "POST",
      );
      if (!question) element.reset();
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="narrow-form">
      {question && (
        <ReviewButton kind="questions" item={question} refresh={onSaved} />
      )}
      {error && <Alert>{error}</Alert>}
      <Field label="Objective">
        <input
          name="objective"
          defaultValue={question?.objective ?? ""}
          required
        />
      </Field>
      <Field label="Difficulty">
        <select name="difficulty" defaultValue={question?.difficulty ?? "EASY"}>
          <option>EASY</option>
          <option>MEDIUM</option>
          <option>HARD</option>
        </select>
      </Field>
      <Field label="Question prompt">
        <textarea
          name="prompt"
          defaultValue={question?.prompt ?? ""}
          rows={3}
          minLength={10}
          required
        />
      </Field>
      <Field
        label="Answer options — one per line"
        hint="Provide 2–6 options; exactly one answer is correct."
      >
        <textarea
          name="options"
          defaultValue={question?.options.join("\n") ?? ""}
          rows={4}
          required
        />
      </Field>
      <Field label="Correct option number">
        <input
          name="correctOption"
          type="number"
          min={1}
          max={6}
          defaultValue={(question?.correctOption ?? 0) + 1}
          required
        />
      </Field>
      <Field label="Explanation">
        <textarea
          name="explanation"
          defaultValue={question?.explanation ?? ""}
          minLength={10}
          rows={3}
          required
        />
      </Field>
      <label className="check">
        <input
          name="reviewed"
          type="checkbox"
          defaultChecked={question?.reviewed ?? false}
        />
        I have reviewed the answer and explanation.
      </label>
      <Button disabled={busy}>Save question</Button>
    </form>
  );
}
function ProblemForm({
  topicId,
  problem,
  onSaved,
}: {
  topicId: string;
  problem?: AuthorProblem;
  onSaved: () => void;
}) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    try {
      const b = {
        version: problem?.version,
        title: f.get("title"),
        statement: f.get("statement"),
        starterCodes: Object.fromEntries(
          ["c", "cpp", "java", "python"].map((l) => [
            l,
            String(f.get(`starter-${l}`)),
          ]),
        ),
        reviewed: f.get("reviewed") === "on",
        tests: Array.from({ length: 8 }, (_, i) => ({
          input: String(f.get(`input-${i}`)),
          expectedOutput: String(f.get(`output-${i}`)),
          hidden: i >= 3,
        })),
      };
      await api(
        problem
          ? `/faculty/problems/${problem.id}`
          : `/faculty/topics/${topicId}/problems`,
        b,
        problem ? "PATCH" : "POST",
      );
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="narrow-form">
      {problem && (
        <ReviewButton kind="problems" item={problem} refresh={onSaved} />
      )}
      {error && <Alert>{error}</Alert>}
      <Field label="Problem title">
        <input
          name="title"
          defaultValue={problem?.title ?? ""}
          minLength={3}
          required
        />
      </Field>
      <Field label="Statement, input/output format and constraints">
        <textarea
          name="statement"
          defaultValue={problem?.statement ?? ""}
          minLength={30}
          rows={6}
          required
        />
      </Field>
      {["c", "cpp", "java", "python"].map((l) => (
        <details key={l}>
          <summary>
            {l === "cpp" ? "C++" : l.toUpperCase()} starter code
          </summary>
          <Field label={`${l} starter code`}>
            <textarea
              name={`starter-${l}`}
              defaultValue={problem?.starterCodes[l] ?? ""}
              rows={6}
            />
          </Field>
        </details>
      ))}
      <h4>Test cases</h4>
      <p className="muted">
        Three public samples, five hidden tests. Include the exact expected
        final newline where required.
      </p>
      {Array.from({ length: 8 }, (_, i) => (
        <details key={i} open={i === 0}>
          <summary>{i < 3 ? `Sample ${i + 1}` : `Hidden ${i - 2}`}</summary>
          <Field label="Input">
            <textarea
              name={`input-${i}`}
              defaultValue={problem?.tests[i]?.input ?? ""}
              rows={2}
            />
          </Field>
          <Field label="Expected output">
            <textarea
              name={`output-${i}`}
              defaultValue={problem?.tests[i]?.expectedOutput ?? ""}
              rows={2}
            />
          </Field>
        </details>
      ))}
      <label className="check">
        <input
          name="reviewed"
          type="checkbox"
          defaultChecked={problem?.reviewed ?? false}
        />
        I have verified the specification, all tests and starters in all four
        languages.
      </label>
      <Button disabled={busy}>Save coding problem</Button>
    </form>
  );
}
export function StudentsPage() {
  const { courseId } = useParams(),
    [page, setPage] = useState(1),
    q = useData<{
      students: {
        user: User;
        course: Course;
        topics: (Topic & { progress: Progress })[];
      }[];
      total: number;
    }>(`/faculty/courses/${courseId}/students?page=${page}`);
  return (
    <>
      <Header
        title="Course students"
        description="Completion and assessment evidence from actual learning records."
      />
      {q.loading ? (
        <Loading />
      ) : q.error ? (
        <ErrorState error={q.error} retry={q.refresh} />
      ) : (
        <>
          {q.data!.students.length ? (
            q.data!.students.map((s) => (
              <Card key={s.user.id}>
                <div className="row spread">
                  <h3>{s.user.name}</h3>
                  <Badge>
                    {s.topics.filter((t) => t.progress.completed).length}/
                    {s.topics.length} topics complete
                  </Badge>
                </div>
                <p>{s.user.email}</p>
                <p>
                  {s.topics.filter((t) => t.progress.state === "WEAK").length}{" "}
                  weak topics ·{" "}
                  {
                    s.topics.filter(
                      (t) =>
                        t.progress.score === null &&
                        t.progress.state !== "NOT_APPLICABLE",
                    ).length
                  }{" "}
                  topics with insufficient evidence
                </p>
                <Link to={`/faculty/courses/${courseId}/students/${s.user.id}`}>
                  View student detail →
                </Link>
              </Card>
            ))
          ) : (
            <Empty title="No students enrolled">
              <p>Administrators manage course enrollment.</p>
            </Empty>
          )}
          <div className="row">
            <Button
              kind="secondary"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous page
            </Button>
            <span>
              Page {page} · {q.data!.total} students
            </span>
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
export function StudentDetailPage() {
  const { courseId, studentId } = useParams(),
    q = useData<{
      user: User;
      topics: (Topic & { progress: Progress })[];
      attempts: {
        id: string;
        score: number | null;
        status: string;
        topic: { title: string };
      }[];
      submissions: {
        id: string;
        status: string;
        verdict: string | null;
        language: string;
      }[];
    }>(`/faculty/courses/${courseId}/students/${studentId}`);
  return (
    <>
      <Header title={q.data?.user.name ?? "Student learning detail"} />
      {q.loading ? (
        <Loading />
      ) : q.error ? (
        <ErrorState error={q.error} retry={q.refresh} />
      ) : (
        <>
          {q.data!.topics.map((t) => (
            <Card key={t.id}>
              <h3>{t.title}</h3>
              <Badge>{readable(t.progress.state)}</Badge>
              <p>
                {t.progress.state === "NOT_APPLICABLE"
                  ? "Quiz mastery not applicable"
                  : t.progress.score === null
                    ? "Not enough quiz evidence"
                    : `${t.progress.score}% mastery estimate`}{" "}
                · {t.progress.evidenceCount} distinct answered families
              </p>
              <p>
                {t.progress.completed ? "Complete" : "Checklist in progress"}
              </p>
            </Card>
          ))}
          <Card>
            <h2>Quiz history</h2>
            {q.data!.attempts.map((a) => (
              <p key={a.id}>
                <Link to={`/quizzes/${a.id}`}>
                  {a.topic.title}:{" "}
                  {a.score === null ? "in progress" : `${a.score}%`}
                </Link>
              </p>
            ))}
            <h2>Coding results</h2>
            {q.data!.submissions.map((s) => (
              <p key={s.id}>
                {readable(s.language)} · {readable(s.verdict ?? s.status)}
              </p>
            ))}
          </Card>
        </>
      )}
    </>
  );
}
