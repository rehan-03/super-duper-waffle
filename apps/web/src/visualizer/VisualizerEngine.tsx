import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  Play,
  Pause,
  RotateCcw,
  SkipBack,
  SkipForward,
  Sliders,
  Columns,
  Sparkles,
  Info,
  Code2,
  Gauge,
  Layers,
  Search,
  GitCommit,
  Network,
} from "lucide-react";
import { getMotionConfig } from "./motion-config";
import type {
  AlgorithmDefinition,
  ArrayPattern,
  ElementState,
  VisualizerStep,
} from "./types";
import { generateArray } from "./array-generator";
import {
  sortingAndSearchingAlgorithms,
  algorithmList,
  bubbleSortDefinition,
} from "./algorithms";
import { GraphCanvas } from "./GraphCanvas";

interface VisualizerEngineProps {
  algorithm?: AlgorithmDefinition;
  initialSize?: number;
  initialPattern?: ArrayPattern;
  mappedSourceNote?: ReactNode;
}

export function VisualizerEngine({
  algorithm: initialAlgorithm = bubbleSortDefinition,
  initialSize = 8,
  initialPattern = "random",
  mappedSourceNote,
}: VisualizerEngineProps) {
  // Current active algorithm definition
  const [selectedAlgoKey, setSelectedAlgoKey] = useState<string>(
    initialAlgorithm.id,
  );
  const activeAlgorithm =
    sortingAndSearchingAlgorithms[selectedAlgoKey] || initialAlgorithm;

  // Compare mode algorithm #2
  const [compareAlgoKey, setCompareAlgoKey] = useState<string>("quick-sort");
  const compareAlgorithm =
    sortingAndSearchingAlgorithms[compareAlgoKey] || sortingAndSearchingAlgorithms["quick-sort"]!;

  const [arraySize, setArraySize] = useState(initialSize);
  const [pattern, setPattern] = useState<ArrayPattern>(initialPattern);
  const [customInputText, setCustomInputText] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);

  // Search target value
  const [targetValue, setTargetValue] = useState<number>(45);

  // Raw array data generated from size/pattern
  const [rawValues, setRawValues] = useState<number[]>(() =>
    generateArray(initialSize, initialPattern, "", activeAlgorithm.requiresSortedInput),
  );

  // Playback state
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const [isCompareMode, setIsCompareMode] = useState(false);

  const reducedMotion = useReducedMotion() ?? false;
  const motionConfig = useMemo(
    () => getMotionConfig(reducedMotion, speedMultiplier),
    [reducedMotion, speedMultiplier],
  );

  // Generate primary algorithm trace steps
  const steps = useMemo(() => {
    return activeAlgorithm.generateSteps(rawValues, { target: targetValue });
  }, [activeAlgorithm, rawValues, targetValue]);

  // Generate compare algorithm trace steps
  const compareSteps = useMemo(() => {
    if (!isCompareMode) return [];
    return compareAlgorithm.generateSteps(rawValues, { target: targetValue });
  }, [isCompareMode, compareAlgorithm, rawValues, targetValue]);

  // Current active step snapshot
  const currentStep: VisualizerStep = steps[currentStepIndex] || steps[0]!;

  // Highest value in array to calculate proportional height
  const maxValue = useMemo(() => {
    return Math.max(...rawValues, 1);
  }, [rawValues]);

  // Update target when raw values change if target not in list
  useEffect(() => {
    if (activeAlgorithm.requiresTarget && rawValues.length > 0) {
      if (!rawValues.includes(targetValue)) {
        setTargetValue(rawValues[Math.floor(rawValues.length / 2)] ?? 45);
      }
    }
  }, [activeAlgorithm.requiresTarget, rawValues]);

  // Handle switching algorithm
  const handleSelectAlgorithm = (algoKey: string) => {
    setIsPlaying(false);
    setCurrentStepIndex(0);
    setSelectedAlgoKey(algoKey);
    const newAlgo = sortingAndSearchingAlgorithms[algoKey];
    if (newAlgo?.requiresSortedInput) {
      setRawValues((prev) => [...prev].sort((a, b) => a - b));
    }
  };

  // Regeneration handlers
  const handleRegenerate = (
    newPattern: ArrayPattern,
    newSize = arraySize,
  ) => {
    setIsPlaying(false);
    setCurrentStepIndex(0);
    setPattern(newPattern);
    const nextArr = generateArray(
      newSize,
      newPattern,
      customInputText,
      activeAlgorithm.requiresSortedInput,
    );
    setRawValues(nextArr);
  };

  const handleCustomApply = () => {
    handleRegenerate("custom");
    setShowCustomInput(false);
  };

  // Playback animation loop
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isPlaying) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    if (currentStepIndex >= steps.length - 1) {
      setIsPlaying(false);
      return;
    }

    const intervalMs = Math.max(80, Math.round(620 / speedMultiplier));

    timerRef.current = window.setTimeout(() => {
      setCurrentStepIndex((prev) => {
        if (prev >= steps.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, intervalMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isPlaying, currentStepIndex, steps.length, speedMultiplier]);

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      if (e.code === "Space") {
        e.preventDefault();
        if (currentStepIndex >= steps.length - 1) {
          setCurrentStepIndex(0);
          setIsPlaying(true);
        } else {
          setIsPlaying((prev) => !prev);
        }
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        setIsPlaying(false);
        setCurrentStepIndex((prev) => Math.min(steps.length - 1, prev + 1));
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        setIsPlaying(false);
        setCurrentStepIndex((prev) => Math.max(0, prev - 1));
      } else if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        setIsPlaying(false);
        setCurrentStepIndex(0);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentStepIndex, steps.length]);

  return (
    <div
      className="algo-engine-wrapper"
      tabIndex={0}
      aria-label={`${activeAlgorithm.name} Visualizer`}
    >
      {/* ── TOP HEADER & ALGORITHM SELECTOR & COMPARE TOGGLE ── */}
      <div className="algo-engine-header">
        <div className="algo-engine-title-row">
          <div className="algo-badge-group">
            <span className="algo-category-chip">
              {activeAlgorithm.category.toUpperCase()}
            </span>
            <span className="algo-status-chip">
              Step {currentStepIndex + 1} of {steps.length}
            </span>
          </div>

          <div className="algo-title-select-row">
            <select
              value={selectedAlgoKey}
              onChange={(e) => handleSelectAlgorithm(e.target.value)}
              className="algo-select-dropdown"
              aria-label="Choose algorithm"
            >
              <optgroup label="Sorting Algorithms">
                <option value="bubble-sort">Bubble Sort</option>
                <option value="selection-sort">Selection Sort</option>
                <option value="insertion-sort">Insertion Sort</option>
                <option value="merge-sort">Merge Sort</option>
                <option value="quick-sort">Quick Sort</option>
                <option value="heap-sort">Heap Sort</option>
                <option value="shell-sort">Shell Sort</option>
                <option value="radix-sort">Radix Sort (LSD)</option>
              </optgroup>
              <optgroup label="Searching Algorithms">
                <option value="linear-search">Linear Search</option>
                <option value="binary-search">Binary Search</option>
              </optgroup>
              <optgroup label="Graph Algorithms">
                <option value="breadth-first-search">Breadth-First Search (BFS)</option>
                <option value="depth-first-search">Depth-First Search (DFS)</option>
              </optgroup>
            </select>
          </div>

          <p className="algo-subtitle">{activeAlgorithm.description}</p>
        </div>

        <div className="algo-header-actions">
          {activeAlgorithm.requiresTarget && (
            <div className="algo-target-input-group">
              <Search size={15} className="algo-icon-muted" />
              <span className="algo-label-small">Target:</span>
              <input
                type="number"
                value={targetValue}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setTargetValue(val);
                  setCurrentStepIndex(0);
                }}
                className="algo-target-field"
                aria-label="Target search value"
              />
            </div>
          )}

          <button
            type="button"
            className={`algo-pill-btn ${isCompareMode ? "active" : ""}`}
            onClick={() => setIsCompareMode((prev) => !prev)}
            title="Toggle side-by-side comparison mode"
          >
            <Columns size={16} />
            {isCompareMode ? "Exit Compare Mode" : "Compare Two Algorithms"}
          </button>
        </div>
      </div>

      {mappedSourceNote && (
        <div className="algo-mapped-note">{mappedSourceNote}</div>
      )}

      {/* ── INTERACTIVE PLAYBACK TOOLBAR ── */}
      <div
        className="algo-toolbar"
        role="toolbar"
        aria-label="Simulation Playback Controls"
      >
        {/* Playback Controls */}
        <div className="algo-toolbar-playback">
          <button
            type="button"
            className="algo-btn-action"
            onClick={() => {
              setIsPlaying(false);
              setCurrentStepIndex(0);
            }}
            title="Restart from beginning (Key: R)"
            aria-label="Restart"
          >
            <RotateCcw size={16} />
          </button>

          <button
            type="button"
            className="algo-btn-action"
            disabled={currentStepIndex === 0}
            onClick={() => {
              setIsPlaying(false);
              setCurrentStepIndex((p) => Math.max(0, p - 1));
            }}
            title="Step Back (Key: ←)"
            aria-label="Step back"
          >
            <SkipBack size={16} />
          </button>

          <button
            type="button"
            className={`algo-btn-play ${isPlaying ? "playing" : ""}`}
            onClick={() => {
              if (currentStepIndex >= steps.length - 1) {
                setCurrentStepIndex(0);
                setIsPlaying(true);
              } else {
                setIsPlaying((p) => !p);
              }
            }}
            title="Play / Pause (Key: Space)"
            aria-label={isPlaying ? "Pause simulation" : "Play simulation"}
          >
            {isPlaying ? (
              <Pause size={18} />
            ) : (
              <Play size={18} fill="currentColor" />
            )}
            <span>
              {isPlaying
                ? "Pause"
                : currentStepIndex >= steps.length - 1
                  ? "Replay"
                  : "Play"}
            </span>
          </button>

          <button
            type="button"
            className="algo-btn-action"
            disabled={currentStepIndex >= steps.length - 1}
            onClick={() => {
              setIsPlaying(false);
              setCurrentStepIndex((p) => Math.min(steps.length - 1, p + 1));
            }}
            title="Step Forward (Key: →)"
            aria-label="Step forward"
          >
            <SkipForward size={16} />
          </button>
        </div>

        {/* Speed Slider */}
        <div className="algo-toolbar-speed">
          <Gauge size={16} className="algo-icon-muted" />
          <span className="algo-label-small">Speed:</span>
          <div className="algo-speed-presets">
            {[0.5, 1, 2, 4].map((spd) => (
              <button
                key={spd}
                type="button"
                className={`algo-speed-chip ${speedMultiplier === spd ? "active" : ""}`}
                onClick={() => setSpeedMultiplier(spd)}
              >
                {spd}×
              </button>
            ))}
          </div>
        </div>

        {/* Array Size & Pattern Preset Controls */}
        <div className="algo-toolbar-presets">
          <div className="algo-size-control">
            <Sliders size={15} className="algo-icon-muted" />
            <span className="algo-label-small">Size ({arraySize}):</span>
            <input
              type="range"
              min={5}
              max={16}
              value={arraySize}
              onChange={(e) => {
                const next = Number(e.target.value);
                setArraySize(next);
                handleRegenerate(pattern, next);
              }}
              className="algo-range-slider"
              aria-label="Array size"
            />
          </div>

          <div className="algo-pattern-buttons">
            <button
              type="button"
              className={`algo-pattern-btn ${pattern === "random" ? "active" : ""}`}
              onClick={() => handleRegenerate("random")}
              title="Generate random array"
            >
              Random
            </button>
            <button
              type="button"
              className={`algo-pattern-btn ${pattern === "reversed" ? "active" : ""}`}
              onClick={() => handleRegenerate("reversed")}
              title="Generate reversed (worst-case) array"
            >
              Reversed
            </button>
            <button
              type="button"
              className={`algo-pattern-btn ${pattern === "nearly-sorted" ? "active" : ""}`}
              onClick={() => handleRegenerate("nearly-sorted")}
              title="Generate nearly-sorted array"
            >
              Nearly-Sorted
            </button>
            <button
              type="button"
              className={`algo-pattern-btn ${pattern === "duplicates" ? "active" : ""}`}
              onClick={() => handleRegenerate("duplicates")}
              title="Generate duplicate-heavy array"
            >
              Duplicates
            </button>
            <button
              type="button"
              className={`algo-pattern-btn ${pattern === "custom" || showCustomInput ? "active" : ""}`}
              onClick={() => setShowCustomInput((prev) => !prev)}
              title="Enter custom array numbers"
            >
              Custom...
            </button>
          </div>
        </div>
      </div>

      {/* Custom input drawer if expanded */}
      {showCustomInput && (
        <div className="algo-custom-input-bar">
          <input
            type="text"
            placeholder="e.g. 45, 12, 89, 34, 70, 23"
            value={customInputText}
            onChange={(e) => setCustomInputText(e.target.value)}
            className="algo-custom-field"
          />
          <button
            type="button"
            className="algo-btn-primary"
            onClick={handleCustomApply}
          >
            Apply Custom Values
          </button>
        </div>
      )}

      {/* ── MAIN WORKSPACE: CANVAS + SIDE PANELS ── */}
      <div className="algo-workspace-grid">
        {/* PRIMARY CANVAS CARD */}
        <div className="algo-canvas-card">
          <div className="algo-canvas-header">
            <div className="algo-canvas-status">
              <span className={`algo-state-indicator ${currentStep.type}`} />
              <span className="algo-action-title">
                {currentStep.type === "compare"
                  ? "Comparing Elements"
                  : currentStep.type === "swap"
                    ? "Swapping Elements"
                    : currentStep.type === "shift"
                      ? "Shifting Element"
                      : currentStep.type === "write"
                        ? "Writing Value"
                        : currentStep.type === "mark-sorted"
                          ? "Element Settled in Final Position"
                          : currentStep.type === "discard"
                            ? "Discarding Sub-Array Half"
                            : currentStep.type === "complete"
                              ? currentStep.searchFoundIndex !== undefined &&
                                currentStep.searchFoundIndex !== null
                                ? `Target Found at Index ${currentStep.searchFoundIndex}!`
                                : currentStep.searchFoundIndex === null
                                  ? "Target Not Found in Array"
                                  : "Operation Complete"
                              : "Ready"}
              </span>
            </div>
            <div className="algo-progress-pill">
              {Math.round(((currentStepIndex + 1) / steps.length) * 100)}% Complete
            </div>
          </div>

          {/* ACTIVE GAP BADGE (FOR SHELL SORT) */}
          {currentStep.gap !== undefined && (
            <div className="algo-gap-badge-wrap">
              <span className="algo-gap-badge">Active Gap Stride: h = {currentStep.gap}</span>
            </div>
          )}

          {/* GRAPH CANVAS STAGE (FOR BFS, DFS, AND GRAPH ALGORITHMS) */}
          {currentStep.graphVertices && currentStep.graphEdges ? (
            <GraphCanvas
              vertices={currentStep.graphVertices}
              edges={currentStep.graphEdges}
            />
          ) : (
            /* THE ARRAY BARS TRACK WITH FRAMER MOTION SPRINGS */
            <div
              className="algo-bars-stage"
              role="region"
              aria-live="polite"
              aria-label="Algorithm visualization canvas"
            >
              <div className="algo-bars-track">
                {currentStep.values.map((val, idx) => {
                  const itemState: ElementState =
                    currentStep.states[idx] || "default";
                  const isEngaged = currentStep.indices.includes(idx);
                  const heightPercent = Math.max(
                    18,
                    Math.round((val / maxValue) * 86),
                  );
                  const itemKey = currentStep.keys[idx] ?? `item-${idx}`;

                  // Check for named pointers on this index
                  const activePointers: string[] = [];
                  if (currentStep.pointers) {
                    for (const [name, pos] of Object.entries(
                      currentStep.pointers,
                    )) {
                      if (pos === idx) activePointers.push(name);
                    }
                  }

                  // Check if discarded (binary search)
                  const isFaded =
                    currentStep.fadedIndices?.includes(idx) ||
                    itemState === "discarded";

                  return (
                    <motion.div
                      key={itemKey}
                      layout
                      transition={motionConfig.swapSpring}
                      className={`algo-bar-slot state-${itemState} ${isEngaged ? "engaged" : ""} ${isFaded ? "faded-slot" : ""}`}
                      style={{ opacity: isFaded ? 0.25 : 1 }}
                    >
                      {/* Active Named Pointers (pivot, i, j, low, mid, high, etc.) */}
                      {activePointers.length > 0 && (
                        <div className="algo-pointer-badge-wrap">
                          {activePointers.map((ptr) => (
                            <span
                              key={ptr}
                              className={`algo-pointer-chip ptr-${ptr}`}
                            >
                              {ptr}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Floating Value Tag */}
                      <motion.div
                        className="algo-bar-value-pill"
                        animate={{
                          scale:
                            itemState === "swapping" || itemState === "shifting"
                              ? 1.15
                              : itemState === "comparing" || itemState === "pivot"
                                ? 1.08
                                : 1,
                          y:
                            itemState === "swapping" || itemState === "shifting"
                              ? -8
                              : itemState === "comparing"
                                ? -4
                                : 0,
                        }}
                        transition={motionConfig.compareSpring}
                      >
                        {val}
                      </motion.div>

                      {/* Animated Vertical Bar */}
                      <motion.div
                        className={`algo-bar-pillar ${itemState}`}
                        style={{ height: `${heightPercent}%` }}
                        animate={{ opacity: 1, scaleY: 1 }}
                        transition={motionConfig.compareSpring}
                      >
                        <div className="algo-pillar-glass" />
                      </motion.div>

                      {/* Array Index Underneath */}
                      <span className="algo-bar-index">[{idx}]</span>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 10 DIGIT BUCKETS STAGE (FOR RADIX SORT) */}
          {currentStep.buckets && (
            <div className="algo-buckets-stage">
              <span className="algo-label-small">LSD Digit Buckets [0..9]:</span>
              <div className="algo-buckets-grid">
                {currentStep.buckets.map((bucket) => (
                  <div key={`bucket-${bucket.index}`} className="algo-bucket-slot">
                    <span className="algo-bucket-num">Bucket {bucket.index}</span>
                    <div className="algo-bucket-items">
                      {bucket.values.length > 0 ? (
                        bucket.values.map((v, i) => (
                          <span key={i} className="algo-bucket-item-chip">
                            {v}
                          </span>
                        ))
                      ) : (
                        <span className="algo-bucket-empty">—</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* DUAL HEAP TREE VIEW (FOR HEAP SORT) */}
          {currentStep.treeNodes && currentStep.treeNodes.length > 0 && (
            <div className="algo-heap-tree-stage">
              <div className="algo-tree-header">
                <Network size={16} color="#4338ca" />
                <span className="algo-label-small">
                  Synchronized Complete Binary Heap Tree:
                </span>
              </div>
              <div className="algo-tree-svg-container">
                <svg className="algo-tree-svg" viewBox="0 0 100 90">
                  {currentStep.treeEdges?.map(([from, to]) => {
                    const startNode = currentStep.treeNodes?.[from];
                    const endNode = currentStep.treeNodes?.[to];
                    if (!startNode || !endNode) return null;
                    return (
                      <line
                        key={`edge-${from}-${to}`}
                        x1={`${startNode.x}%`}
                        y1={`${startNode.y}%`}
                        x2={`${endNode.x}%`}
                        y2={`${endNode.y}%`}
                        className="algo-tree-edge"
                      />
                    );
                  })}
                </svg>

                {currentStep.treeNodes.map((node) => (
                  <motion.div
                    key={`tree-node-${node.index}`}
                    layout
                    transition={motionConfig.swapSpring}
                    className={`algo-tree-circle-node ${node.state}`}
                    style={{ left: `${node.x}%`, top: `${node.y}%` }}
                  >
                    <strong>{node.value}</strong>
                    <span className="algo-tree-node-idx">[{node.index}]</span>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* AUXILIARY BUFFER (FOR MERGE SORT) */}
          {currentStep.auxiliaryArray && (
            <div className="algo-aux-stage">
              <div className="algo-aux-header">
                <span className="algo-label-small">
                  {currentStep.auxiliaryArray.label}:
                </span>
              </div>
              <div className="algo-aux-slots">
                {currentStep.auxiliaryArray.values.map((val, idx) => {
                  const isSlotActive =
                    currentStep.auxiliaryArray?.activeIndices?.includes(idx);
                  return (
                    <div
                      key={`aux-${idx}`}
                      className={`algo-aux-slot ${val !== null ? "filled" : "empty"} ${isSlotActive ? "active" : ""}`}
                    >
                      <span className="algo-aux-val">{val !== null ? val : "—"}</span>
                      <span className="algo-aux-idx">[{idx}]</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Color-Coded States Legend */}
          <div className="algo-legend-bar" aria-label="Color coding legend">
            <span className="algo-legend-label">Legend:</span>
            <div className="algo-legend-item">
              <span className="algo-legend-dot dot-default" />
              <span>Unsorted</span>
            </div>
            <div className="algo-legend-item">
              <span className="algo-legend-dot dot-comparing" />
              <span>Comparing (Amber)</span>
            </div>
            <div className="algo-legend-item">
              <span className="algo-legend-dot dot-swapping" />
              <span>Swapping/Shifting (Rose)</span>
            </div>
            <div className="algo-legend-item">
              <span className="algo-legend-dot dot-sorted" />
              <span>Sorted / Found (Emerald)</span>
            </div>
            <div className="algo-legend-item">
              <span className="algo-legend-dot dot-active" />
              <span>Active / Pivot (Indigo)</span>
            </div>
          </div>

          {/* Plain-English Caption Card */}
          <div className="algo-caption-card">
            <div className="algo-caption-icon">
              <Info size={20} color="#4338ca" />
            </div>
            <div className="algo-caption-body">
              <span className="algo-caption-heading">Step Explanation:</span>
              <p className="algo-caption-text">{currentStep.description}</p>
            </div>
          </div>
        </div>

        {/* SIDE PANELS: PSEUDOCODE + LIVE METRICS + CALL STACK + COMPLEXITY */}
        <div className="algo-side-panels">
          {/* Live Metrics Counters (Comparisons, Swaps, Shifts, Writes) */}
          <div className="algo-panel-card metrics-card">
            <div className="algo-panel-title">
              <Gauge size={16} className="algo-brand-icon" />
              <h3>Live Performance Counters</h3>
            </div>
            <div className="algo-metrics-grid four-cols">
              <div className="algo-metric-tile">
                <span className="algo-metric-number">
                  {currentStep.counters.comparisons}
                </span>
                <span className="algo-metric-label">Comparisons</span>
              </div>
              <div className="algo-metric-tile">
                <span className="algo-metric-number">
                  {currentStep.counters.swaps}
                </span>
                <span className="algo-metric-label">Swaps</span>
              </div>
              <div className="algo-metric-tile">
                <span className="algo-metric-number">
                  {currentStep.counters.shifts}
                </span>
                <span className="algo-metric-label">Shifts</span>
              </div>
              <div className="algo-metric-tile">
                <span className="algo-metric-number">
                  {currentStep.counters.writes}
                </span>
                <span className="algo-metric-label">Writes</span>
              </div>
            </div>
          </div>

          {/* Call Stack Panel (for Recursive Algorithms: Merge Sort, Quick Sort) */}
          {currentStep.callStack && currentStep.callStack.length > 0 && (
            <div className="algo-panel-card callstack-card">
              <div className="algo-panel-title">
                <GitCommit size={16} className="algo-brand-icon" />
                <h3>Recursion Call Stack</h3>
              </div>
              <div className="algo-callstack-list">
                {currentStep.callStack.map((frame, idx) => (
                  <div
                    key={idx}
                    className={`algo-callstack-item ${idx === currentStep.callStack!.length - 1 ? "top-frame" : ""}`}
                  >
                    <span className="algo-frame-badge">
                      {idx === currentStep.callStack!.length - 1 ? "TOP" : `${idx + 1}`}
                    </span>
                    <code>{frame}</code>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* LIVE QUEUE PANEL (FOR BFS) */}
          {currentStep.queue && (
            <div className="algo-panel-card queue-card">
              <div className="algo-panel-title">
                <Layers size={16} className="algo-brand-icon" />
                <h3>Live FIFO Queue ({currentStep.queue.length})</h3>
              </div>
              <div className="algo-queue-container">
                {currentStep.queue.length > 0 ? (
                  <div className="algo-queue-items">
                    {currentStep.queue.map((item, idx) => (
                      <div
                        key={idx}
                        className={`algo-queue-cell ${idx === 0 ? "front" : idx === currentStep.queue!.length - 1 ? "rear" : ""}`}
                      >
                        <span className="algo-queue-val">{item}</span>
                        <span className="algo-queue-tag">
                          {idx === 0 ? "FRONT" : idx === currentStep.queue!.length - 1 ? "REAR" : `#${idx}`}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="algo-empty-queue">Queue is empty</div>
                )}
              </div>
            </div>
          )}

          {/* LIVE STACK PANEL (FOR DFS) */}
          {currentStep.stack && (
            <div className="algo-panel-card stack-card">
              <div className="algo-panel-title">
                <GitCommit size={16} className="algo-brand-icon" />
                <h3>Live LIFO Stack ({currentStep.stack.length})</h3>
              </div>
              <div className="algo-stack-container">
                {currentStep.stack.length > 0 ? (
                  <div className="algo-stack-items">
                    {[...currentStep.stack].reverse().map((item, revIdx) => {
                      const isTop = revIdx === 0;
                      return (
                        <div
                          key={revIdx}
                          className={`algo-stack-cell ${isTop ? "top" : ""}`}
                        >
                          <span className="algo-stack-val">{item}</span>
                          <span className="algo-stack-tag">
                            {isTop ? "TOP" : `#${currentStep.stack!.length - 1 - revIdx}`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="algo-empty-queue">Stack is empty</div>
                )}
              </div>
            </div>
          )}

          {/* Highlighted Pseudocode Line */}
          <div className="algo-panel-card pseudocode-card">
            <div className="algo-panel-title">
              <Code2 size={16} className="algo-brand-icon" />
              <h3>Pseudocode Execution</h3>
            </div>
            <div className="algo-code-lines">
              {activeAlgorithm.pseudocode.map((line, idx) => {
                const isActive = currentStep.pseudocodeLine === idx;
                return (
                  <div
                    key={idx}
                    className={`algo-code-line ${isActive ? "active-line" : ""}`}
                  >
                    <span className="algo-line-num">{idx + 1}</span>
                    <span className="algo-line-text">{line}</span>
                    {isActive && (
                      <motion.span
                        layoutId="activeCodeIndicator"
                        className="algo-code-indicator"
                        transition={motionConfig.compareSpring}
                      >
                        ◀
                      </motion.span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Complexity Reference */}
          <div className="algo-panel-card complexity-card">
            <div className="algo-panel-title">
              <Layers size={16} className="algo-brand-icon" />
              <h3>Asymptotic Complexity</h3>
            </div>
            <div className="algo-complexity-list">
              <div className="algo-complexity-row">
                <span className="algo-comp-type">Best Case:</span>
                <code className="algo-comp-badge best">
                  {activeAlgorithm.complexity.best}
                </code>
              </div>
              <div className="algo-complexity-row">
                <span className="algo-comp-type">Average Case:</span>
                <code className="algo-comp-badge average">
                  {activeAlgorithm.complexity.average}
                </code>
              </div>
              <div className="algo-complexity-row">
                <span className="algo-comp-type">Worst Case:</span>
                <code className="algo-comp-badge worst">
                  {activeAlgorithm.complexity.worst}
                </code>
              </div>
              <div className="algo-complexity-row">
                <span className="algo-comp-type">Space Overhead:</span>
                <code className="algo-comp-badge space">
                  {activeAlgorithm.complexity.space}
                </code>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── SIDE-BY-SIDE COMPARE TWO ALGORITHMS MODE ── */}
      {isCompareMode && (
        <div className="algo-compare-section">
          <div className="algo-compare-header">
            <div className="row spread">
              <div className="row" style={{ gap: 8 }}>
                <Sparkles size={20} color="#4338ca" />
                <h3 style={{ margin: 0 }}>Side-by-Side Algorithm Comparison</h3>
              </div>
              <div className="row" style={{ gap: 8 }}>
                <span className="algo-label-small">Compare with:</span>
                <select
                  value={compareAlgoKey}
                  onChange={(e) => setCompareAlgoKey(e.target.value)}
                  className="algo-select-dropdown small"
                >
                  {algorithmList
                    .filter((a) => a.id !== activeAlgorithm.id)
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>
            <p className="algo-compare-note">
              Executing both <strong>{activeAlgorithm.name}</strong> and{" "}
              <strong>{compareAlgorithm.name}</strong> on the exact same {rawValues.length} elements:
            </p>
          </div>

          <div className="algo-compare-duo">
            {/* Algorithm 1 Stats */}
            <div className="algo-duo-side">
              <h4>{activeAlgorithm.name}</h4>
              <p className="algo-muted-small">{activeAlgorithm.complexity.average}</p>
              <div className="algo-mini-stats-grid">
                <div className="algo-mini-stat">
                  <span className="val">
                    {steps[steps.length - 1]?.counters.comparisons ?? 0}
                  </span>
                  <span className="lbl">Comparisons</span>
                </div>
                <div className="algo-mini-stat">
                  <span className="val">
                    {steps[steps.length - 1]?.counters.swaps ?? 0}
                  </span>
                  <span className="lbl">Swaps</span>
                </div>
                <div className="algo-mini-stat">
                  <span className="val">
                    {steps[steps.length - 1]?.counters.writes ?? 0}
                  </span>
                  <span className="lbl">Writes</span>
                </div>
                <div className="algo-mini-stat">
                  <span className="val">{steps.length}</span>
                  <span className="lbl">Total Steps</span>
                </div>
              </div>
            </div>

            {/* Algorithm 2 Stats */}
            <div className="algo-duo-side accent">
              <h4>{compareAlgorithm.name}</h4>
              <p className="algo-muted-small">{compareAlgorithm.complexity.average}</p>
              <div className="algo-mini-stats-grid">
                <div className="algo-mini-stat">
                  <span className="val">
                    {compareSteps[compareSteps.length - 1]?.counters.comparisons ?? 0}
                  </span>
                  <span className="lbl">Comparisons</span>
                </div>
                <div className="algo-mini-stat">
                  <span className="val">
                    {compareSteps[compareSteps.length - 1]?.counters.swaps ?? 0}
                  </span>
                  <span className="lbl">Swaps</span>
                </div>
                <div className="algo-mini-stat">
                  <span className="val">
                    {compareSteps[compareSteps.length - 1]?.counters.writes ?? 0}
                  </span>
                  <span className="lbl">Writes</span>
                </div>
                <div className="algo-mini-stat">
                  <span className="val">{compareSteps.length}</span>
                  <span className="lbl">Total Steps</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
