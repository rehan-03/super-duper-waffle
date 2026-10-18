import type { AlgorithmDefinition, ElementState, VisualizerStep } from "../types";

export const shellSortPseudocode = [
  "shellSort(array):",
  "  for gap = floor(n / 2) down to 1 (gap = floor(gap / 2)):",
  "    for i = gap to n - 1:       // Gap-inserted prefix",
  "      temp = array[i]",
  "      j = i",
  "      while j >= gap and array[j - gap] > temp:",
  "        array[j] = array[j - gap] // Shift element by gap distance",
  "        j = j - gap",
  "      array[j] = temp            // Insert into gap position",
  "array is completely sorted        // Done!",
];

export const shellSortDefinition: AlgorithmDefinition = {
  id: "shell-sort",
  name: "Shell Sort",
  category: "sorting",
  description:
    "An in-place comparison sort that generalizes insertion sort by allowing the exchange of items that are far apart. It uses a sequence of diminishing gaps to achieve sub-quadratic running times.",
  complexity: {
    best: "O(n log n)",
    average: "O(n^(3/2)) / O(n log² n)",
    worst: "O(n²)",
    space: "O(1) in-place",
  },
  pseudocode: shellSortPseudocode,
  generateSteps: (initialValues: number[]): VisualizerStep[] => {
    const n = initialValues.length;
    const a = [...initialValues];
    const keys = initialValues.map((val, idx) => `item-${idx}-${val}`);

    const steps: VisualizerStep[] = [];
    let comparisons = 0;
    const swaps = 0;
    let shifts = 0;
    let writes = 0;
    let operations = 0;
    let stepCount = 0;

    function recordStep(
      type: VisualizerStep["type"],
      indices: number[],
      pseudocodeLine: number,
      description: string,
      gapVal?: number,
      pointers?: Record<string, number | null>,
      customStates?: ElementState[],
    ) {
      stepCount++;
      operations++;
      steps.push({
        id: `shell-step-${stepCount}`,
        type,
        values: [...a],
        keys: [...keys],
        indices: [...indices],
        states: customStates ?? a.map(() => "default"),
        pseudocodeLine,
        description,
        counters: { comparisons, swaps, shifts, writes, operations },
        pointers,
        gap: gapVal,
      });
    }

    recordStep(
      "init",
      [],
      0,
      `Ready to sort ${n} elements using Shell Sort. We will use diminishing gap strides starting from gap = ${Math.floor(n / 2)}.`,
      Math.floor(n / 2),
    );

    for (let gap = Math.floor(n / 2); gap > 0; gap = Math.floor(gap / 2)) {
      recordStep(
        "visit",
        [],
        1,
        `--- Starting pass with gap stride = ${gap} ---`,
        gap,
      );

      for (let i = gap; i < n; i++) {
        const tempVal = a[i]!;
        const tempKey = keys[i]!;

        recordStep(
          "visit",
          [i],
          3,
          `gap = ${gap}: Selected element array[${i}] = ${tempVal} to insert into its gap-spaced sub-array.`,
          gap,
          { i, key: i },
          a.map((_, idx) => (idx === i ? "active" : idx % gap === i % gap ? "comparing" : "default")),
        );

        let j = i;
        while (j >= gap) {
          comparisons++;
          const shouldShift = a[j - gap]! > tempVal;

          recordStep(
            "compare",
            [j - gap, j],
            5,
            `Comparing array[${j - gap}] = ${a[j - gap]} with temp ${tempVal} (stride distance = ${gap}). ${
              shouldShift
                ? `${a[j - gap]} > ${tempVal}: Shift ${a[j - gap]} forward by gap distance ${gap}.`
                : `${a[j - gap]} ≤ ${tempVal}: Insertion spot found at index ${j}.`
            }`,
            gap,
            { i, j, "j-gap": j - gap },
            a.map((_, idx) =>
              idx === j - gap || idx === j
                ? "comparing"
                : idx % gap === i % gap
                  ? "visited"
                  : "default",
            ),
          );

          if (!shouldShift) break;

          shifts++;
          writes++;
          a[j] = a[j - gap]!;
          keys[j] = keys[j - gap]!;

          recordStep(
            "shift",
            [j - gap, j],
            6,
            `Shifted value ${a[j]} from index ${j - gap} to index ${j} across gap stride ${gap}.`,
            gap,
            { i, j: j - gap },
            a.map((_, idx) => (idx === j ? "shifting" : "default")),
          );

          j -= gap;
        }

        writes++;
        a[j] = tempVal;
        keys[j] = tempKey;

        recordStep(
          "write",
          [j],
          8,
          `Placed value ${tempVal} into position index ${j}.`,
          gap,
          { j },
          a.map((_, idx) => (idx === j ? "swapping" : "default")),
        );
      }
    }

    recordStep(
      "complete",
      Array.from({ length: n }, (_, k) => k),
      9,
      `Shell Sort complete! Array fully sorted in ${comparisons} comparisons, ${shifts} shifts, and ${writes} writes.`,
      1,
      {},
      a.map(() => "sorted"),
    );

    return steps;
  },
};
