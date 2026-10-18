/**
 * Core types for the AlgoLearn Reusable Visualization Engine.
 * A new algorithm only needs an AlgorithmDefinition with a `generateSteps` function.
 */

export type StepActionType =
  | "init"
  | "compare"
  | "swap"
  | "shift"
  | "write"
  | "visit"
  | "enqueue"
  | "dequeue"
  | "push"
  | "pop"
  | "backtrack"
  | "mark-sorted"
  | "reorder"
  | "discard"
  | "relax"
  | "complete";

export type ElementState =
  | "default"
  | "comparing"
  | "swapping"
  | "shifting"
  | "sorted"
  | "visited"
  | "active"
  | "pivot"
  | "frontier"
  | "backtrack"
  | "discarded";

export interface VisualizerCounters {
  comparisons: number;
  swaps: number;
  shifts: number;
  writes: number;
  operations: number;
}

export interface HeapTreeNode {
  index: number;
  value: number;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  state: ElementState;
}

export interface GraphVertex {
  id: number;
  label: string;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  state: ElementState;
  level?: number;
  distance?: number | string;
}

export interface GraphEdge {
  from: number;
  to: number;
  weight?: number;
  state: "default" | "active" | "traversed" | "backtrack" | "mst";
}

export interface BucketData {
  index: number;
  values: number[];
}

export interface DistanceTableRow {
  vertex: string;
  distance: number | string;
  predecessor: string | null;
  finalized: boolean;
}

export interface VisualizerStep {
  id: string;
  type: StepActionType;
  /** Snapshot of all element values at this step */
  values: number[];
  /** Stable item keys tracking identities across swaps/moves for spring animations */
  keys: string[];
  /** Indices involved in the current action */
  indices: number[];
  /** State of each index in the array */
  states: ElementState[];
  /** Active line in pseudocode (0-indexed) */
  pseudocodeLine: number;
  /** Plain-English caption explaining what and why */
  description: string;
  /** Live counter snapshots */
  counters: VisualizerCounters;
  /** Named pointers positioned on array indices (e.g., low, mid, high, i, j, pivot, min) */
  pointers?: Record<string, number | null>;
  /** Indices faded out (e.g., discarded half in binary search) */
  fadedIndices?: number[];
  /** Auxiliary storage area (e.g. temp array in merge sort) */
  auxiliaryArray?: {
    values: (number | null)[];
    label: string;
    activeIndices?: number[];
  };
  /** Call stack for recursive algorithms (e.g. quick sort, merge sort, DFS) */
  callStack?: string[];
  /** Synchronized heap tree nodes for heap sort */
  treeNodes?: HeapTreeNode[];
  treeEdges?: [number, number][];
  /** Search result */
  searchFoundIndex?: number | null;

  /** Graph visualization structures (BFS, DFS, Dijkstra, Prim, Kruskal, Topo) */
  graphVertices?: GraphVertex[];
  graphEdges?: GraphEdge[];
  queue?: (number | string)[];
  stack?: (number | string)[];
  priorityQueue?: { item: string | number; priority: number }[];
  distanceTable?: DistanceTableRow[];

  /** Bucket data for Radix Sort */
  buckets?: BucketData[];
  /** Active gap for Shell Sort */
  gap?: number;
}

export interface AlgorithmComplexity {
  best: string;
  average: string;
  worst: string;
  space: string;
}

export interface AlgorithmDefinition {
  id: string;
  name: string;
  category: "sorting" | "searching" | "graph" | "tree" | "linear" | "dp";
  description: string;
  requiresTarget?: boolean;
  requiresSortedInput?: boolean;
  isGraph?: boolean;
  complexity: AlgorithmComplexity;
  pseudocode: string[];
  generateSteps: (
    initialValues: number[],
    options?: { target?: number; graphEdges?: [number, number, number?][] },
  ) => VisualizerStep[];
}

export type ArrayPattern =
  | "random"
  | "reversed"
  | "nearly-sorted"
  | "duplicates"
  | "custom";
