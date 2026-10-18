import { describe, it, expect } from "vitest";
import {
  bubbleSortDefinition,
  selectionSortDefinition,
  insertionSortDefinition,
  mergeSortDefinition,
  quickSortDefinition,
  heapSortDefinition,
  shellSortDefinition,
  radixSortDefinition,
  linearSearchDefinition,
  binarySearchDefinition,
  bfsDefinition,
  dfsDefinition,
} from "../../apps/web/src/visualizer/algorithms";
import { generateArray } from "../../apps/web/src/visualizer/array-generator";

describe("Sorting & Searching Algorithms Correctness Tests", () => {
  const patterns = ["random", "reversed", "nearly-sorted", "duplicates"] as const;

  const sortingAlgos = [
    bubbleSortDefinition,
    selectionSortDefinition,
    insertionSortDefinition,
    mergeSortDefinition,
    quickSortDefinition,
    heapSortDefinition,
    shellSortDefinition,
    radixSortDefinition,
  ];

  sortingAlgos.forEach((algo) => {
    describe(`${algo.name}`, () => {
      patterns.forEach((pattern) => {
        it(`correctly sorts ${pattern} input`, () => {
          const input = generateArray(10, pattern);
          const expectedSorted = [...input].sort((a, b) => a - b);

          const steps = algo.generateSteps(input);
          expect(steps.length).toBeGreaterThan(1);

          // Initial step matches input
          expect(steps[0]!.values).toEqual(input);

          // Final step matches expected sorted result
          const finalStep = steps[steps.length - 1]!;
          expect(finalStep.values).toEqual(expectedSorted);
          expect(finalStep.type).toBe("complete");

          // Step navigation consistency: each step has valid counters and snapshot
          steps.forEach((step, idx) => {
            expect(step.values.length).toBe(input.length);
            expect(step.keys.length).toBe(input.length);
            expect(step.states.length).toBe(input.length);
            expect(step.counters.comparisons).toBeGreaterThanOrEqual(0);
            expect(step.counters.operations).toBeGreaterThanOrEqual(idx);
          });
        });
      });
    });
  });

  describe("Linear Search", () => {
    patterns.forEach((pattern) => {
      it(`finds existing target on ${pattern} input`, () => {
        const input = generateArray(8, pattern);
        const target = input[3]!;
        const steps = linearSearchDefinition.generateSteps(input, { target });
        const lastStep = steps[steps.length - 1]!;
        expect(lastStep.searchFoundIndex).toBe(input.indexOf(target));
      });

      it(`handles missing target on ${pattern} input`, () => {
        const input = generateArray(8, pattern);
        const missingTarget = 99999;
        const steps = linearSearchDefinition.generateSteps(input, { target: missingTarget });
        const lastStep = steps[steps.length - 1]!;
        expect(lastStep.searchFoundIndex).toBeNull();
      });
    });
  });

  describe("Binary Search", () => {
    patterns.forEach((pattern) => {
      it(`finds existing target on sorted ${pattern} input`, () => {
        const input = generateArray(10, pattern, "", true);
        const target = input[4]!;
        const steps = binarySearchDefinition.generateSteps(input, { target });
        const lastStep = steps[steps.length - 1]!;
        expect(lastStep.searchFoundIndex).not.toBeNull();
        expect(input[lastStep.searchFoundIndex!]).toBe(target);
      });

      it(`handles missing target on sorted ${pattern} input`, () => {
        const input = generateArray(10, pattern, "", true);
        const missingTarget = -100;
        const steps = binarySearchDefinition.generateSteps(input, { target: missingTarget });
        const lastStep = steps[steps.length - 1]!;
        expect(lastStep.searchFoundIndex).toBeNull();
      });
    });
  });

  describe("Breadth-First Search (BFS)", () => {
    it("generates valid traversal steps with queue snapshots", () => {
      const steps = bfsDefinition.generateSteps([0, 1, 2, 3, 4, 5], { target: 0 });
      expect(steps.length).toBeGreaterThan(5);
      const finalStep = steps[steps.length - 1]!;
      expect(finalStep.type).toBe("complete");
      expect(finalStep.graphVertices?.length).toBe(6);
      expect(finalStep.graphEdges?.length).toBeGreaterThan(0);
    });
  });

  describe("Depth-First Search (DFS)", () => {
    it("generates valid traversal steps with stack snapshots and backtracking", () => {
      const steps = dfsDefinition.generateSteps([0, 1, 2, 3, 4, 5], { target: 0 });
      expect(steps.length).toBeGreaterThan(5);
      const finalStep = steps[steps.length - 1]!;
      expect(finalStep.type).toBe("complete");
      expect(finalStep.graphVertices?.length).toBe(6);
      // Verify that at least one backtrack or pop step occurs
      const hasBacktrack = steps.some((s) => s.type === "backtrack" || s.type === "pop");
      expect(hasBacktrack).toBe(true);
    });
  });
});
