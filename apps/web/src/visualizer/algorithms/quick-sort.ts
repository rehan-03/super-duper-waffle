import type { AlgorithmDefinition, ElementState, VisualizerStep } from "../types";

export const quickSortPseudocode = [
  "quickSort(lo, hi):",
  "  if lo >= hi: return             // Base case: 0 or 1 element",
  "  pivot = array[hi]               // Choose pivot",
  "  i = lo - 1                      // Boundary of smaller elements",
  "  for j = lo to hi - 1:",
  "    if array[j] <= pivot:         // Compare scanner with pivot",
  "      i = i + 1; swap(array[i], array[j])",
  "  swap(array[i + 1], array[hi])   // Place pivot between partitions",
  "  quickSort(lo, i); quickSort(i + 2, hi)",
  "array is completely sorted        // Done!",
];

export const quickSortDefinition: AlgorithmDefinition = {
  id: "quick-sort",
  name: "Quick Sort",
  category: "sorting",
  description:
    "An efficient divide-and-conquer algorithm. It selects a 'pivot' element, partitions the array such that smaller elements are placed to the left and larger elements to the right, and then recursively sorts the sub-arrays.",
  complexity: {
    best: "O(n log n)",
    average: "O(n log n)",
    worst: "O(n²)",
    space: "O(log n) call stack",
  },
  pseudocode: quickSortPseudocode,
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
    const permanentlySorted = new Set<number>();

    function makeStates(
      range?: [number, number],
      pivotIdx?: number,
      overrides: Record<number, ElementState> = {},
    ): ElementState[] {
      return a.map((_, idx) => {
        if (overrides[idx]) return overrides[idx]!;
        if (permanentlySorted.has(idx)) return "sorted";
        if (idx === pivotIdx) return "pivot";
        if (range && (idx < range[0] || idx > range[1])) return "default";
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
    ) {
      stepCount++;
      operations++;
      steps.push({
        id: `qs-step-${stepCount}`,
        type,
        values: [...a],
        keys: [...keys],
        indices: [...indices],
        states: customStates ?? a.map((_, idx) => (permanentlySorted.has(idx) ? "sorted" : "default")),
        pseudocodeLine,
        description,
        counters: { comparisons, swaps, shifts, writes, operations },
        pointers,
        callStack: [...callStack],
      });
    }

    callStack.push(`quickSort(0, ${n - 1})`);
    recordStep(
      "init",
      [],
      0,
      `Ready to sort ${n} elements using Quick Sort. We will pick a pivot and partition using pointer i (small boundary) and j (scanner).`,
      { lo: 0, hi: n - 1 },
    );

    function sort(lo: number, hi: number) {
      if (lo >= hi) {
        if (lo >= 0 && lo < n) permanentlySorted.add(lo);
        return;
      }

      const pivotVal = a[hi]!;
      let i = lo - 1;

      recordStep(
        "visit",
        [hi],
        2,
        `Partitioning range [${lo}..${hi}]: Selected pivot = ${pivotVal} at index ${hi}. Boundary pointer i starts at ${i}.`,
        { lo, hi, pivot: hi, i: i >= 0 ? i : null, j: lo },
        makeStates([lo, hi], hi, { [hi]: "pivot" }),
      );

      for (let j = lo; j < hi; j++) {
        comparisons++;
        const isSmallerOrEqual = a[j]! <= pivotVal;

        recordStep(
          "compare",
          [j, hi],
          5,
          `Comparing array[${j}] = ${a[j]} with pivot ${pivotVal}. ${
            isSmallerOrEqual
              ? `${a[j]} ≤ ${pivotVal}: Belongs in left partition! Advance pointer i and swap.`
              : `${a[j]} > ${pivotVal}: Belongs in right partition; scanner j advances.`
          }`,
          { lo, hi, pivot: hi, i: i >= 0 ? i : null, j },
          makeStates([lo, hi], hi, { [j]: "comparing", [hi]: "pivot" }),
        );

        if (isSmallerOrEqual) {
          i++;
          if (i !== j) {
            swaps++;
            writes += 2;
            const tempVal = a[i]!;
            a[i] = a[j]!;
            a[j] = tempVal;

            const tempKey = keys[i]!;
            keys[i] = keys[j]!;
            keys[j] = tempKey;

            recordStep(
              "swap",
              [i, j],
              6,
              `Swapped array[${i}] = ${a[i]} and array[${j}] = ${a[j]} to move smaller element into left partition.`,
              { lo, hi, pivot: hi, i, j },
              makeStates([lo, hi], hi, { [i]: "swapping", [j]: "swapping", [hi]: "pivot" }),
            );
          }
        }
      }

      // Place pivot in its correct sorted position: swap a[i + 1] and a[hi]
      const pivotFinalIdx = i + 1;
      if (pivotFinalIdx !== hi) {
        swaps++;
        writes += 2;
        const tempVal = a[pivotFinalIdx]!;
        a[pivotFinalIdx] = a[hi]!;
        a[hi] = tempVal;

        const tempKey = keys[pivotFinalIdx]!;
        keys[pivotFinalIdx] = keys[hi]!;
        keys[hi] = tempKey;

        recordStep(
          "swap",
          [pivotFinalIdx, hi],
          7,
          `Swapping pivot ${pivotVal} into its final partitioned position at index ${pivotFinalIdx}.`,
          { lo, hi, pivot: pivotFinalIdx, i: pivotFinalIdx },
          makeStates([lo, hi], pivotFinalIdx, { [pivotFinalIdx]: "swapping", [hi]: "swapping" }),
        );
      }

      permanentlySorted.add(pivotFinalIdx);
      recordStep(
        "mark-sorted",
        [pivotFinalIdx],
        7,
        `Pivot element ${pivotVal} is now settled at final index ${pivotFinalIdx}. All elements to its left are ≤ ${pivotVal}, and all to its right are ≥ ${pivotVal}.`,
        { lo, hi, pivot: pivotFinalIdx },
        makeStates([lo, hi], undefined, { [pivotFinalIdx]: "sorted" }),
      );

      // Recursive conquer
      if (pivotFinalIdx - 1 > lo) {
        callStack.push(`quickSort(${lo}, ${pivotFinalIdx - 1})`);
        sort(lo, pivotFinalIdx - 1);
        callStack.pop();
      } else if (pivotFinalIdx - 1 === lo) {
        permanentlySorted.add(lo);
      }

      if (pivotFinalIdx + 1 < hi) {
        callStack.push(`quickSort(${pivotFinalIdx + 1}, ${hi})`);
        sort(pivotFinalIdx + 1, hi);
        callStack.pop();
      } else if (pivotFinalIdx + 1 === hi) {
        permanentlySorted.add(hi);
      }
    }

    sort(0, n - 1);

    for (let k = 0; k < n; k++) permanentlySorted.add(k);
    recordStep(
      "complete",
      Array.from({ length: n }, (_, idx) => idx),
      9,
      `Quick Sort complete! Array fully partitioned and sorted in ${comparisons} comparisons and ${swaps} swaps.`,
      {},
      a.map(() => "sorted"),
    );

    return steps;
  },
};
