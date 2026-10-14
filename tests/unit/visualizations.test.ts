import { expect, test } from "vitest";
import {
  algorithms,
  algorithmKeys,
  buildTrace,
  type AlgorithmKey,
  type TraceOptions,
} from "@algolearn/shared";

const graph: TraceOptions = {
  edges: [
    [0, 1],
    [0, 2],
    [1, 3],
    [2, 4],
  ],
};

const fixtures: Record<
  AlgorithmKey,
  { values: number[]; target?: number; options?: TraceOptions }
> = {
  "quick-sort": { values: [9, 3, 7, 1] },
  "shell-sort": { values: [9, 3, 7, 1] },
  "radix-sort": { values: [9, -3, 7, 1] },
  "heap-sort": { values: [9, 3, 7, 1] },
  "linear-search": { values: [9, 3, 7, 1], target: 7 },
  "binary-search": { values: [1, 3, 7, 9], target: 7 },
  "bubble-sort": { values: [9, 3, 7, 1] },
  "selection-sort": { values: [9, 3, 7, 1] },
  "insertion-sort": { values: [9, 3, 7, 1] },
  "merge-sort": { values: [9, 3, 7, 1] },
  "array-traversal": { values: [3, 7, 2], target: 7 },
  "linked-list-traversal": { values: [3, 7, 2], target: 7 },
  "stack-operations": { values: [3, 7, 2] },
  "queue-operations": { values: [3, 7, 2] },
  "binary-search-tree": { values: [8, 4, 12, 2, 6] },
  "breadth-first-search": {
    values: [0, 1, 2, 3, 4],
    target: 0,
    options: graph,
  },
  "depth-first-search": {
    values: [0, 1, 2, 3, 4],
    target: 0,
    options: graph,
  },
};

test("all syllabus visualizers build deterministic bounded traces", () => {
  expect(algorithmKeys).toHaveLength(17);
  for (const key of algorithmKeys) {
    const fixture = fixtures[key],
      first = buildTrace(fixture.values, key, fixture.target, fixture.options),
      second = buildTrace(fixture.values, key, fixture.target, fixture.options);
    expect(first).toEqual(second);
    expect(first.length).toBeGreaterThan(1);
    expect(first.at(-1)?.done).toBe(true);
    expect(
      first.every((step) => step.line < algorithms[key].pseudocode.length),
    ).toBe(true);
    expect(
      first.every((step) =>
        [...step.active, ...step.visited, ...step.frontier].every(
          (index) => index >= 0 && index < step.values.length,
        ),
      ),
    ).toBe(true);
  }
});

test("new sort traces handle duplicates, negatives and extreme bounded input", () => {
  for (const key of [
    "quick-sort",
    "shell-sort",
    "radix-sort",
    "heap-sort",
  ] as const)
    for (const input of [
      [0],
      [-999, 999, 0, -999],
      [5, 5, 5],
      Array.from({ length: 50 }, (_, i) => 49 - i),
      [-10, -100, -1, -10],
    ]) {
      const original = [...input],
        trace = buildTrace(input, key);
      expect(trace.at(-1)?.values).toEqual([...input].sort((a, b) => a - b));
      expect(input).toEqual(original);
      expect(trace.length).toBeLessThan(10000);
      expect(trace.filter((t) => t.done)).toHaveLength(1);
    }
});

test("linear structures preserve traversal, LIFO and FIFO behavior", () => {
  const list = buildTrace([3, 7, 2], "linked-list-traversal", 7);
  expect(list.at(-1)?.found).toBe(1);
  expect(list.at(-1)?.visited).toEqual([0, 1]);

  const stack = buildTrace([3, 7, 2], "stack-operations");
  expect(
    stack
      .filter((step) => step.description.startsWith("Pop"))
      .map((step) => step.description),
  ).toEqual(["Pop 2.", "Pop 7.", "Pop 3."]);

  const queue = buildTrace([3, 7, 2], "queue-operations");
  expect(
    queue
      .filter((step) => step.description.startsWith("Dequeue"))
      .map((step) => step.description),
  ).toEqual(["Dequeue 3.", "Dequeue 7.", "Dequeue 2."]);
});

test("tree, BFS and DFS produce the expected traversal orders", () => {
  expect(
    buildTrace([8, 4, 12, 2, 6], "binary-search-tree").at(-1)?.description,
  ).toContain("2, 4, 6, 8, 12");
  expect(
    buildTrace([0, 1, 2, 3, 4], "breadth-first-search", 0, graph).at(-1)
      ?.description,
  ).toContain("0, 1, 2, 3, 4");
  expect(
    buildTrace([0, 1, 2, 3, 4], "depth-first-search", 0, graph).at(-1)
      ?.description,
  ).toContain("0, 1, 3, 2, 4");
});

test("tree and graph traces reject ambiguous or invalid node data", () => {
  expect(() => buildTrace([4, 4], "binary-search-tree")).toThrow(/unique/i);
  expect(() =>
    buildTrace([0, 1], "breadth-first-search", 2, { edges: [[0, 1]] }),
  ).toThrow(/start vertex/i);
  expect(() =>
    buildTrace([0, 1], "breadth-first-search", 0, { edges: [[0, 2]] }),
  ).toThrow(/distinct listed vertices/i);
});
