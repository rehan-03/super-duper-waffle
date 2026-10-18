import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { useReducedMotion } from "motion/react";
import {
  algorithms,
  buildTrace,
  isGraphAlgorithm,
  requiresTarget,
  type AlgorithmKey,
} from "@algolearn/shared";
import { Alert, Badge, Button, Card, Field } from "./ui";
import { StructureView } from "./StructureView";
import { VisualizerEngine } from "./visualizer/VisualizerEngine";
import { sortingAndSearchingAlgorithms } from "./visualizer/algorithms";

export type VisualizerSource = {
  code: string;
  title: string;
  filename: string;
  pages: number[];
};

function defaults(key: AlgorithmKey) {
  if (isGraphAlgorithm(key))
    return {
      input: "0, 1, 2, 3, 4, 5",
      values: [0, 1, 2, 3, 4, 5],
      target: "0",
      graph: "0-1, 0-2, 1-3, 1-4, 2-5, 4-5",
    };
  if (key === "binary-search-tree")
    return {
      input: "8, 4, 12, 2, 6, 10, 14",
      values: [8, 4, 12, 2, 6, 10, 14],
      target: "7",
      graph: "",
    };
  if (key === "binary-search")
    return {
      input: "1, 3, 5, 7, 9",
      values: [1, 3, 5, 7, 9],
      target: "7",
      graph: "",
    };
  if (key === "stack-operations" || key === "queue-operations")
    return {
      input: "4, 7, 2, 9",
      values: [4, 7, 2, 9],
      target: "7",
      graph: "",
    };
  return {
    input: "9, 3, 7, 1, 5",
    values: [9, 3, 7, 1, 5],
    target: "7",
    graph: "",
  };
}

function parseValues(input: string) {
  if (!input.trim()) throw new Error("Enter at least one integer.");
  return input
    .trim()
    .split(/[\s,]+/)
    .filter(Boolean)
    .map(Number);
}

function parseEdges(input: string): [number, number][] {
  if (!input.trim()) return [];
  return input.split(/[;,\n]+/).map((part) => {
    const match = part.trim().match(/^(-?\d+)\s*-\s*(-?\d+)$/);
    if (!match)
      throw new Error("Enter graph edges as vertex pairs such as 0-1, 1-2.");
    return [Number(match[1]), Number(match[2])];
  });
}

