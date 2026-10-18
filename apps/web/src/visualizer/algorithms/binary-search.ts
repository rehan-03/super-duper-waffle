import type { AlgorithmDefinition, ElementState, VisualizerStep } from "../types";

export const binarySearchPseudocode = [
  "binarySearch(array, target):",
  "  low = 0; high = n - 1",
  "  while low <= high:",
  "    mid = floor((low + high) / 2)   // Probe midpoint",
  "    if array[mid] == target: return mid // Found!",
  "    if array[mid] < target: low = mid + 1 // Discard left half",
  "    else: high = mid - 1          // Discard right half",
  "  return -1                     // Target not found",
];

export const binarySearchDefinition: AlgorithmDefinition = {
  id: "binary-search",
  name: "Binary Search",
  category: "searching",
  description:
    "An efficient algorithm for finding an item in a sorted array by repeatedly halving the search interval. If the probe value is less than the target, the left half is discarded; otherwise the right half is discarded.",
  requiresTarget: true,
  requiresSortedInput: true,
  complexity: {
    best: "O(1) at midpoint",
    average: "O(log n)",
    worst: "O(log n)",
    space: "O(1)",
  },
  pseudocode: binarySearchPseudocode,
  generateSteps: (initialValues: number[], options?: { target?: number }): VisualizerStep[] => {
    // Binary search requires a sorted array
    const sorted = [...initialValues].sort((a, b) => a - b);
    const n = sorted.length;
    const keys = sorted.map((val, idx) => `item-${idx}-${val}`);

    const target = options?.target !== undefined ? options.target : sorted[Math.floor(n / 2)] ?? 42;

    const steps: VisualizerStep[] = [];
    let comparisons = 0;
    let swaps = 0;
    let shifts = 0;
    let writes = 0;
    let operations = 0;
    let stepCount = 0;

    const discardedSet = new Set<number>();

    function makeStates(
      low: number,
      mid: number | null,
      high: number,
      overrides: Record<number, ElementState> = {},
    ): ElementState[] {
      return sorted.map((_, idx) => {
        if (overrides[idx]) return overrides[idx]!;
        if (idx === mid) return "active";
        if (idx < low || idx > high || discardedSet.has(idx)) return "discarded";
        return "default";
      });
    }

    function recordStep(
      type: VisualizerStep["type"],
      indices: number[],
      pseudocodeLine: number,
      description: string,
      pointers?: Record<string, number | null>,
      customStates?: ElementState[],
      foundIndex?: number | null,
    ) {
      stepCount++;
      operations++;
      steps.push({
        id: `bin-step-${stepCount}`,
        type,
        values: [...sorted],
        keys: [...keys],
        indices: [...indices],
        states: customStates ?? sorted.map(() => "default"),
        pseudocodeLine,
        description,
        counters: { comparisons, swaps, shifts, writes, operations },
        pointers,
        fadedIndices: Array.from(discardedSet),
        searchFoundIndex: foundIndex,
      });
    }

    recordStep(
      "init",
      [],
      1,
      `Binary Search initialized on sorted array of ${n} elements. Searching for target = ${target}.`,
      { low: 0, mid: null, high: n - 1 },
      makeStates(0, null, n - 1),
    );

    let low = 0;
    let high = n - 1;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      comparisons++;

      recordStep(
        "visit",
        [mid],
        3,
        `Probing midpoint: low = ${low}, high = ${high}. Calculated mid = floor((${low} + ${high}) / 2) = ${mid} (value ${sorted[mid]}).`,
        { low, mid, high },
        makeStates(low, mid, high, { [mid]: "comparing" }),
      );

      if (sorted[mid] === target) {
        recordStep(
          "complete",
          [mid],
          4,
          `MATCH FOUND! Target ${target} matches array[${mid}] = ${sorted[mid]} after ${comparisons} comparison${comparisons === 1 ? "" : "s"}!`,
          { low, mid, high },
          makeStates(low, mid, high, { [mid]: "sorted" }),
          mid,
        );
        return steps;
      }

      if (sorted[mid]! < target) {
        // Discard left half [low..mid]
        for (let k = low; k <= mid; k++) discardedSet.add(k);

        recordStep(
          "discard",
          [mid],
          5,
          `array[${mid}] = ${sorted[mid]} < target ${target}. Since array is sorted, all elements from index ${low} to ${mid} are discarded (faded out). Moving low to ${mid + 1}.`,
          { low: mid + 1, mid, high },
          makeStates(mid + 1, null, high),
        );

        low = mid + 1;
      } else {
        // Discard right half [mid..high]
        for (let k = mid; k <= high; k++) discardedSet.add(k);

        recordStep(
          "discard",
          [mid],
          6,
          `array[${mid}] = ${sorted[mid]} > target ${target}. Since array is sorted, all elements from index ${mid} to ${high} are discarded (faded out). Moving high to ${mid - 1}.`,
          { low, mid, high: mid - 1 },
          makeStates(low, null, mid - 1),
        );

        high = mid - 1;
      }
    }

    recordStep(
      "complete",
      [],
      7,
      `Search range exhausted (low ${low} > high ${high}). Target ${target} does not exist in the sorted array.`,
      { low, mid: null, high },
      sorted.map(() => "discarded"),
      null,
    );

    return steps;
  },
};
