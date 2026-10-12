import { AnimatePresence, motion } from "motion/react";
import type { TraceStep } from "@algolearn/shared";

function state(step: TraceStep, index: number) {
  if (step.found === index) return "match";
  if (step.active.includes(index)) return "active";
  if (step.frontier.includes(index)) return "frontier";
  if (step.visited.includes(index)) return "visited";
  if (step.sorted.includes(index)) return "sorted";
  return "value";
}

function Node({
  step,
  index,
  value,
  speed,
  reduced,
}: {
  step: TraceStep;
  index: number;
  value: number;
  speed: number;
  reduced: boolean;
}) {
  const role = state(step, index);
  return (
    <motion.div
      layout
      initial={reduced ? false : { opacity: 0, scale: 0.72 }}
      animate={{
        opacity: 1,
        scale: role === "active" || role === "match" ? 1.1 : 1,
        y: reduced ? 0 : role === "active" || role === "match" ? -5 : 0,
      }}
      exit={reduced ? undefined : { opacity: 0, scale: 0.72 }}
      transition={{ duration: reduced ? 0 : Math.min(0.24, 0.5 / speed) }}
      className={`structure-node ${role}`}
      aria-label={`${value}, ${role}`}
    >
      <strong>{value}</strong>
      <small>{role}</small>
    </motion.div>
  );
}

export function StructureView({
  step,
  speed,
  reduced,
}: {
  step: TraceStep;
  speed: number;
  reduced: boolean;
}) {
  if (step.kind === "array")
    return (
      <div className="array-track" data-visualizer-kind="array">
        {step.values.map((value, index) => (
          <motion.div
            layout
            key={`${index}-${value}`}
            className={`array-cell ${step.active.includes(index) ? "active" : ""} ${step.sorted.includes(index) ? "sorted" : ""} ${step.visited.includes(index) ? "visited" : ""}`}
            animate={{
              y: reduced ? 0 : step.active.includes(index) ? -6 : 0,
              scale: step.found === index ? 1.08 : 1,
            }}
            transition={{
              duration: reduced ? 0 : Math.min(0.2, 0.45 / speed),
            }}
          >
            <span className="index">{index}</span>
            <strong>{value}</strong>
            <span className="cell-role">{state(step, index)}</span>
          </motion.div>
        ))}
      </div>
    );

  if (step.kind === "linked-list" || step.kind === "queue")
    return (
      <div
        className={`linear-structure ${step.kind}`}
        data-visualizer-kind={step.kind}
      >
        {step.values.length === 0 ? (
          <p className="empty-structure">Empty {step.kind}</p>
        ) : (
          <AnimatePresence initial={false} mode="popLayout">
            {step.values.map((value, index) => (
              <div className="linear-node-wrap" key={`${index}-${value}`}>
                <Node
                  step={step}
                  index={index}
                  value={value}
                  speed={speed}
                  reduced={reduced}
                />
                {index < step.values.length - 1 && (
                  <motion.span
                    className="node-arrow"
                    initial={reduced ? false : { scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                  >
                    →
                  </motion.span>
                )}
                <span className="endpoint-label">
                  {index === 0
                    ? step.kind === "queue"
                      ? "front"
                      : "head"
                    : index === step.values.length - 1
                      ? step.kind === "queue"
                        ? "rear"
                        : "tail"
                      : ""}
                </span>
              </div>
            ))}
          </AnimatePresence>
        )}
      </div>
    );

  if (step.kind === "stack")
    return (
      <div className="stack-structure" data-visualizer-kind="stack">
        <span className="stack-label">top</span>
        <AnimatePresence initial={false} mode="popLayout">
          {[...step.values].reverse().map((value, reverseIndex) => {
            const index = step.values.length - reverseIndex - 1;
            return (
              <Node
                key={`${index}-${value}`}
                step={step}
                index={index}
                value={value}
                speed={speed}
                reduced={reduced}
              />
            );
          })}
        </AnimatePresence>
        {!step.values.length && <p className="empty-structure">Empty stack</p>}
        <span className="stack-base" aria-hidden="true" />
      </div>
    );

  return (
    <div className={`node-map ${step.kind}`} data-visualizer-kind={step.kind}>
      <svg viewBox="0 0 100 100" aria-hidden="true">
        {step.edges.map(([from, to]) => {
          const start = step.positions[from],
            end = step.positions[to];
          if (!start || !end) return null;
          const active = step.active.includes(from) && step.active.includes(to);
          return (
            <motion.line
              key={`${from}-${to}`}
              x1={start.x}
              y1={start.y}
              x2={end.x}
              y2={end.y}
              className={active ? "active" : ""}
              initial={reduced ? false : { pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{
                duration: reduced ? 0 : Math.min(0.35, 0.7 / speed),
              }}
            />
          );
        })}
      </svg>
      {step.values.map((value, index) => {
        const position = step.positions[index];
        if (!position) return null;
        return (
          <motion.div
            layout
            key={`${index}-${value}`}
            className={`map-node ${state(step, index)}`}
            style={{ left: `${position.x}%`, top: `${position.y}%` }}
            initial={reduced ? false : { opacity: 0, scale: 0.5 }}
            animate={{
              opacity: 1,
              scale: step.active.includes(index) ? 1.14 : 1,
            }}
            transition={{ duration: reduced ? 0 : Math.min(0.25, 0.5 / speed) }}
            aria-label={`${step.kind === "graph" ? "Vertex" : "Tree node"} ${value}, ${state(step, index)}`}
          >
            {value}
          </motion.div>
        );
      })}
      {!step.values.length && <p className="empty-structure">Empty tree</p>}
    </div>
  );
}
