import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Link, useParams } from "react-router-dom";
import { api, HttpError, useData } from "./api";
import { useAuth } from "./auth";
import {
  Alert,
  Badge,
  Button,
  Card,
  ErrorState,
  Field,
  Header,
  Loading,
  readable,
} from "./ui";
import type { Problem, Submission } from "./types";
const CodeEditor = lazy(() => import("./CodeEditor"));
export default function CodingPage() {
  const { problemId } = useParams(),
    { user } = useAuth(),
    p = useData<{ problem: Problem }>(`/problems/${problemId}`),
    availability = useData<{ available: boolean; message: string }>(
      "/coding/config",
    );
  const [language, setLanguage] = useState("python"),
    [source, setSource] = useState(""),
    [version, setVersion] = useState(0),
    [dirty, setDirty] = useState(false),
    [saving, setSaving] = useState(false),
    [draftReady, setDraftReady] = useState(false),
    [draftRetry, setDraftRetry] = useState(0),
    [saveStatus, setSaveStatus] = useState("Loading draft…"),
    [error, setError] = useState(""),
    [conflict, setConflict] = useState<{
      source: string;
      version: number;
    } | null>(null),
    [stdin, setStdin] = useState(""),
    [mode, setMode] = useState("CUSTOM"),
    [running, setRunning] = useState(false),
    [submissionId, setSubmissionId] = useState(""),
    [submission, setSubmission] = useState<Submission | null>(null),
    [mobileTab, setMobileTab] = useState("editor"),
    [pollVersion, setPollVersion] = useState(0),
    [pollError, setPollError] = useState("");
  const history = useData<{ submissions: Submission[] }>(
    `/problems/${problemId}/submissions`,
  );
  const sourceRef = useRef(source),
    savingRef = useRef(false),
    requestRef = useRef<{ signature: string; key: string } | null>(null),
    generation = useRef(0);
  const student = user!.role === "STUDENT";
  useEffect(() => {
    sourceRef.current = source;
  }, [source]);
  useEffect(() => {
    let live = true;
    generation.current++;
    setDraftReady(false);
    setSaveStatus("Loading draft…");
    setConflict(null);
    setError("");
    setDirty(false);
    if (!student) {
      if (p.data) {
        const value = p.data.problem.starterCodes[language] ?? "";
        setSource(value);
        sourceRef.current = value;
        setSaveStatus("Faculty starter-code preview");
        setDraftReady(true);
      }
      return;
    }
    api<{ source: string; version: number }>(
      `/problems/${problemId}/drafts/${language}`,
    )
      .then((d) => {
        if (live) {
          setSource(d.source);
          sourceRef.current = d.source;
          setVersion(d.version);
          setSaveStatus("Saved");
          setDraftReady(true);
        }
      })
      .catch((e) => {
        if (live) {
          setError(e.message);
          setSaveStatus("Draft could not load");
        }
      });
    return () => {
      live = false;
    };
  }, [language, problemId, student, p.data, draftRetry]);
  const save = useCallback(
    async (overrideVersion?: number) => {
      if (!student || !draftReady || savingRef.current) return false;
      const snapshot = sourceRef.current,
        expected = overrideVersion ?? version,
        currentGeneration = generation.current;
      savingRef.current = true;
      setSaving(true);
      setSaveStatus("Saving…");
      try {
        const d = await api<{ version: number }>(
          `/problems/${problemId}/drafts/${language}`,
          { source: snapshot, version: expected },
          "PUT",
        );
        if (generation.current === currentGeneration) {
          setVersion(d.version);
          setDirty(sourceRef.current !== snapshot);
          setSaveStatus(
            sourceRef.current === snapshot ? "Saved" : "Unsaved changes",
          );
          setConflict(null);
          setError("");
        }
        return (
          generation.current === currentGeneration &&
          sourceRef.current === snapshot
        );
      } catch (e) {
        setSaveStatus("Not saved");
        setError((e as Error).message);
        if (e instanceof HttpError && e.status === 409) {
          try {
            setConflict(await api(`/problems/${problemId}/drafts/${language}`));
          } catch {}
        }
        return false;
      } finally {
        savingRef.current = false;
        setSaving(false);
      }
    },
    [version, student, problemId, language, draftReady],
  );
  useEffect(() => {
    if (!dirty || conflict || saving) return;
    const timer = setTimeout(() => void save(), 2000);
    return () => clearTimeout(timer);
  }, [dirty, source, save, conflict, saving]);
  useEffect(() => {
    const leave = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", leave);
    return () => window.removeEventListener("beforeunload", leave);
  }, [dirty]);
  useEffect(() => {
    if (!submissionId && history.data) {
      const pending = history.data.submissions.find((s) =>
        ["QUEUED", "RUNNING"].includes(s.status),
      );
      if (pending) setSubmissionId(pending.id);
    }
  }, [history.data, submissionId]);
  useEffect(() => {
    if (!submissionId) return;
    let live = true,
      timer: ReturnType<typeof setTimeout> | undefined;
    const started = Date.now();
    async function poll() {
      try {
        const d = await api<{ submission: Submission }>(
          `/submissions/${submissionId}`,
        );
        if (!live) return;
        setSubmission(d.submission);
        setPollError("");
        if (["QUEUED", "RUNNING"].includes(d.submission.status))
          timer = setTimeout(poll, Date.now() - started > 10000 ? 5000 : 2000);
        else history.refresh();
      } catch (e) {
        if (live) setPollError((e as Error).message);
      }
    }
    void poll();
    return () => {
      live = false;
      if (timer) clearTimeout(timer);
    };
  }, [submissionId, history.refresh, pollVersion]);
  async function changeLanguage(value: string) {
    if (value === language) return;
    if (dirty && !(await save())) return;
    setDraftReady(false);
    setLanguage(value);
  }
  async function execute(runMode: string) {
    setRunning(true);
    setError("");
    try {
      if (dirty && !(await save())) return;
      const signature = JSON.stringify({
        language,
        source: sourceRef.current,
        mode: runMode,
        stdin,
      });
      if (requestRef.current?.signature !== signature)
        requestRef.current = { signature, key: crypto.randomUUID() };
      const d = await api<{ submissionId: string }>(
        `/problems/${problemId}/submissions`,
        {
          language,
          source: sourceRef.current,
          mode: runMode,
          ...(runMode === "CUSTOM" ? { stdin } : {}),
          idempotencyKey: requestRef.current.key,
        },
      );
      requestRef.current = null;
      setSubmissionId(d.submissionId);
      setSubmission(null);
      setMobileTab("results");
      history.refresh();
    } catch (e) {
      setError((e as Error).message);
      availability.refresh();
    } finally {
      setRunning(false);
    }
  }
  if (p.loading) return <Loading />;
  if (p.error) return <ErrorState error={p.error} retry={p.refresh} />;
  const problem = p.data!.problem;
  return (
    <>
      <Link className="breadcrumb" to={`/topics/${problem.topicId}`}>
        Back to topic /
      </Link>
      <Header
        eyebrow={`CODING WORKSPACE · REVISION ${problem.revision}`}
        title={problem.title}
        description="Build, inspect and improve your solution."
      />
      {error && (
        <Alert>
          {error}
          {saveStatus === "Draft could not load" && (
            <Button
              kind="secondary"
              onClick={() => setDraftRetry((value) => value + 1)}
            >
              Retry loading draft
            </Button>
          )}
          {saveStatus === "Not saved" && !conflict && (
            <Button
              kind="secondary"
              onClick={() => void save()}
              disabled={saving}
            >
              Retry draft save
            </Button>
          )}
        </Alert>
      )}
      {!availability.data?.available && (
        <div className="notice">
          {availability.data?.message ??
            "Checking secure execution availability…"}{" "}
          <Button kind="secondary" onClick={availability.refresh}>
            Check service
          </Button>
        </div>
      )}
      {conflict && (
        <Card>
          <h2>Newer saved draft found</h2>
          <p>
            Your local work has been preserved. Compare both versions before
            choosing.
          </p>
          <div className="conflict-grid">
            <div>
              <h3>Your local draft</h3>
              <pre>{source}</pre>
            </div>
            <div>
              <h3>Newer saved draft</h3>
              <pre>{conflict.source}</pre>
            </div>
          </div>
          <div className="row">
            <Button onClick={() => void save(conflict.version)}>
              Keep my local version
            </Button>
            <Button
              kind="secondary"
              onClick={() => {
                setSource(conflict.source);
                sourceRef.current = conflict.source;
                setVersion(conflict.version);
                setDirty(false);
                setConflict(null);
                setSaveStatus("Saved");
                setError("");
              }}
            >
              Use saved version
            </Button>
          </div>
        </Card>
      )}
      <div className="workspace-tabs">
        {["problem", "editor", "results"].map((t) => (
          <Button
            kind={mobileTab === t ? "primary" : "secondary"}
            key={t}
            onClick={() => setMobileTab(t)}
          >
            {readable(t)}
          </Button>
        ))}
      </div>
      <div className={`coding-grid mobile-${mobileTab}`}>
        <Card className="problem-pane">
          <h2>Problem</h2>
          <p className="lesson-text">{problem.statement}</p>
          <h3>Sample cases</h3>
          {problem.samples.map((s, i) => (
            <div className="sample" key={s.id}>
              <strong>Sample {i + 1}</strong>
              <p>Input</p>
              <pre>{s.input || "(empty)"}</pre>
              <p>Expected output</p>
              <pre>{s.expectedOutput || "(empty)"}</pre>
            </div>
          ))}
          <p className="muted">
            Submission checks three samples and five hidden cases. All eight
            must pass. Final newlines matter; trailing spaces per line are
            ignored.
          </p>
        </Card>
        <div className="editor-pane">
          <Card className="editor-card">
            <div className="editor-toolbar">
              <Field label="Language">
                <select
                  value={language}
                  disabled={saving || running}
                  onChange={(e) => void changeLanguage(e.target.value)}
                >
                  <option value="c">C</option>
                  <option value="cpp">C++</option>
                  <option value="java">Java</option>
                  <option value="python">Python</option>
                </select>
              </Field>
              <span role="status" className="save-status">
                {saveStatus}
              </span>
              {student && (
                <Button
                  kind="secondary"
                  onClick={() => void save()}
                  disabled={!draftReady || saving || !dirty || !!conflict}
                >
                  Save draft
                </Button>
              )}
            </div>
            <p className="editor-help">
              Editor keyboard access: Ctrl+M toggles whether Tab inserts
              indentation or moves focus. Use the regular form controls below to
              run your code.
            </p>
            <Suspense fallback={<Loading />}>
              <CodeEditor
                readOnly={!draftReady}
                source={source}
                language={language}
                onChange={(value) => {
                  setSource(value);
                  sourceRef.current = value;
                  setDirty(true);
                  setSaveStatus("Unsaved changes");
                }}
              />
            </Suspense>
            <div className="run-controls">
              <Field label="Run mode">
                <select value={mode} onChange={(e) => setMode(e.target.value)}>
                  <option value="CUSTOM">Custom input</option>
                  <option value="SAMPLES">Sample tests</option>
                </select>
              </Field>
              <Button
                kind="secondary"
                disabled={
                  !student ||
                  !draftReady ||
                  !availability.data?.available ||
                  running ||
                  !!conflict
                }
                onClick={() => execute(mode)}
              >
                Run code
              </Button>
              <Button
                disabled={
                  !student ||
                  !draftReady ||
                  !availability.data?.available ||
                  running ||
                  !!conflict
                }
                onClick={() => execute("SUBMIT")}
              >
                Submit solution
              </Button>
            </div>
          </Card>
          <Card className="results-pane">
            <Field label="Custom input">
              <textarea
                rows={4}
                value={stdin}
                onChange={(e) => setStdin(e.target.value)}
                maxLength={16384}
              />
            </Field>
            <h3>Execution result</h3>
            {pollError && (
              <Alert>
                {pollError}
                <Button
                  kind="secondary"
                  onClick={() => setPollVersion((v) => v + 1)}
                >
                  Retry result
                </Button>
              </Alert>
            )}
            {submission ? (
              <>
                <Badge>{readable(submission.status)}</Badge>
                {submission.verdict && (
                  <p>
                    <strong>{readable(submission.verdict)}</strong> ·{" "}
                    {submission.passedCount}/{submission.totalCount} cases
                    passed
                  </p>
                )}
                {submission.status === "EXECUTION_FAILED" && (
                  <Alert>
                    This is an infrastructure failure; it does not mark your
                    solution incorrect or lower learning progress.
                  </Alert>
                )}
                {submission.cases?.map((c) => (
                  <details key={c.position} open={!c.hidden}>
                    <summary>
                      Case {c.position}
                      {c.hidden ? " · hidden" : ""}:{" "}
                      {c.verdict ? readable(c.verdict) : "pending"}
                    </summary>
                    {!c.hidden && (
                      <>
                        <p>Output</p>
                        <pre className="console">
                          {c.output || "(no output)"}
                        </pre>
                        {c.diagnostics && (
                          <>
                            <p>Diagnostics</p>
                            <pre className="console">{c.diagnostics}</pre>
                          </>
                        )}
                        {c.time && (
                          <p>
                            Time {c.time}s · Memory {c.memory} KiB
                          </p>
                        )}
                      </>
                    )}
                  </details>
                ))}
                <details>
                  <summary>Submitted source snapshot</summary>
                  <pre className="console">{submission.source}</pre>
                </details>
              </>
            ) : (
              <p className="muted">
                A real run or submission result will appear here.
              </p>
            )}
            <h3>Your submission history</h3>
            {history.error ? (
              <ErrorState error={history.error} retry={history.refresh} />
            ) : (
              history.data?.submissions.map((s) => (
                <button
                  className="history-row"
                  key={s.id}
                  onClick={() => {
                    setSubmissionId(s.id);
                    setPollVersion((v) => v + 1);
                  }}
                >
                  {readable(s.language)} · {readable(s.mode)} ·{" "}
                  {readable(s.verdict ?? s.status)} ·{" "}
                  {new Date(s.createdAt).toLocaleString()}
                </button>
              ))
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
