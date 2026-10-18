import type { AlgorithmDefinition, ElementState, VisualizerStep } from "../types";

export const insertionSortPseudocode = [
  "for i = 1 to n - 1:             // Pick the next unsorted element",
  "  key = array[i]                // Store element to insert",
  "  j = i - 1                     // Start comparing backward in sorted prefix",
  "  while j >= 0 and array[j] > key:",
  "    array[j + 1] = array[j]     // Shift larger element to the right",
  "    j = j - 1",
  "  array[j + 1] = key            // Insert key into its correct position",
  "  prefix 0..i is now sorted",
  "array is completely sorted       // Done!",
];

export const insertionSortDefinition: AlgorithmDefinition = {
  id: "insertion-sort",
  name: "Insertion Sort",
  category: "sorting",
  description:
    "An intuitive in-place algorithm that builds the final sorted array one item at a time. It iterates through the input elements and grows a sorted output list behind it, shifting larger items to the right.",
  complexity: {
    best: "O(n) on sorted/nearly-sorted",
    average: "O(n²)",
    worst: "O(n²)",
    space: "O(1) in-place",
  },
  pseudocode: insertionSortPseudocode,
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

    const sortedCount = { current: 1 };

    function makeStates(overrides: Record<number, ElementState> = {}): ElementState[] {
      return a.map((_, idx) => {
        if (overrides[idx]) return overrides[idx]!;
        if (idx < sortedCount.current) return "sorted";
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
    ) {
      stepCount++;
      operations++;
      steps.push({
        id: `ins-step-${stepCount}`,
        type,
        values: [...a],
        keys: [...keys],
        indices: [...indices],
        states: customStates ?? makeStates(),
        pseudocodeLine,
        description,
        counters: { comparisons, swaps, shifts, writes, operations },
        pointers,
      });
    }

    recordStep(
      "init",
      [0],
      0,
      `Ready to sort ${n} elements. Prefix of size 1 at index 0 (value ${a[0]}) is trivially sorted.`,
      { i: 0 },
    );

    for (let i = 1; i < n; i++) {
      const keyValue = a[i]!;
      const keyIdentity = keys[i]!;

      recordStep(
        "visit",
        [i],
        1,
        `Selected key = ${keyValue} at index ${i} to insert into the sorted prefix [0..${i - 1}].`,
        { i, key: i },
        makeStates({ [i]: "active" }),
      );

      let j = i - 1;

      while (j >= 0) {
        comparisons++;
        const shouldShift = a[j]! > keyValue;

        recordStep(
          "compare",
          [j, j + 1],
          3,
          `Comparing prefix element array[${j}] = ${a[j]} with key ${keyValue}. ${
            shouldShift
              ? `${a[j]} > ${keyValue}: Shifting ${a[j]} right.`
              : `${a[j]} ≤ ${keyValue}: Insertion spot found at index ${j + 1}.`
          }`,
          { i, j, key: j + 1 },
          makeStates({ [j]: "comparing", [j + 1]: "active" }),
        );

        if (!shouldShift) break;

        // Shift a[j] to a[j + 1]
        shifts++;
        writes++;
        a[j + 1] = a[j]!;
        keys[j + 1] = keys[j]!;

        recordStep(
          "shift",
          [j, j + 1],
          4,
          `Shifted value ${a[j + 1]} from index ${j} to index ${j + 1}.`,
          { i, j: j - 1, key: j },
          makeStates({ [j + 1]: "shifting", [j]: "active" }),
        );

        j--;
      }

      // Insert key into slot j + 1
      writes++;
      a[j + 1] = keyValue;
      keys[j + 1] = keyIdentity;

      sortedCount.current = i + 1;

      recordStep(
        "write",
        [j + 1],
        6,
        `Inserted key ${keyValue} into its sorted position at index ${j + 1}.`,
        { i, key: j + 1 },
        makeStates({ [j + 1]: "swapping" }),
      );

      recordStep(
        "mark-sorted",
        Array.from({ length: i + 1 }, (_, k) => k),
        7,
        `Prefix elements 0 through ${i} are now sorted.`,
        { i },
        makeStates(),
      );
    }

    sortedCount.current = n;
    recordStep(
      "complete",
      Array.from({ length: n }, (_, k) => k),
      8,
      `Insertion Sort complete! Sorted in ${comparisons} comparisons, ${shifts} shifts, and ${writes} writes.`,
      {},
      makeStates(),
    );

    return steps;
  },
};
