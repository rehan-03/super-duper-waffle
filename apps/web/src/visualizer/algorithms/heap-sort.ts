import type { AlgorithmDefinition, ElementState, HeapTreeNode, VisualizerStep } from "../types";

export const heapSortPseudocode = [
  "heapSort(array):",
  "  buildMaxHeap(array)             // Sift down internal nodes",
  "  for end = n - 1 down to 1:      // Extract maximums",
  "    swap(array[0], array[end])    // Move current max to end",
  "    mark array[end] as sorted",
  "    siftDown(0, end)              // Restore heap property in prefix",
  "array is completely sorted        // Done!",
];

export function computeHeapTree(
  values: number[],
  states: ElementState[],
  heapSize: number,
): { nodes: HeapTreeNode[]; edges: [number, number][] } {
  const nodes: HeapTreeNode[] = [];
  const edges: [number, number][] = [];

  for (let i = 0; i < values.length; i++) {
    const level = Math.floor(Math.log2(i + 1));
    const levelStart = Math.pow(2, level) - 1;
    const posInLevel = i - levelStart;
    const levelCount = Math.pow(2, level);

    const x = Math.round(((posInLevel + 0.5) / levelCount) * 100);
    const y = Math.round(15 + level * 24);

    nodes.push({
      index: i,
      value: values[i]!,
      x,
      y,
      state: i < heapSize ? states[i] || "default" : "sorted",
    });

    if (i > 0) {
      const parent = Math.floor((i - 1) / 2);
      edges.push([parent, i]);
    }
  }

  return { nodes, edges };
}

export const heapSortDefinition: AlgorithmDefinition = {
  id: "heap-sort",
  name: "Heap Sort",
  category: "sorting",
  description:
    "A comparison-based sorting algorithm based on a Binary Heap data structure. It first transforms the array into a Max-Heap, then repeatedly swaps the maximum element at the root with the last unsorted item and sifts down to restore heap order.",
  complexity: {
    best: "O(n log n)",
    average: "O(n log n)",
    worst: "O(n log n)",
    space: "O(1) in-place",
  },
  pseudocode: heapSortPseudocode,
  generateSteps: (initialValues: number[]): VisualizerStep[] => {
    const n = initialValues.length;
    const a = [...initialValues];
    const keys = initialValues.map((val, idx) => `item-${idx}-${val}`);

    const steps: VisualizerStep[] = [];
    let comparisons = 0;
    let swaps = 0;
    const shifts = 0;
    let writes = 0;
    let operations = 0;
    let stepCount = 0;

    let heapSize = n;
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
      const currentStates = customStates ?? makeStates();
      const tree = computeHeapTree(a, currentStates, heapSize);

      steps.push({
        id: `heap-step-${stepCount}`,
        type,
        values: [...a],
        keys: [...keys],
        indices: [...indices],
        states: currentStates,
        pseudocodeLine,
        description,
        counters: { comparisons, swaps, shifts, writes, operations },
        pointers,
        treeNodes: tree.nodes,
        treeEdges: tree.edges,
      });
    }

    recordStep(
      "init",
      [],
      0,
      `Starting Heap Sort on ${n} elements. We visualize both the array and its dual binary heap tree layout.`,
      {},
    );

    function siftDown(root: number, limit: number) {
      let curr = root;

      while (2 * curr + 1 < limit) {
        let largest = curr;
        const left = 2 * curr + 1;
        const right = 2 * curr + 2;

        comparisons++;
        if (a[left]! > a[largest]!) largest = left;

        if (right < limit) {
          comparisons++;
          if (a[right]! > a[largest]!) largest = right;
        }

        const compIndices = right < limit ? [curr, left, right] : [curr, left];
        recordStep(
          "compare",
          compIndices,
          5,
          `Comparing parent node array[${curr}] = ${a[curr]} with children: left array[${left}] = ${a[left]}${
            right < limit ? ` and right array[${right}] = ${a[right]}` : ""
          }. Largest is at index ${largest} (value ${a[largest]}).`,
          { root: curr, largest },
          makeStates({
            [curr]: "comparing",
            [left]: "comparing",
            ...(right < limit ? { [right]: "comparing" } : {}),
          }),
        );

        if (largest !== curr) {
          swaps++;
          writes += 2;
          const tempVal = a[curr]!;
          a[curr] = a[largest]!;
          a[largest] = tempVal;

          const tempKey = keys[curr]!;
          keys[curr] = keys[largest]!;
          keys[largest] = tempKey;

          recordStep(
            "swap",
            [curr, largest],
            5,
            `Swapping parent array[${curr}] = ${a[largest]} with larger child array[${largest}] = ${a[curr]} to satisfy max-heap property.`,
            { root: largest },
            makeStates({ [curr]: "swapping", [largest]: "swapping" }),
          );

          curr = largest;
        } else {
          recordStep(
            "visit",
            [curr],
            5,
            `Subtree rooted at index ${curr} satisfies the max-heap property. Sift down complete.`,
            { root: curr },
            makeStates({ [curr]: "active" }),
          );
          break;
        }
      }
    }

    // Phase 1: Build max heap bottom-up
    recordStep(
      "visit",
      [],
      1,
      `Phase 1: Building max heap bottom-up starting from first non-leaf node at index ${Math.floor(n / 2) - 1}.`,
      {},
    );

    for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
      siftDown(i, n);
    }

    recordStep(
      "visit",
      [0],
      1,
      `Max-heap constructed! Root node array[0] holds the maximum value ${a[0]}. Ready to begin extractions.`,
      { max: 0 },
      makeStates({ [0]: "active" }),
    );

    // Phase 2: Repeatedly extract max
    for (let end = n - 1; end > 0; end--) {
      swaps++;
      writes += 2;

      // Swap root max with current end of heap
      const tempVal = a[0]!;
      a[0] = a[end]!;
      a[end] = tempVal;

      const tempKey = keys[0]!;
      keys[0] = keys[end]!;
      keys[end] = tempKey;

      heapSize = end;
      sortedIndices.add(end);

      recordStep(
        "swap",
        [0, end],
        3,
        `Extracting maximum: Swapping root ${tempVal} with last unsorted node array[${end}] = ${a[0]}.`,
        { max: end, end },
        makeStates({ [0]: "swapping", [end]: "swapping" }),
      );

      recordStep(
        "mark-sorted",
        [end],
        4,
        `Element ${a[end]} at index ${end} is permanently settled in its final sorted position.`,
        { sorted: end },
        makeStates(),
      );

      // Restore max-heap in prefix [0..end-1]
      siftDown(0, end);
    }

    sortedIndices.add(0);
    heapSize = 0;

    recordStep(
      "complete",
      Array.from({ length: n }, (_, k) => k),
      6,
      `Heap Sort complete! Array and heap tree fully sorted in ${comparisons} comparisons and ${swaps} swaps.`,
      {},
      a.map(() => "sorted"),
    );

    return steps;
  },
};
