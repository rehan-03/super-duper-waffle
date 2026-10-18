import type { AlgorithmDefinition, ElementState, VisualizerStep } from "../types";

export const selectionSortPseudocode = [
  "for i = 0 to n - 2:             // Position to place the next minimum",
  "  min_idx = i                   // Assume the current index is minimum",
  "  for j = i + 1 to n - 1:       // Scan remaining unsorted elements",
  "    if array[j] < array[min_idx]:",
  "      min_idx = j               // New minimum candidate found",
  "  if min_idx != i:              // Swap into correct position",
  "    swap(array[i], array[min_idx])",
  "  mark array[i] as sorted",
  "array is completely sorted       // Done!",
];

export const selectionSortDefinition: AlgorithmDefinition = {
  id: "selection-sort",
  name: "Selection Sort",
  category: "sorting",
  description:
    "A comparison-based in-place sorting algorithm that divides the list into a sorted prefix and an unsorted suffix. It repeatedly selects the minimum element from the unsorted suffix and swaps it with the first unsorted element.",
  complexity: {
    best: "O(n²)",
    average: "O(n²)",
    worst: "O(n²)",
    space: "O(1) in-place",
  },
  pseudocode: selectionSortPseudocode,
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

    const sortedIndices = new Set<number>();

    function makeStates(overrides: Record<number, ElementState> = {}): ElementState[] {
      return a.map((_, idx) => {
        if (overrides[idx]) return overrides[idx]!;
        if (sortedIndices.has(idx)) return "sorted";
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
        id: `sel-step-${stepCount}`,
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
      [],
      0,
      `Ready to sort ${n} elements using Selection Sort. We will scan the unsorted suffix to find the minimum value in each pass.`,
      { i: 0, min: 0 },
    );

    for (let i = 0; i < n - 1; i++) {
      let minIdx = i;

      recordStep(
        "visit",
        [i],
        1,
        `Pass ${i + 1}: Setting initial minimum candidate at index ${i} (value ${a[i]}).`,
        { i, min: minIdx, j: null },
        makeStates({ [i]: "active" }),
      );

      for (let j = i + 1; j < n; j++) {
        comparisons++;
        const isSmaller = a[j]! < a[minIdx]!;

        const compStates = makeStates({
          [minIdx]: "active",
          [j]: "comparing",
        });

        recordStep(
          "compare",
          [j, minIdx],
          3,
          `Comparing array[${j}] = ${a[j]} with current minimum candidate array[${minIdx}] = ${a[minIdx]}. ${
            isSmaller ? `${a[j]} < ${a[minIdx]}: New minimum found!` : `${a[j]} ≥ ${a[minIdx]}: Keep existing candidate.`
          }`,
          { i, min: minIdx, j },
          compStates,
        );

        if (isSmaller) {
          minIdx = j;
          recordStep(
            "visit",
            [minIdx],
            4,
            `Updated minimum candidate to index ${minIdx} (value ${a[minIdx]}).`,
            { i, min: minIdx, j },
            makeStates({ [minIdx]: "active" }),
          );
        }
      }

      if (minIdx !== i) {
        swaps++;
        writes += 2;
        const tempVal = a[i]!;
        a[i] = a[minIdx]!;
        a[minIdx] = tempVal;

        const tempKey = keys[i]!;
        keys[i] = keys[minIdx]!;
        keys[minIdx] = tempKey;

        recordStep(
          "swap",
          [i, minIdx],
          6,
          `Swapping smallest value ${a[i]} from index ${minIdx} into sorted position index ${i}.`,
          { i, min: i },
          makeStates({ [i]: "swapping", [minIdx]: "swapping" }),
        );
      } else {
        recordStep(
          "visit",
          [i],
          5,
          `Element ${a[i]} at index ${i} is already the smallest remaining. No swap needed.`,
          { i, min: i },
          makeStates({ [i]: "active" }),
        );
      }

      sortedIndices.add(i);
      recordStep(
        "mark-sorted",
        [i],
        7,
        `Index ${i} (value ${a[i]}) is now permanently sorted.`,
        { i },
        makeStates({ [i]: "sorted" }),
      );
    }

    // Last element is automatically sorted
    sortedIndices.add(n - 1);
    recordStep(
      "complete",
      Array.from({ length: n }, (_, idx) => idx),
      8,
      `Selection Sort complete! Array sorted in ${comparisons} comparisons and ${swaps} swaps.`,
      {},
      makeStates(),
    );

    return steps;
  },
};
