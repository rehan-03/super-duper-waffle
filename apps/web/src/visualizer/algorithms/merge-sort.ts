import type { AlgorithmDefinition, ElementState, VisualizerStep } from "../types";

export const mergeSortPseudocode = [
  "mergeSort(lo, hi):",
  "  if hi - lo <= 1: return         // Base case: single element",
  "  mid = lo + floor((hi - lo) / 2) // Divide",
  "  mergeSort(lo, mid)              // Conquer left half",
  "  mergeSort(mid, hi)              // Conquer right half",
  "  merge(lo, mid, hi) into temp[]  // Merge sorted halves",
  "  copy temp[] back to array[lo..hi]",
  "array is completely sorted        // Done!",
];

export const mergeSortDefinition: AlgorithmDefinition = {
  id: "merge-sort",
  name: "Merge Sort",
  category: "sorting",
  description:
    "A divide-and-conquer algorithm that recursively splits the array into two halves, sorts each half, and merges the two sorted sub-arrays into a temporary buffer before copying them back.",
  complexity: {
    best: "O(n log n)",
    average: "O(n log n)",
    worst: "O(n log n)",
    space: "O(n) auxiliary",
  },
  pseudocode: mergeSortPseudocode,
  generateSteps: (initialValues: number[]): VisualizerStep[] => {
    const n = initialValues.length;
    const a = [...initialValues];
    const keys = initialValues.map((val, idx) => `item-${idx}-${val}`);

    const steps: VisualizerStep[] = [];
    let comparisons = 0;
    let swaps = 0;
    let shifts = 0;
    let writes = 0;
    let operations = 0;
    let stepCount = 0;

    const callStack: string[] = [];
    let tempBuffer: (number | null)[] = new Array(n).fill(null);

    function makeStates(
      activeRange?: [number, number],
      overrides: Record<number, ElementState> = {},
    ): ElementState[] {
      return a.map((_, idx) => {
        if (overrides[idx]) return overrides[idx]!;
        if (activeRange && (idx < activeRange[0] || idx >= activeRange[1])) {
          return "default";
        }
        return "visited";
      });
    }

    function recordStep(
      type: VisualizerStep["type"],
      indices: number[],
      pseudocodeLine: number,
      description: string,
      pointers?: Record<string, number | null>,
      customStates?: ElementState[],
      activeAuxIndices?: number[],
    ) {
      stepCount++;
      operations++;
      steps.push({
        id: `merge-step-${stepCount}`,
        type,
        values: [...a],
        keys: [...keys],
        indices: [...indices],
        states: customStates ?? a.map(() => "default"),
        pseudocodeLine,
        description,
        counters: { comparisons, swaps, shifts, writes, operations },
        pointers,
        callStack: [...callStack],
        auxiliaryArray: {
          values: [...tempBuffer],
          label: "Temporary Merge Buffer (auxiliary O(n) memory)",
          activeIndices: activeAuxIndices,
        },
      });
    }

    callStack.push(`mergeSort(0, ${n})`);
    recordStep(
      "init",
      [],
      0,
      `Starting Merge Sort on ${n} elements. We will divide the array recursively until sub-arrays of size 1 are reached.`,
      { lo: 0, hi: n },
    );

    function sort(lo: number, hi: number) {
      if (hi - lo <= 1) {
        recordStep(
          "visit",
          [lo],
          1,
          `Sub-array [${lo}..${hi - 1}] has length ${hi - lo} (value ${a[lo]}). Already sorted by base case.`,
          { lo, hi },
          makeStates([lo, hi], { [lo]: "active" }),
        );
        return;
      }

      const mid = lo + Math.floor((hi - lo) / 2);

      recordStep(
        "visit",
        [lo, mid, hi - 1],
        2,
        `Dividing range [${lo}..${hi - 1}] at mid = ${mid}. Left half: [${lo}..${mid - 1}], Right half: [${mid}..${hi - 1}].`,
        { lo, mid, hi },
        makeStates([lo, hi], { [mid]: "active" }),
      );

      // Left branch
      callStack.push(`mergeSort(${lo}, ${mid})`);
      sort(lo, mid);
      callStack.pop();

      // Right branch
      callStack.push(`mergeSort(${mid}, ${hi})`);
      sort(mid, hi);
      callStack.pop();

      // Merge step
      callStack.push(`merge(${lo}, ${mid}, ${hi})`);
      merge(lo, mid, hi);
      callStack.pop();
    }

    function merge(lo: number, mid: number, hi: number) {
      recordStep(
        "visit",
        [],
        5,
        `Merging sorted sub-arrays [${lo}..${mid - 1}] and [${mid}..${hi - 1}] into temporary buffer.`,
        { lo, mid, hi },
        makeStates([lo, hi]),
      );

      const mergedVals: number[] = [];
      const mergedKeys: string[] = [];

      let p1 = lo;
      let p2 = mid;

      while (p1 < mid && p2 < hi) {
        comparisons++;
        const takeLeft = a[p1]! <= a[p2]!;

        recordStep(
          "compare",
          [p1, p2],
          5,
          `Comparing left half array[${p1}] = ${a[p1]} with right half array[${p2}] = ${a[p2]}. ${
            takeLeft ? `Left is smaller: place ${a[p1]} into temp buffer.` : `Right is smaller: place ${a[p2]} into temp buffer.`
          }`,
          { lo, mid, hi, p1, p2 },
          makeStates([lo, hi], { [p1]: "comparing", [p2]: "comparing" }),
        );

        if (takeLeft) {
          writes++;
          mergedVals.push(a[p1]!);
          mergedKeys.push(keys[p1]!);
          tempBuffer[lo + mergedVals.length - 1] = a[p1]!;
          p1++;
        } else {
          writes++;
          mergedVals.push(a[p2]!);
          mergedKeys.push(keys[p2]!);
          tempBuffer[lo + mergedVals.length - 1] = a[p2]!;
          p2++;
        }

        recordStep(
          "write",
          [lo + mergedVals.length - 1],
          5,
          `Appended value ${mergedVals[mergedVals.length - 1]} into temp buffer slot ${lo + mergedVals.length - 1}.`,
          { lo, mid, hi, p1, p2 },
          makeStates([lo, hi]),
          [lo + mergedVals.length - 1],
        );
      }

      while (p1 < mid) {
        writes++;
        mergedVals.push(a[p1]!);
        mergedKeys.push(keys[p1]!);
        tempBuffer[lo + mergedVals.length - 1] = a[p1]!;
        p1++;
      }

      while (p2 < hi) {
        writes++;
        mergedVals.push(a[p2]!);
        mergedKeys.push(keys[p2]!);
        tempBuffer[lo + mergedVals.length - 1] = a[p2]!;
        p2++;
      }

      // Copy temp buffer back to main array
      for (let k = 0; k < mergedVals.length; k++) {
        writes++;
        a[lo + k] = mergedVals[k]!;
        keys[lo + k] = mergedKeys[k]!;

        recordStep(
          "write",
          [lo + k],
          6,
          `Copied ${mergedVals[k]} from temp buffer back to main array at index ${lo + k}.`,
          { lo, hi, k: lo + k },
          makeStates([lo, hi], { [lo + k]: "swapping" }),
          [lo + k],
        );
      }

      // Clear temp buffer region
      for (let k = lo; k < hi; k++) {
        tempBuffer[k] = null;
      }

      recordStep(
        "mark-sorted",
        Array.from({ length: hi - lo }, (_, idx) => lo + idx),
        6,
        `Merged range [${lo}..${hi - 1}] is now in sorted order.`,
        { lo, hi },
        makeStates([lo, hi], Object.fromEntries(Array.from({ length: hi - lo }, (_, idx) => [lo + idx, "sorted"] as const))),
      );
    }

    sort(0, n);

    recordStep(
      "complete",
      Array.from({ length: n }, (_, idx) => idx),
      7,
      `Merge Sort complete! Array sorted in ${comparisons} comparisons and ${writes} writes.`,
      {},
      a.map(() => "sorted"),
    );

    return steps;
  },
};
