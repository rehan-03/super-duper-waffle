import type { AlgorithmDefinition, ElementState, VisualizerStep } from "../types";

export const linearSearchPseudocode = [
  "linearSearch(array, target):",
  "  for i = 0 to n - 1:             // Scan sequentially through elements",
  "    if array[i] == target:       // Compare current element with target",
  "      return i                   // Match found!",
  "  return -1                      // Target not present in array",
];

export const linearSearchDefinition: AlgorithmDefinition = {
  id: "linear-search",
  name: "Linear Search",
  category: "searching",
  description:
    "A sequential search algorithm that starts at the first element and checks each element until a match is found or the entire list has been searched.",
  requiresTarget: true,
  complexity: {
    best: "O(1) first item",
    average: "O(n)",
    worst: "O(n)",
    space: "O(1)",
  },
  pseudocode: linearSearchPseudocode,
  generateSteps: (initialValues: number[], options?: { target?: number }): VisualizerStep[] => {
    const n = initialValues.length;
    const a = [...initialValues];
    const keys = initialValues.map((val, idx) => `item-${idx}-${val}`);

    // If target not provided or invalid, pick an existing value or a random one
    const target = options?.target !== undefined ? options.target : a[Math.floor(n / 2)] ?? 42;

    const steps: VisualizerStep[] = [];
    let comparisons = 0;
    const swaps = 0;
    const shifts = 0;
    const writes = 0;
    let operations = 0;
    let stepCount = 0;

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
        id: `lin-step-${stepCount}`,
        type,
        values: [...a],
        keys: [...keys],
        indices: [...indices],
        states: customStates ?? a.map(() => "default"),
        pseudocodeLine,
        description,
        counters: { comparisons, swaps, shifts, writes, operations },
        pointers,
        searchFoundIndex: foundIndex,
      });
    }

    recordStep(
      "init",
      [],
      0,
      `Searching for target = ${target} across ${n} elements using Linear Search with a moving pointer.`,
      { pointer: 0 },
    );


    for (let i = 0; i < n; i++) {
      comparisons++;
      const isMatch = a[i] === target;

      const states: ElementState[] = a.map((_, idx) => {
        if (idx < i) return "visited";
        if (idx === i) return isMatch ? "sorted" : "comparing";
        return "default";
      });

      recordStep(
        "compare",
        [i],
        2,
        `Index ${i}: Comparing array[${i}] = ${a[i]} with target ${target}. ${
          isMatch ? `MATCH FOUND at index ${i}!` : `Does not match; moving pointer to next index.`
        }`,
        { pointer: i },
        states,
        isMatch ? i : undefined,
      );

      if (isMatch) {
        recordStep(
          "complete",
          [i],
          3,
          `Search successful! Target ${target} located at index ${i} after ${comparisons} comparison${comparisons === 1 ? "" : "s"}.`,
          { pointer: i },
          a.map((_, idx) => (idx === i ? "sorted" : idx < i ? "visited" : "default")),
          i,
        );
        return steps;
      }
    }

    recordStep(
      "complete",
      [],
      4,
      `Search exhausted: Checked all ${n} elements, target ${target} was not found in the array.`,
      { pointer: null },
      a.map(() => "visited"),
      null,
    );

    return steps;
  },
};
