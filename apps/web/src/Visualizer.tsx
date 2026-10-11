import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { algorithms, buildTrace, type AlgorithmKey } from "@algolearn/shared";
import { Alert, Button, Card, Field, Badge } from "./ui";
export default function Visualizer({ algorithm }: { algorithm: AlgorithmKey }) {
  const [input, setInput] = useState("9, 3, 7, 1, 5"),
    [target, setTarget] = useState("7"),
    [values, setValues] = useState<number[]>(
      algorithm === "binary-search" ? [1, 3, 5, 7, 9] : [9, 3, 7, 1, 5],
    ),
    [activeTarget, setActiveTarget] = useState(7),
    [index, setIndex] = useState(0),
    [playing, setPlaying] = useState(false),
    [speed, setSpeed] = useState(1),
    [error, setError] = useState("");
  const reduced = useReducedMotion();
  const trace = useMemo(
      () => buildTrace(values, algorithm, activeTarget),
      [values, algorithm, activeTarget],
    ),
    step = trace[index] ?? trace[0]!;
  useEffect(() => {
    setPlaying(false);
    setIndex(0);
    if (algorithm === "binary-search") setInput("1, 3, 5, 7, 9");
  }, [algorithm]);
  useEffect(() => {
    if (!playing) return;
    if (index >= trace.length - 1) {
      setPlaying(false);
      return;
    }
    const timer = setTimeout(() => setIndex((i) => i + 1), 600 / speed);
    return () => clearTimeout(timer);
  }, [playing, index, speed, trace.length]);
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
      if (!input.trim()) throw new Error("Enter 1–50 integers.");
      if (algorithm.endsWith("search") && !target.trim())
        throw new Error("Enter an integer target.");
      const parsed = input
        .trim()
        .split(/[\s,]+/)
        .filter(Boolean)
        .map(Number);
      if (sort) parsed.sort((a, b) => a - b);
      const t = Number(target);
      buildTrace(parsed, algorithm, t);
      setValues(parsed);
      setActiveTarget(t);
      if (sort) setInput(parsed.join(", "));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function change(value: string) {
    setPlaying(false);
    setIndex(0);
    setInput(value);
    setError("Input changed. Apply input to start a new trace.");
  }
  const last = index === trace.length - 1;
  return (
    <div className="visualizer">
      <Card>
        <div className="filter-row">
          <Field
            label="Array values"
            hint="1–50 integers, −999 to 999; separated by commas or spaces."
          >
            <input value={input} onChange={(e) => change(e.target.value)} />
          </Field>
          {algorithm.endsWith("search") && (
            <Field label="Target">
              <input
                type="number"
                min={-999}
                max={999}
                value={target}
                onChange={(e) => {
                  setPlaying(false);
                  setIndex(0);
                  setTarget(e.target.value);
                  setError("Target changed. Apply input to continue.");
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
          <div className="array-scroll" tabIndex={0} aria-label="Array state">
            <div className="array-track">
              {step.values.map((value, i) => (
                <motion.div
                  key={i}
                  className={`array-cell ${step.active.includes(i) ? "active" : ""} ${step.sorted.includes(i) ? "sorted" : ""}`}
                  animate={{
                    y: reduced ? 0 : step.active.includes(i) ? -6 : 0,
                  }}
                  transition={{
                    duration: reduced ? 0 : Math.min(0.2, 0.45 / speed),
                  }}
                >
                  <span className="index">{i}</span>
                  <strong>{value}</strong>
                  <span className="cell-role">
                    {step.found === i
                      ? "match"
                      : step.active.includes(i)
                        ? "active"
                        : step.sorted.includes(i)
                          ? "sorted"
                          : "value"}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
          {step.auxiliary.length > 0 && (
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
              onClick={() => setPlaying((p) => !p)}
              disabled={last || !!error}
            >
              {playing ? "Pause" : "Play"}
            </Button>
            <Button
              kind="secondary"
              disabled={index === 0 || !!error}
              onClick={() => {
                setPlaying(false);
                setIndex((i) => i - 1);
              }}
            >
              Previous step
            </Button>
            <Button
              kind="secondary"
              disabled={last || !!error}
              onClick={() => {
                setPlaying(false);
                setIndex((i) => i + 1);
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
                onChange={(e) => setSpeed(Number(e.target.value))}
              >
                {[0.25, 0.5, 1, 2, 4].map((v) => (
                  <option key={v} value={v}>
                    {v}×
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </Card>
        <Card>
          <h3>Pseudocode</h3>
          <ol className="pseudocode">
            {algorithms[algorithm].pseudocode.map((line, i) => (
              <li key={line} className={step.line === i ? "current" : ""}>
                {line}
              </li>
            ))}
          </ol>
          <h3>Complexity</h3>
          <p>{algorithms[algorithm].complexity}</p>
          <p className="muted">
            Visual exploration does not affect quiz mastery.
          </p>
        </Card>
      </div>
      <Card>
        <details>
          <summary>Accessible step transcript ({trace.length} states)</summary>
          <ol className="transcript">
            {trace.map((s, i) => (
              <li key={i}>
                <strong>Step {i}.</strong> {s.description} Array: [
                {s.values.join(", ")}].
              </li>
            ))}
          </ol>
        </details>
      </Card>
    </div>
  );
}
