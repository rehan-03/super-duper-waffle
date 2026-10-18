import type { AlgorithmDefinition, ElementState, VisualizerStep } from "../types";

export const bubbleSortPseudocode = [
  "for i = 0 to n - 1:           // Outer pass for each unsorted element",
  "  swapped = false              // Flag to detect early sorted condition",
  "  for j = 0 to n - i - 2:      // Compare adjacent unsorted pairs",
  "    if array[j] > array[j + 1]: // Check if out of order",
  "      swap(array[j], array[j + 1])",
  "      swapped = true",
  "  mark array[n - i - 1] as sorted",
  "  if not swapped: break        // Early exit optimization",
  "array is completely sorted     // Done!",
];

export const bubbleSortDefinition: AlgorithmDefinition = {
  id: "bubble-sort",
  name: "Bubble Sort",
  category: "sorting",
  description:
    "A simple comparison-based sorting algorithm that repeatedly steps through the list, compares adjacent elements, and swaps them if they are in the wrong order. The pass through the list is repeated until the list is sorted.",
  complexity: {
    best: "O(n) with early break",
    average: "O(n²)",
    worst: "O(n²)",
    space: "O(1) in-place",
  },
  pseudocode: bubbleSortPseudocode,
  generateSteps: (initialValues: number[]): VisualizerStep[] => {
    const n = initialValues.length;
    const a = [...initialValues];
    // Keep persistent item identity keys so framer-motion tracks swaps seamlessly
    const keys = initialValues.map((val, idx) => `item-${idx}-${val}`);

    const steps: VisualizerStep[] = [];
    let comparisons = 0;
    let swaps = 0;
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
      customStates?: ElementState[],
    ) {
      stepCount++;
      operations++;
      steps.push({
        id: `step-${stepCount}`,
        type,
        values: [...a],
        keys: [...keys],
        indices: [...indices],
        states: customStates ?? makeStates(),
        pseudocodeLine,
        description,
        counters: {
          comparisons,
          swaps,
          shifts: 0,
          writes: swaps * 2,
          operations,
        },
      });
    }

    // Step 0: Initial state
    recordStep(
      "init",
      [],
      0,
      `Ready to sort ${n} elements. Press Play or use the Step Forward button to begin.`,
      makeStates(),
    );

    for (let i = 0; i < n; i++) {
      let swappedInPass = false;

      // Outer loop pass start
      recordStep(
        "visit",
        [],
        0,
        `Starting pass ${i + 1} of ${n}. Unsorted sub-array spans indices 0 through ${n - i - 1}.`,
      );

      for (let j = 0; j < n - i - 1; j++) {
        comparisons++;

        // 1. Comparison step
        const isOutOfOrder = a[j]! > a[j + 1]!;
        const compareStates = makeStates({
          [j]: "comparing",
          [j + 1]: "comparing",
        });

        recordStep(
          "compare",
          [j, j + 1],
          3,
          `Comparing array[${j}] = ${a[j]} with array[${j + 1}] = ${a[j + 1]}. ${
            isOutOfOrder
              ? `${a[j]} > ${a[j + 1]} is TRUE: out of order.`
              : `${a[j]} ≤ ${a[j + 1]} is FALSE: already in order, no swap.`
          }`,
          compareStates,
        );

        if (isOutOfOrder) {
          // 2. Perform swap in memory and update stable keys
          swaps++;
          swappedInPass = true;

          const tempVal = a[j]!;
          a[j] = a[j + 1]!;
          a[j + 1] = tempVal;

          const tempKey = keys[j]!;
          keys[j] = keys[j + 1]!;
          keys[j + 1] = tempKey;

          const swapStates = makeStates({
            [j]: "swapping",
            [j + 1]: "swapping",
          });

          recordStep(
            "swap",
            [j, j + 1],
            4,
            `Swapped ${a[j + 1]} and ${a[j]}. The larger value ${a[j + 1]} bubbles toward index ${j + 1}.`,
            swapStates,
          );
        }
      }

      // Mark the end element of this pass as officially sorted
      const settledIndex = n - i - 1;
      sortedIndices.add(settledIndex);

      const markStates = makeStates({
        [settledIndex]: "sorted",
      });

      recordStep(
        "mark-sorted",
        [settledIndex],
        6,
        `Pass ${i + 1} complete. Element ${a[settledIndex]} at index ${settledIndex} is now settled in its final sorted position.`,
        markStates,
      );

      // Early break if no swaps occurred during the pass
      if (!swappedInPass) {
        // Mark all remaining unsorted as sorted
        for (let rem = 0; rem < settledIndex; rem++) {
          sortedIndices.add(rem);
        }
        recordStep(
          "mark-sorted",
          Array.from(sortedIndices),
          7,
          `No swaps occurred during pass ${i + 1}! The remaining elements are already in non-decreasing order. Early exit triggered.`,
          makeStates(),
        );
        break;
      }
    }

    // Final completion step
    for (let k = 0; k < n; k++) sortedIndices.add(k);
    recordStep(
      "complete",
      Array.from({ length: n }, (_, i) => i),
      8,
      `Bubble Sort completed successfully! Entire array is sorted in ${comparisons} comparisons and ${swaps} swaps.`,
      makeStates(),
    );

    return steps;
  },
};
