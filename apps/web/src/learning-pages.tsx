import { lazy, Suspense, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  algorithms,
  algorithmKeys,
  type AlgorithmKey,
} from "@algolearn/shared";
import { api, useData } from "./api";
import { useAuth } from "./auth";
import {
  Alert,
  Badge,
  Button,
  Card,
  Empty,
  ErrorState,
  Header,
  Loading,
  readable,
} from "./ui";
import type { Progress, Quiz, Topic } from "./types";
const Visualizer = lazy(() => import("./Visualizer"));
export function VisualizerLibraryPage() {
  return (
    <>
      <Header
        eyebrow="INTERACTIVE ALGORITHM LAB"
        title="Explore syllabus visualizations"
        description="Run deterministic simulations for linear structures, trees, graph traversals, sorting and searching."
      />
      <div className="course-grid visualizer-library">
        {algorithmKeys.map((key) => (
          <Card key={key}>
            <Badge>{algorithms[key].visualization}</Badge>
            <h2>{algorithms[key].title}</h2>
            <p>{algorithms[key].complexity}</p>
            <p className="source-note">
              {algorithms[key].syllabus.subjectCode} ·{" "}
              {algorithms[key].syllabus.unit} · PDF page(s){" "}
              {algorithms[key].syllabus.pages.join(", ")}
            </p>
            <Link className="text-action" to={`/visualizers/${key}`}>
              Open simulation →
            </Link>
          </Card>
        ))}
      </div>
    </>
  );
}
export function VisualizerPage() {
  const { algorithm } = useParams();
  if (!algorithmKeys.includes(algorithm as AlgorithmKey))
    return (
      <Empty title="Visualization not found">
        <Link to="/visualizers">Browse available simulations</Link>
      </Empty>
    );
  const key = algorithm as AlgorithmKey;
  return (
    <>
      <Link className="breadcrumb" to="/visualizers">
        Visualizer lab /
      </Link>
      <Header
        eyebrow={`${algorithms[key].syllabus.subjectCode} · ${algorithms[key].syllabus.unit}`}
        title={algorithms[key].title}
        description={algorithms[key].complexity}
      />
      <Suspense fallback={<Loading />}>
        <Visualizer key={key} algorithm={key} />
      </Suspense>
    </>
  );
}
export function TopicPage() {
  const { topicId } = useParams(),
    { user } = useAuth(),
    q = useData<{
      topic: Topic;
      problems: { id: string; title: string }[];
      progress: Progress | null;
      availability: {
        quiz: boolean;
        coding: boolean;
        blocked: { activity: string; reason: string }[];
      };
    }>(`/topics/${topicId}`),
    history = useData<{
      attempts: { id: string; status: string; score: number | null }[];
    }>(`/topics/${topicId}/quiz-history`),
    [tab, setTab] = useState("learn"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    navigate = useNavigate();
  async function action(quiz = false) {
    setBusy(true);
    setError("");
    try {
      if (quiz) {
        const r = await api<{ attemptId: string }>(
          `/topics/${topicId}/quiz-attempts`,
          {},
        );
        navigate(`/quizzes/${r.attemptId}`);
      } else {
        await api(`/topics/${topicId}/acknowledgment`, {});
        q.refresh();
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (q.loading) return <Loading />;
  if (q.error) return <ErrorState error={q.error} retry={q.refresh} />;
  const t = q.data!.topic,
    progress = q.data!.progress;
  const names = [
    "learn",
    ...(t.visualizerKey ? ["visualize"] : []),
    ...(t.requiredActivities.includes("QUIZ") ? ["quiz"] : []),
    ...(t.requiredActivities.includes("CODING") || q.data!.problems.length
      ? ["code"]
      : []),
  ];
  return (
    <>
      <Link className="breadcrumb" to={`/courses/${t.revision.courseId}`}>
        Course curriculum /
      </Link>
      <Header
        eyebrow={`${t.unitLabel} · Revision ${t.revision.number}`}
        title={t.title}
        description={algorithms[t.visualizerKey as AlgorithmKey]?.complexity}
      />
      {t.revision.status !== "PUBLISHED" && (
        <div className="notice">
          Faculty preview of draft content. Student activities require
          publication.
        </div>
      )}
      {q.data!.availability.blocked.map((b) => (
        <p className="notice" key={b.activity}>
          <strong>{readable(b.activity)} blocked:</strong> {b.reason}
        </p>
      ))}
      <p className="source-note">
        Source: {t.sourceSubject?.source.filename}, PDF pages{" "}
        {t.sourcePages.join(", ")}. Required activities:{" "}
        {t.requiredActivities.map(readable).join(", ")}.
      </p>
      <div className="tabs" role="tablist" aria-label="Topic activities">
        {names.map((name) => (
          <button
            id={`tab-${name}`}
            role="tab"
            aria-selected={tab === name}
            aria-controls="topic-panel"
            tabIndex={tab === name ? 0 : -1}
            onKeyDown={(e) => {
              let next = names.indexOf(name);
              if (e.key === "ArrowRight") next = (next + 1) % names.length;
              else if (e.key === "ArrowLeft")
                next = (next + names.length - 1) % names.length;
              else if (e.key === "Home") next = 0;
              else if (e.key === "End") next = names.length - 1;
              else return;
              e.preventDefault();
              setTab(names[next]!);
              document.getElementById(`tab-${names[next]}`)?.focus();
            }}
            key={name}
            onClick={() => setTab(name)}
          >
            {name[0]!.toUpperCase() + name.slice(1)}
          </button>
        ))}
      </div>
      {error && <Alert>{error}</Alert>}
      <div
        id="topic-panel"
        role="tabpanel"
        aria-labelledby={`tab-${tab}`}
        tabIndex={0}
      >
        {tab === "learn" ? (
          <div className="lesson-grid">
            <Card>
              <p className="lesson-text">{t.lesson}</p>
              {user!.role === "STUDENT" && (
                <Button
                  disabled={busy || progress?.lessonAcknowledged}
                  onClick={() => action()}
                >
                  {progress?.lessonAcknowledged
                    ? "Lesson acknowledged"
                    : "Acknowledge lesson"}
                </Button>
              )}
            </Card>
            <Card>
              <h3>Learning objectives</h3>
              <ul>
                {t.objectives.map((o) => (
                  <li key={o}>{o}</li>
                ))}
              </ul>
              <h3>Topic completion</h3>
              {progress ? (
                <>
                  <p>
                    {progress.lessonAcknowledged ? "✓" : "○"} Lesson
                    acknowledged
                  </p>
                  {t.requiredActivities.includes("QUIZ") && (
                    <p>{progress.quizSubmitted ? "✓" : "○"} Quiz submitted</p>
                  )}
                  {t.requiredActivities.includes("CODING") && (
                    <p>
                      {progress.codingAccepted ? "✓" : "○"} One coding problem
                      accepted
                    </p>
                  )}
                  {t.requiredActivities.includes("PRACTICAL") && (
                    <p>○ External practical: completion blocked</p>
                  )}
                  <Badge>{readable(progress.state)}</Badge>
                  <p>
                    {!t.requiredActivities.includes("QUIZ")
                      ? "Quiz mastery is not applicable to this topic"
                      : progress.score === null
                        ? "Insufficient evidence for mastery"
                        : `Estimated mastery ${progress.score}%`}{" "}
                    · {progress.evidenceCount} distinct answered families
                  </p>
                </>
              ) : (
                <p>Completion is tracked from student activity.</p>
              )}
            </Card>
          </div>
        ) : tab === "visualize" ? (
          <Suspense fallback={<Loading />}>
            <Visualizer
              key={t.visualizerKey}
              algorithm={t.visualizerKey as AlgorithmKey}
              mappedSource={{
                code: t.sourceSubject?.code ?? "Official source",
                title: t.sourceSubject?.title ?? t.unitLabel,
                filename:
                  t.sourceSubject?.source.filename ??
                  algorithms[t.visualizerKey as AlgorithmKey].syllabus.source,
                pages: t.sourcePages,
              }}
            />
          </Suspense>
        ) : tab === "quiz" ? (
          <Card>
            <h2>Practice with feedback</h2>
            <p>
              Ten questions, saved as you go. Review answers and explanations
              after submission.
            </p>
            {user!.role === "STUDENT" ? (
              <Button
                disabled={busy || !q.data!.availability.quiz}
                onClick={() => action(true)}
              >
                Start or resume quiz
              </Button>
            ) : (
              <p>Use the content editor to review faculty question banks.</p>
            )}
            <h3>Your quiz history</h3>
            {history.loading ? (
              <Loading />
            ) : history.error ? (
              <ErrorState error={history.error} retry={history.refresh} />
            ) : history.data!.attempts.length ? (
              history.data!.attempts.map((a) => (
                <p key={a.id}>
                  <Link to={`/quizzes/${a.id}`}>
                    {a.status === "COMPLETED"
                      ? `Score ${a.score}% — review result`
                      : "Resume unfinished attempt"}
                  </Link>
                </p>
              ))
            ) : (
              <p className="muted">No attempts yet.</p>
            )}
          </Card>
        ) : (
          <div className="course-grid">
            {q.data!.problems.map((p) => (
              <Card key={p.id}>
                <h3>{p.title}</h3>
                <p>Run samples, inspect feedback and submit your solution.</p>
                <Link className="text-action" to={`/problems/${p.id}`}>
                  Open coding workspace →
                </Link>
              </Card>
            ))}
            {!q.data!.problems.length && (
              <Empty title="No coding problems published" />
            )}
          </div>
        )}
      </div>
    </>
  );
}
export function QuizPage() {
  const { attemptId } = useParams(),
    q = useData<{ attempt: Quiz }>(`/quiz-attempts/${attemptId}`),
    [attempt, setAttempt] = useState<Quiz | null>(null),
    [position, setPosition] = useState(0),
    [pending, setPending] = useState(false),
    [save, setSave] = useState("Saved"),
    [error, setError] = useState(""),
    [failed, setFailed] = useState<{
      itemId: string;
      choice: number | null;
      version: number;
    } | null>(null);
  useEffect(() => {
    if (q.data) {
      setAttempt(q.data.attempt);
      setFailed(null);
      setError("");
      setSave("Saved");
    }
  }, [q.data]);
  async function answer(
    itemId: string,
    choice: number | null,
    version: number,
  ) {
    setPending(true);
    setSave("Saving…");
    setError("");
    setAttempt((a) =>
      a
        ? {
            ...a,
            items: a.items.map((i) =>
              i.id === itemId ? { ...i, selectedOption: choice } : i,
            ),
          }
        : a,
    );
    try {
      const r = await api<{ version: number }>(
        `/quiz-attempts/${attemptId}/answers/${itemId}`,
        { selectedOption: choice, version },
        "PUT",
      );
      setAttempt((a) =>
        a
          ? {
              ...a,
              items: a.items.map((i) =>
                i.id === itemId ? { ...i, version: r.version } : i,
              ),
            }
          : a,
      );
      setSave("Saved");
      setFailed(null);
    } catch (e) {
      setSave("Not saved");
      setError((e as Error).message);
      setFailed({ itemId, choice, version });
    } finally {
      setPending(false);
    }
  }
  async function submit() {
    const blanks = attempt!.items.filter(
      (i) => i.selectedOption === null,
    ).length;
    if (
      !window.confirm(
        `Submit your quiz? ${blanks} unanswered question${blanks === 1 ? "" : "s"} will score as incorrect.`,
      )
    )
      return;
    setPending(true);
    setError("");
    try {
      await api(`/quiz-attempts/${attemptId}/submit`, {});
      q.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(false);
    }
  }
  if (q.loading) return <Loading />;
  if (q.error) return <ErrorState error={q.error} retry={q.refresh} />;
  if (!attempt) return <Loading />;
  const done = attempt.status === "COMPLETED",
    item = attempt.items[position]!;
  return (
    <>
      <Link className="breadcrumb" to={`/topics/${attempt.topicId}`}>
        Back to topic /
      </Link>
      <Header
        eyebrow={done ? "QUIZ RESULT" : "FORMATIVE PRACTICE"}
        title={attempt.title}
        description={
          done
            ? `Quiz score: ${attempt.score}%. This is separate from your rolling mastery estimate.`
            : "Ten questions. Answers save to your account; explanations appear after submission."
        }
      />
      {error && (
        <Alert>
          {error}
          {failed && (
            <div className="row">
              <Button
                kind="secondary"
                onClick={() =>
                  answer(failed.itemId, failed.choice, failed.version)
                }
                disabled={pending}
              >
                Retry save
              </Button>
              <Button
                kind="secondary"
                onClick={() => {
                  if (
                    window.confirm(
                      "Reload this attempt? The unsaved answer will be discarded.",
                    )
                  )
                    q.refresh();
                }}
              >
                Reload saved answers
              </Button>
            </div>
          )}
        </Alert>
      )}
      {done ? (
        <>
          <div className="result-score">
            <strong>{attempt.score}%</strong>
            <p>Quiz score</p>
          </div>
          {attempt.progress && (
            <Card>
              <div className="row spread">
                <h2>Mastery evidence</h2>
                <Badge>{readable(attempt.progress.state)}</Badge>
              </div>
              <p>
                {attempt.progress.score === null
                  ? "Not enough distinct answered questions for a mastery estimate."
                  : `Estimated mastery: ${attempt.progress.score}%.`}{" "}
                Evidence: {attempt.progress.evidenceCount} distinct answered
                question families.
              </p>
              <details>
                <summary>How this estimate is calculated</summary>
                <p>
                  AlgoLearn uses the latest answers from up to 20 distinct
                  question families across the last five completed attempts.
                  Repeated families count only once. At least ten answered
                  families are required before showing an estimate.
                </p>
              </details>
            </Card>
          )}
          {attempt.items.map((i) => (
            <Card key={i.id}>
              <Badge>
                {i.isCorrect
                  ? "Correct"
                  : i.selectedOption === null
                    ? "Unanswered"
                    : "Incorrect"}
              </Badge>
              <h3>
                {i.position}. {i.question.prompt}
              </h3>
              <p>
                Your answer:{" "}
                {i.selectedOption === null
                  ? "Unanswered"
                  : i.question.options[i.selectedOption]}
              </p>
              <p>Correct answer: {i.question.options[i.correctOption!]}</p>
              <p className="notice">{i.explanation}</p>
            </Card>
          ))}
          <Link className="button primary" to={`/topics/${attempt.topicId}`}>
            Review topic and next steps
          </Link>
          {!!attempt.recommendations?.length && (
            <Card>
              <h2>Recommended next</h2>
              {attempt.recommendations.map((recommendation) => (
                <div key={recommendation.topicId}>
                  <h3>{recommendation.title}</h3>
                  <p>{recommendation.reason}</p>
                  <Link to={`/topics/${recommendation.topicId}`}>
                    {recommendation.action} →
                  </Link>
                </div>
              ))}
            </Card>
          )}
        </>
      ) : (
        <div className="quiz-grid">
          <Card>
            <p className="eyebrow">
              QUESTION {position + 1} OF {attempt.items.length}
            </p>
            <h2>{item.question.prompt}</h2>
            <fieldset className="answer-options">
              <legend className="sr-only">Choose one answer</legend>
              {item.question.options.map((option, i) => (
                <label
                  className={item.selectedOption === i ? "selected" : ""}
                  key={i}
                >
                  <input
                    type="radio"
                    name={`question-${item.id}`}
                    checked={item.selectedOption === i}
                    disabled={pending || !!failed}
                    onChange={() => answer(item.id, i, item.version)}
                  />
                  <span>{option}</span>
                </label>
              ))}
            </fieldset>
            <div className="row spread">
              <Button
                kind="secondary"
                disabled={position === 0}
                onClick={() => setPosition((i) => i - 1)}
              >
                Previous
              </Button>
              <Button
                disabled={position === attempt.items.length - 1}
                onClick={() => setPosition((i) => i + 1)}
              >
                Next question
              </Button>
            </div>
          </Card>
          <Card>
            <h3>Question outline</h3>
            <div className="question-outline">
              {attempt.items.map((i, n) => (
                <button
                  key={i.id}
                  className={
                    position === n
                      ? "current"
                      : i.selectedOption !== null
                        ? "answered"
                        : ""
                  }
                  aria-label={`Question ${n + 1}, ${i.selectedOption === null ? "unanswered" : "answered"}`}
                  aria-current={position === n ? "step" : undefined}
                  onClick={() => setPosition(n)}
                >
                  {n + 1}
                </button>
              ))}
            </div>
            <p role="status">{save}</p>
            <p>
              {attempt.items.filter((i) => i.selectedOption !== null).length} of
              10 answered
            </p>
            <Button disabled={pending || !!failed} onClick={submit}>
              Submit quiz
            </Button>
          </Card>
        </div>
      )}
    </>
  );
}