export default function Visualizer({
  algorithm,
  mappedSource,
}: {
  algorithm: AlgorithmKey;
  mappedSource?: VisualizerSource;
}) {
  const customAlgo = sortingAndSearchingAlgorithms[algorithm];
  if (customAlgo) {
    const syllabus = algorithms[algorithm]?.syllabus;
    const syllabusElement = syllabus ? (
      <div className="algo-syllabus-box">
        <div className="algo-syllabus-title">
          <strong>Official Syllabus Reference:</strong> {syllabus.subjectCode} · {syllabus.subjectTitle} ({syllabus.unit})
        </div>
        <div className="algo-syllabus-details">
          Source: {syllabus.source} · PDF page(s) {syllabus.pages.join(", ")}
          {mappedSource && (
            <span> · Topic: {mappedSource.code} ({mappedSource.title})</span>
          )}
        </div>
      </div>
    ) : null;

    return (
      <VisualizerEngine
        algorithm={customAlgo}
        mappedSourceNote={syllabusElement}
      />
    );
  }

  const initial = defaults(algorithm);
  const [input, setInput] = useState(initial.input),
    [target, setTarget] = useState(initial.target),
    [graphInput, setGraphInput] = useState(initial.graph),
    [values, setValues] = useState<number[]>(initial.values),
    [activeTarget, setActiveTarget] = useState(Number(initial.target)),
    [activeEdges, setActiveEdges] = useState<[number, number][]>(() =>
      parseEdges(initial.graph),
    ),
    [index, setIndex] = useState(0),
    [playing, setPlaying] = useState(false),
    [speed, setSpeed] = useState(1),
    [error, setError] = useState("");
  const reduced = useReducedMotion() ?? false;
  const trace = useMemo(
      () => buildTrace(values, algorithm, activeTarget, { edges: activeEdges }),
      [values, algorithm, activeTarget, activeEdges],
    ),
    step = trace[index] ?? trace[0]!,
    graph = isGraphAlgorithm(algorithm),
    targetRequired = requiresTarget(algorithm),
    last = index === trace.length - 1;

  useEffect(() => {
    if (!playing) return;
    if (last) {
      setPlaying(false);
      return;
    }
    const timer = setTimeout(() => setIndex((value) => value + 1), 600 / speed);
    return () => clearTimeout(timer);
  }, [playing, last, speed]);
  useEffect(() => {
    const hidden = () => {
      if (document.hidden) setPlaying(false);
    };
    document.addEventListener("visibilitychange", hidden);
    return () => document.removeEventListener("visibilitychange", hidden);
  }, []);

  function apply(sort = false) {
    setPlaying(false);
    setIndex(0);
    try {
      const parsed = parseValues(input);
      if (sort) parsed.sort((left, right) => left - right);
      if (targetRequired && !target.trim())
        throw new Error(
          graph ? "Enter a start vertex." : "Enter a target value.",
        );
      const nextTarget = Number(target),
        edges = graph ? parseEdges(graphInput) : [];
      buildTrace(parsed, algorithm, nextTarget, { edges });
      setValues(parsed);
      setActiveTarget(nextTarget);
      setActiveEdges(edges);
      if (sort) setInput(parsed.join(", "));
      setError("");
    } catch (caught) {
      setError((caught as Error).message);
    }
  }
  function changed(message: string) {
    setPlaying(false);
    setIndex(0);
    setError(message);
  }
  function useKeyboard(event: KeyboardEvent<HTMLDivElement>) {
    if (error) return;
    if (event.key === " ") {
      event.preventDefault();
      if (!last) setPlaying((value) => !value);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      setPlaying(false);
      setIndex((value) => Math.min(trace.length - 1, value + 1));
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      setPlaying(false);
      setIndex((value) => Math.max(0, value - 1));
    }
  }

  return (
    <div className="visualizer">
      <Card>
        <div className="filter-row visualizer-inputs">
          <Field
            label={graph ? "Vertex values" : "Input values"}
            hint={
              graph || algorithm === "binary-search-tree"
                ? "1–15 unique integers, separated by commas or spaces."
                : "1–50 integers from −999 to 999, separated by commas or spaces."
            }
          >
            <input
              value={input}
              onChange={(event) => {
                setInput(event.target.value);
                changed("Input changed. Apply input to start a new trace.");
              }}
            />
          </Field>
          {graph && (
            <Field
              label="Undirected edges"
              hint="Comma-separated vertex pairs, for example 0-1, 1-2."
            >
              <input
                value={graphInput}
                onChange={(event) => {
                  setGraphInput(event.target.value);
                  changed("Graph changed. Apply input to start a new trace.");
                }}
              />
            </Field>
          )}
          {targetRequired && (
            <Field label={graph ? "Start vertex" : "Target value"}>
              <input
                type="number"
                min={-999}
                max={999}
                value={target}
                onChange={(event) => {
                  setTarget(event.target.value);
                  changed(
                    graph
                      ? "Start vertex changed. Apply input to continue."
                      : "Target changed. Apply input to continue.",
                  );
                }}
              />
            </Field>
          )}
          <Button onClick={() => apply()}>Apply input</Button>
          {algorithm === "binary-search" && (
            <Button kind="secondary" onClick={() => apply(true)}>
              Sort input
            </Button>
          )}
        </div>
        {error && <Alert>{error}</Alert>}
      </Card>
      <div className="visualizer-grid">
        <Card>
          <div className="row spread">
            <h3>Execution trace</h3>
            <Badge>
              Step {index} / {trace.length - 1}
            </Badge>
          </div>
          <p id="visualizer-keyboard-help" className="muted">
            Focus the visualization, then use Space to play or pause and
            Left/Right Arrow to step.
          </p>
          <div
            className="visual-state"
            tabIndex={0}
            aria-label={`${step.kind === "array" ? "Array" : "Visualization"} state and keyboard playback controls`}
            aria-describedby="visualizer-keyboard-help"
            onKeyDown={useKeyboard}
          >
            <StructureView step={step} speed={speed} reduced={reduced} />
          </div>
          {step.frontier.length > 0 && (
            <div className="auxiliary">
              <strong>
                {algorithm === "breadth-first-search" ? "Queue" : "Stack"}
              </strong>
              <p>
                {step.frontier.map((vertex) => step.values[vertex]).join(" · ")}
              </p>
            </div>
          )}
          {step.auxiliary.length > 0 && !graph && (
            <div className="auxiliary">
              <strong>Auxiliary storage</strong>
              <p>{step.auxiliary.join(" · ")}</p>
            </div>
          )}
          <p
            className="trace-explanation"
            aria-live={playing ? "off" : "polite"}
          >
            {step.description}
          </p>
          <div
            className="playback"
            role="group"
            aria-label="Simulation controls"
          >
            <Button
              onClick={() => setPlaying((value) => !value)}
              disabled={last || !!error}
            >
              {playing ? "Pause" : "Play"}
            </Button>
            <Button
              kind="secondary"
              disabled={index === 0 || !!error}
              onClick={() => {
                setPlaying(false);
                setIndex((value) => value - 1);
              }}
            >
              Previous step
            </Button>
            <Button
              kind="secondary"
              disabled={last || !!error}
              onClick={() => {
                setPlaying(false);
                setIndex((value) => value + 1);
              }}
            >
              Next step
            </Button>
            <Button
              kind="secondary"
              onClick={() => {
                setPlaying(false);
                setIndex(0);
              }}
            >
              Reset
            </Button>
            <Field label="Speed">
              <select
                value={speed}
                onChange={(event) => setSpeed(Number(event.target.value))}
              >
                {[0.25, 0.5, 1, 2, 4].map((value) => (
                  <option key={value} value={value}>
                    {value}×
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </Card>
        <div className="visualizer-notes">
          <Card>
            <h3>Pseudocode</h3>
            <ol className="pseudocode">
              {algorithms[algorithm].pseudocode.map((line, lineIndex) => (
                <li
                  key={line}
                  className={step.line === lineIndex ? "current" : ""}
                >
                  {line}
                </li>
              ))}
            </ol>
            <h3>Complexity</h3>
            <p>{algorithms[algorithm].complexity}</p>
          </Card>
          <Card>
            <h3>Official syllabus connection</h3>
            <p>
              <strong>{algorithms[algorithm].syllabus.subjectCode}</strong> ·{" "}
              {algorithms[algorithm].syllabus.subjectTitle}
            </p>
            <p>{algorithms[algorithm].syllabus.unit}</p>
            <p className="source-note">
              {algorithms[algorithm].syllabus.source} · PDF page(s){" "}
              {algorithms[algorithm].syllabus.pages.join(", ")}
            </p>
            {mappedSource && (
              <div className="notice compact">
                Current learning topic: {mappedSource.code} ·{" "}
                {mappedSource.title}
                {" · "}
                {mappedSource.filename} page(s) {mappedSource.pages.join(", ")}
              </div>
            )}
            <p className="muted">
              Visual exploration does not create progress or change quiz
              mastery.
            </p>
          </Card>
        </div>
      </div>
      <Card>
        <details>
          <summary>Accessible step transcript ({trace.length} states)</summary>
          <ol className="transcript">
            {trace.map((traceStep, traceIndex) => (
              <li key={traceIndex}>
                <strong>Step {traceIndex}.</strong> {traceStep.description}{" "}
                State: [{traceStep.values.join(", ")}].
              </li>
            ))}
          </ol>
        </details>
      </Card>
    </div>
  );
}
