export const algorithms = {
  "quick-sort": {
    title: "Quick sort",
    complexity:
      "Average O(n log n), worst O(n²); recursion space O(n) worst case",
    pseudocode: [
      "choose the last value as pivot",
      "compare each value with pivot",
      "move values <= pivot to the left",
      "place pivot between partitions",
      "recursively sort both partitions",
    ],
    visualization: "array",
    syllabus: {
      subjectCode: "2301212",
      subjectTitle: "Data Structures",
      unit: "Unit I",
      pages: [42],
      source: "sy-2023.pdf",
    },
  },
  "shell-sort": {
    title: "Shell sort",
    complexity: "Halving gaps: worst O(n²), extra space O(1)",
    pseudocode: [
      "start with gap floor(n / 2)",
      "insert each value into its gap-separated prefix",
      "shift larger preceding values by gap",
      "place the saved value",
      "halve the gap until zero",
    ],
    visualization: "array",
    syllabus: {
      subjectCode: "2301212",
      subjectTitle: "Data Structures",
      unit: "Unit I",
      pages: [42],
      source: "sy-2023.pdf",
    },
  },
  "radix-sort": {
    title: "Radix sort",
    complexity:
      "O(d(n + 10)) time, O(n + 10) space; offset signed keys for decimal LSD passes",
    pseudocode: [
      "offset every key by the minimum to obtain nonnegative keys",
      "count the current decimal digit",
      "compute bucket starting positions",
      "place values stably into auxiliary storage",
      "copy back and advance to the next digit",
    ],
    visualization: "array",
    syllabus: {
      subjectCode: "2301212",
      subjectTitle: "Data Structures",
      unit: "Unit I",
      pages: [42],
      source: "sy-2023.pdf",
    },
  },
  "heap-sort": {
    title: "Heap sort",
    complexity: "O(n log n) time, O(1) extra array storage",
    pseudocode: [
      "build a max heap bottom up",
      "compare parent with its children",
      "swap with the larger child and sift down",
      "swap maximum with last unsorted value",
      "restore the heap in the remaining prefix",
    ],
    visualization: "array",
    syllabus: {
      subjectCode: "2301301",
      subjectTitle: "Data Structures and Algorithms",
      unit: "Unit III",
      pages: [3],
      source: "1781009701_ty-2023-pattern-computer-engineering-merged (1).pdf",
    },
  },
  "linear-search": {
    title: "Linear search",
    complexity: "Time O(n), extra space O(1)",
    pseudocode: [
      "for each index i from 0",
      "if A[i] equals target",
      "return i",
      "return not found",
    ],
    visualization: "array",
    syllabus: {
      subjectCode: "2300118A",
      subjectTitle: "Computational Thinking and Problem Solving",
      unit: "Unit IV",
      pages: [42],
      source: "fy-2023.pdf",
    },
  },
  "binary-search": {
    title: "Binary search",
    complexity: "Time O(log n), extra space O(1); sorted input required",
    pseudocode: [
      "low = 0; high = n − 1; found = none",
      "while low ≤ high",
      "mid = floor((low + high) / 2)",
      "if A[mid] = target: record mid; search left",
      "else narrow the left or right range",
      "return first matching index or not found",
    ],
    visualization: "array",
    syllabus: {
      subjectCode: "2300118A",
      subjectTitle: "Computational Thinking and Problem Solving",
      unit: "Unit IV",
      pages: [42],
      source: "fy-2023.pdf",
    },
  },
  "bubble-sort": {
    title: "Bubble sort",
    complexity:
      "Worst/average time O(n²); best O(n) with early exit; extra space O(1)",
    pseudocode: [
      "for end from n − 1 down to 1",
      "compare neighboring values",
      "swap when left value is greater",
      "stop early if no swaps occurred",
    ],
    visualization: "array",
    syllabus: {
      subjectCode: "2301214",
      subjectTitle: "Java Programming Lab",
      unit: "Sorting assignment",
      pages: [47],
      source: "sy-2023.pdf",
    },
  },
  "selection-sort": {
    title: "Selection sort",
    complexity: "Time O(n²), extra space O(1)",
    pseudocode: [
      "for each position i",
      "find the smallest remaining value",
      "swap that value into position i",
    ],
    visualization: "array",
    syllabus: {
      subjectCode: "2301215",
      subjectTitle: "Data Structures Lab",
      unit: "Sorting assignment",
      pages: [51],
      source: "sy-2023.pdf",
    },
  },
  "insertion-sort": {
    title: "Insertion sort",
    complexity: "Worst/average time O(n²); best O(n); extra space O(1)",
    pseudocode: [
      "for i from 1 to n − 1",
      "move the new value left",
      "swap while preceding value is greater",
      "the prefix is now sorted",
    ],
    visualization: "array",
    syllabus: {
      subjectCode: "2301215",
      subjectTitle: "Data Structures Lab",
      unit: "Sorting assignment",
      pages: [51],
      source: "sy-2023.pdf",
    },
  },
  "merge-sort": {
    title: "Merge sort",
    complexity: "Time O(n log n), extra space O(n)",
    pseudocode: [
      "split the range into two halves",
      "sort each half recursively",
      "merge sorted halves into auxiliary storage",
      "write the merged values back",
    ],
    visualization: "array",
    syllabus: {
      subjectCode: "2301212",
      subjectTitle: "Data Structures",
      unit: "Unit I",
      pages: [42],
      source: "sy-2023.pdf",
    },
  },
  "array-traversal": {
    title: "Array traversal",
    complexity: "Traversal/search time O(n), indexed access O(1), space O(1)",
    pseudocode: [
      "start at index 0",
      "visit the value at the current index",
      "if it matches the target, return the index",
      "advance to the next index",
      "return not found",
    ],
    visualization: "array",
    syllabus: {
      subjectCode: "2301212",
      subjectTitle: "Data Structures",
      unit: "Unit I · Sequential Organization",
      pages: [42],
      source: "sy-2023.pdf",
    },
  },
  "linked-list-traversal": {
    title: "Linked-list traversal",
    complexity: "Traversal/search time O(n), sequential access, space O(1)",
    pseudocode: [
      "current = head",
      "while current is not null",
      "visit current.value",
      "if value matches target, return current",
      "current = current.next",
      "return not found",
    ],
    visualization: "linked-list",
    syllabus: {
      subjectCode: "2301212",
      subjectTitle: "Data Structures",
      unit: "Unit III · Linked Lists",
      pages: [43],
      source: "sy-2023.pdf",
    },
  },
  "stack-operations": {
    title: "Stack operations",
    complexity: "Push and pop O(1); LIFO access",
    pseudocode: [
      "create an empty stack",
      "push each input value onto the top",
      "read the value at the top",
      "pop the top value",
      "repeat until the stack is empty",
    ],
    visualization: "stack",
    syllabus: {
      subjectCode: "2301212",
      subjectTitle: "Data Structures",
      unit: "Unit IV · Stack & Queue",
      pages: [43],
      source: "sy-2023.pdf",
    },
  },
  "queue-operations": {
    title: "Queue operations",
    complexity:
      "Enqueue and dequeue O(1) with front/rear tracking; FIFO access",
    pseudocode: [
      "create an empty queue",
      "enqueue each input value at the rear",
      "read the value at the front",
      "dequeue the front value",
      "repeat until the queue is empty",
    ],
    visualization: "queue",
    syllabus: {
      subjectCode: "2301212",
      subjectTitle: "Data Structures",
      unit: "Unit IV · Stack & Queue",
      pages: [43],
      source: "sy-2023.pdf",
    },
  },
  "binary-search-tree": {
    title: "Binary search tree",
    complexity:
      "Insert/search/traversal O(h); O(log n) when balanced, O(n) worst case",
    pseudocode: [
      "start with an empty tree",
      "compare the new value with the current node",
      "move left for smaller, right for larger",
      "insert at the first empty child",
      "traverse left, node, right for sorted order",
    ],
    visualization: "tree",
    syllabus: {
      subjectCode: "2301301",
      subjectTitle: "Data Structures and Algorithms",
      unit: "Unit II · Trees",
      pages: [3],
      source: "1781009701_ty-2023-pattern-computer-engineering-merged (1).pdf",
    },
  },
  "breadth-first-search": {
    title: "Breadth-first search",
    complexity: "Time O(V + E), space O(V); uses a queue",
    pseudocode: [
      "enqueue the start vertex and mark it discovered",
      "while the queue is not empty",
      "dequeue and visit the front vertex",
      "enqueue each undiscovered neighbor",
      "continue until the reachable graph is visited",
    ],
    visualization: "graph",
    syllabus: {
      subjectCode: "2301301",
      subjectTitle: "Data Structures and Algorithms",
      unit: "Unit I · Graph Algorithms",
      pages: [3],
      source: "1781009701_ty-2023-pattern-computer-engineering-merged (1).pdf",
    },
  },
  "depth-first-search": {
    title: "Depth-first search",
    complexity: "Time O(V + E), space O(V); uses a stack",
    pseudocode: [
      "push the start vertex",
      "while the stack is not empty",
      "pop the top vertex",
      "visit it if it is undiscovered",
      "push its undiscovered neighbors",
    ],
    visualization: "graph",
    syllabus: {
      subjectCode: "2301301",
      subjectTitle: "Data Structures and Algorithms",
      unit: "Unit I · Graph Algorithms",
      pages: [3],
      source: "1781009701_ty-2023-pattern-computer-engineering-merged (1).pdf",
    },
  },
} as const;
export type AlgorithmKey = keyof typeof algorithms;
export const algorithmKeys = Object.keys(algorithms) as AlgorithmKey[];
export type TraceStep = {
  values: number[];
  active: number[];
  sorted: number[];
  line: number;
  description: string;
  auxiliary: number[];
  found: number | null;
  done: boolean;
  kind: "array" | "linked-list" | "stack" | "queue" | "tree" | "graph";
  visited: number[];
  frontier: number[];
  edges: [number, number][];
  positions: { x: number; y: number }[];
};
export type TraceOptions = { edges?: [number, number][] };
export const structureKeys = [
  "array-traversal",
  "linked-list-traversal",
  "stack-operations",
  "queue-operations",
  "binary-search-tree",
  "breadth-first-search",
  "depth-first-search",
] as const satisfies readonly AlgorithmKey[];
export const requiresTarget = (key: AlgorithmKey) =>
  key.endsWith("search") ||
  key === "array-traversal" ||
  key === "linked-list-traversal";
export const isGraphAlgorithm = (key: AlgorithmKey) =>
  key === "breadth-first-search" || key === "depth-first-search";
export function validateInput(
  values: number[],
  key: AlgorithmKey,
  target?: number,
) {
  if (
    values.length < 1 ||
    values.length >
      (isGraphAlgorithm(key) || key === "binary-search-tree" ? 15 : 50) ||
    values.some((v) => !Number.isInteger(v) || v < -999 || v > 999)
  )
    throw new Error("Enter 1–50 integers between −999 and 999.");
  if (
    requiresTarget(key) &&
    (!Number.isInteger(target) || target! < -999 || target! > 999)
  )
    throw new Error("Enter an integer target between −999 and 999.");
  if (
    (isGraphAlgorithm(key) || key === "binary-search-tree") &&
    new Set(values).size !== values.length
  )
    throw new Error("Tree and graph node values must be unique.");
  if (isGraphAlgorithm(key) && !values.includes(target!))
    throw new Error("The start vertex must be present in the vertex list.");
  if (
    key === "binary-search" &&
    values.some((v, i) => i > 0 && values[i - 1]! > v)
  )
    throw new Error(
      "Binary search needs sorted input. Use Sort input to continue.",
    );
}

function buildStructureTrace(
  input: number[],
  key: (typeof structureKeys)[number],
  target: number | undefined,
  options: TraceOptions,
) {
  const steps: TraceStep[] = [];
  const add = ({
    values,
    description,
    line,
    active = [],
    visited = [],
    frontier = [],
    edges = [],
    positions = [],
    found = null,
    done = false,
  }: {
    values: number[];
    description: string;
    line: number;
    active?: number[];
    visited?: number[];
    frontier?: number[];
    edges?: [number, number][];
    positions?: { x: number; y: number }[];
    found?: number | null;
    done?: boolean;
  }) =>
    steps.push({
      values: [...values],
      active: [...active],
      sorted: [],
      line,
      description,
      auxiliary: frontier
        .map((index) => values[index]!)
        .filter(Number.isFinite),
      found,
      done,
      kind: algorithms[key].visualization,
      visited: [...visited],
      frontier: [...frontier],
      edges: edges.map((edge) => [...edge]),
      positions: positions.map((position) => ({ ...position })),
    });

  if (key === "array-traversal" || key === "linked-list-traversal") {
    const edges: [number, number][] = input
      .slice(1)
      .map((_, index) => [index, index + 1]);
    let found: number | null = null;
    add({
      values: input,
      description: "Ready. Use Play or Next step to begin traversal.",
      line: 0,
      edges,
    });
    for (let index = 0; index < input.length; index++) {
      add({
        values: input,
        description: `Visit ${key === "array-traversal" ? "index" : "node"} ${index} with value ${input[index]}.`,
        line: key === "array-traversal" ? 1 : 2,
        active: [index],
        visited: Array.from({ length: index }, (_, value) => value),
        edges,
      });
      if (input[index] === target) {
        found = index;
        add({
          values: input,
          description: `Target ${target} found at ${key === "array-traversal" ? "index" : "node"} ${index}.`,
          line: key === "array-traversal" ? 2 : 3,
          active: [index],
          visited: Array.from({ length: index + 1 }, (_, value) => value),
          edges,
          found,
        });
        break;
      }
    }
    add({
      values: input,
      description:
        found === null
          ? `Target ${target} was not found.`
          : `Traversal complete. First matching position: ${found}.`,
      line: found === null ? algorithms[key].pseudocode.length - 1 : 3,
      active: found === null ? [] : [found],
      visited: Array.from(
        { length: found === null ? input.length : found + 1 },
        (_, value) => value,
      ),
      edges,
      found,
      done: true,
    });
    return steps;
  }

  if (key === "stack-operations" || key === "queue-operations") {
    const values: number[] = [];
    const kind = key === "stack-operations" ? "stack" : "queue";
    add({
      values,
      description: `Start with an empty ${kind}.`,
      line: 0,
    });
    for (const value of input) {
      values.push(value);
      add({
        values,
        description: `${kind === "stack" ? "Push" : "Enqueue"} ${value}${kind === "queue" ? " at the rear" : " onto the top"}.`,
        line: 1,
        active: [values.length - 1],
      });
    }
    while (values.length) {
      const index = kind === "stack" ? values.length - 1 : 0;
      const value = values[index]!;
      add({
        values,
        description: `${kind === "stack" ? "Top" : "Front"} value is ${value}.`,
        line: 2,
        active: [index],
      });
      values.splice(index, 1);
      add({
        values,
        description: `${kind === "stack" ? "Pop" : "Dequeue"} ${value}.`,
        line: 3,
        active: values.length ? [kind === "stack" ? values.length - 1 : 0] : [],
      });
    }
    add({
      values,
      description: `${kind[0]!.toUpperCase() + kind.slice(1)} simulation complete; the structure is empty.`,
      line: 4,
      done: true,
    });
    return steps;
  }

  if (key === "binary-search-tree") {
    type Node = {
      value: number;
      left: number | null;
      right: number | null;
      depth: number;
    };
    const nodes: Node[] = [];
    const treeEdges: [number, number][] = [];
    const positions = () => {
      const order: number[] = [];
      const walk = (index: number | null) => {
        if (index === null) return;
        walk(nodes[index]!.left);
        order.push(index);
        walk(nodes[index]!.right);
      };
      walk(nodes.length ? 0 : null);
      const maxDepth = Math.max(1, ...nodes.map((node) => node.depth));
      const rank = new Map(order.map((index, position) => [index, position]));
      return nodes.map((node, index) => ({
        x:
          order.length === 1
            ? 50
            : 8 + (84 * rank.get(index)!) / (order.length - 1),
        y: 10 + (78 * node.depth) / maxDepth,
      }));
    };
    const snapshot = (
      description: string,
      line: number,
      active: number[] = [],
      visited: number[] = [],
      done = false,
    ) =>
      add({
        values: nodes.map((node) => node.value),
        description,
        line,
        active,
        visited,
        edges: treeEdges,
        positions: positions(),
        done,
      });
    snapshot("Start with an empty binary search tree.", 0);
    for (const value of input) {
      if (!nodes.length) {
        nodes.push({ value, left: null, right: null, depth: 0 });
        snapshot(`Insert ${value} as the root node.`, 3, [0]);
        continue;
      }
      let current = 0;
      while (true) {
        snapshot(`Compare ${value} with node ${nodes[current]!.value}.`, 1, [
          current,
        ]);
        const side = value < nodes[current]!.value ? "left" : "right";
        const next = nodes[current]![side];
        if (next !== null) {
          snapshot(`Move ${side} from ${nodes[current]!.value}.`, 2, [
            current,
            next,
          ]);
          current = next;
          continue;
        }
        const child = nodes.length;
        nodes.push({
          value,
          left: null,
          right: null,
          depth: nodes[current]!.depth + 1,
        });
        nodes[current]![side] = child;
        treeEdges.push([current, child]);
        snapshot(
          `Insert ${value} as the ${side} child of ${nodes[current]!.value}.`,
          3,
          [child],
        );
        break;
      }
    }
    const visited: number[] = [];
    const inorder = (index: number | null) => {
      if (index === null) return;
      inorder(nodes[index]!.left);
      visited.push(index);
      snapshot(
        `Visit ${nodes[index]!.value} during inorder traversal.`,
        4,
        [index],
        visited,
      );
      inorder(nodes[index]!.right);
    };
    inorder(nodes.length ? 0 : null);
    snapshot(
      `Inorder traversal complete: ${visited.map((index) => nodes[index]!.value).join(", ")}.`,
      4,
      [],
      visited,
      true,
    );
    return steps;
  }

  const edgeIndexes = (options.edges ?? []).map(([from, to]) => [
    input.indexOf(from),
    input.indexOf(to),
  ]) as [number, number][];
  if (
    edgeIndexes.some(([from, to]) => from < 0 || to < 0 || from === to) ||
    new Set(
      edgeIndexes.map(
        ([from, to]) => `${Math.min(from, to)}:${Math.max(from, to)}`,
      ),
    ).size !== edgeIndexes.length
  )
    throw new Error(
      "Graph edges must connect distinct listed vertices without duplicates.",
    );
  const positions = input.map((_, index) => {
    const angle = (2 * Math.PI * index) / input.length - Math.PI / 2;
    return {
      x: 50 + 38 * Math.cos(angle),
      y: 50 + 38 * Math.sin(angle),
    };
  });
  const adjacency = input.map(() => [] as number[]);
  for (const [from, to] of edgeIndexes) {
    adjacency[from]!.push(to);
    adjacency[to]!.push(from);
  }
  adjacency.forEach((neighbors) =>
    neighbors.sort((left, right) => left - right),
  );
  const start = input.indexOf(target!);
  const frontier = [start],
    discovered = new Set([start]),
    visited: number[] = [];
  const graphStep = (
    description: string,
    line: number,
    active: number[] = [],
    done = false,
  ) =>
    add({
      values: input,
      description,
      line,
      active,
      visited,
      frontier,
      edges: edgeIndexes,
      positions,
      done,
    });
  graphStep(
    `${key === "breadth-first-search" ? "Enqueue" : "Push"} start vertex ${target}.`,
    0,
    [start],
  );
  while (frontier.length) {
    const current =
      key === "breadth-first-search" ? frontier.shift()! : frontier.pop()!;
    visited.push(current);
    graphStep(
      `${key === "breadth-first-search" ? "Dequeue" : "Pop"} and visit ${input[current]}.`,
      key === "breadth-first-search" ? 2 : 3,
      [current],
    );
    const neighbors =
      key === "depth-first-search"
        ? [...adjacency[current]!].reverse()
        : adjacency[current]!;
    for (const neighbor of neighbors) {
      if (discovered.has(neighbor)) continue;
      discovered.add(neighbor);
      frontier.push(neighbor);
      graphStep(
        `${key === "breadth-first-search" ? "Enqueue" : "Push"} undiscovered neighbor ${input[neighbor]}.`,
        key === "breadth-first-search" ? 3 : 4,
        [current, neighbor],
      );
    }
  }
  graphStep(
    `${algorithms[key].title} complete. Visit order: ${visited
      .map((index) => input[index])
      .join(", ")}.`,
    4,
    [],
    true,
  );
  return steps;
}

export function buildTrace(
  input: number[],
  key: AlgorithmKey,
  target?: number,
  options: TraceOptions = {},
): TraceStep[] {
  validateInput(input, key, target);
  if ((structureKeys as readonly AlgorithmKey[]).includes(key))
    return buildStructureTrace(
      input,
      key as (typeof structureKeys)[number],
      target,
      options,
    );
  const a = [...input],
    steps: TraceStep[] = [];
  let found: number | null = null;
  const step = (
    description: string,
    line: number,
    active: number[] = [],
    sorted: number[] = [],
    auxiliary: number[] = [],
    done = false,
  ) =>
    steps.push({
      values: [...a],
      active: [...active],
      sorted: [...sorted],
      line,
      description,
      auxiliary: [...auxiliary],
      found,
      done,
      kind: "array",
      visited: [],
      frontier: [],
      edges: [],
      positions: [],
    });
  step("Ready. Use Play or Next step to begin.", 0);
  if (key === "linear-search") {
    for (let i = 0; i < a.length; i++) {
      step(`Compare index ${i}: ${a[i]} with target ${target}.`, 1, [i]);
      if (a[i] === target) {
        found = i;
        step(`First match is at index ${i}.`, 2, [i]);
        break;
      }
    }
  } else if (key === "binary-search") {
    let lo = 0,
      hi = a.length - 1;
    while (lo <= hi) {
      const mid = Math.floor((lo + hi) / 2);
      step(`Range ${lo}–${hi}; compare index ${mid}: ${a[mid]}.`, 2, [
        lo,
        mid,
        hi,
      ]);
      if (a[mid] === target) {
        found = mid;
        hi = mid - 1;
        step(
          `Match at ${mid}; continue left to find the first occurrence.`,
          3,
          [mid],
        );
      } else if (a[mid]! < target!) {
        lo = mid + 1;
        step(`Target is larger; move the lower bound to ${lo}.`, 4, [mid]);
      } else {
        hi = mid - 1;
        step(`Target is smaller; move the upper bound to ${hi}.`, 4, [mid]);
      }
    }
  } else if (key === "bubble-sort") {
    for (let end = a.length - 1; end > 0; end--) {
      let swapped = false;
      for (let i = 0; i < end; i++) {
        step(`Compare neighboring indices ${i} and ${i + 1}.`, 1, [i, i + 1]);
        if (a[i]! > a[i + 1]!) {
          [a[i], a[i + 1]] = [a[i + 1]!, a[i]!];
          swapped = true;
          step("Swap the out-of-order neighbors.", 2, [i, i + 1]);
        }
      }
      step(
        `Index ${end} is in its final position.`,
        0,
        [],
        Array.from({ length: a.length - end }, (_, i) => end + i),
      );
      if (!swapped) {
        step("No swaps occurred; the array is sorted.", 3);
        break;
      }
    }
  } else if (key === "selection-sort") {
    for (let i = 0; i < a.length - 1; i++) {
      let min = i;
      for (let j = i + 1; j < a.length; j++) {
        step(`Compare candidate ${min} with index ${j}.`, 1, [min, j]);
        if (a[j]! < a[min]!) min = j;
      }
      if (min !== i) {
        [a[i], a[min]] = [a[min]!, a[i]!];
        step(`Move the smallest remaining value to index ${i}.`, 2, [i, min]);
      }
    }
  } else if (key === "insertion-sort") {
    for (let i = 1; i < a.length; i++) {
      let j = i;
      step(`Insert the value at index ${i} into the sorted prefix.`, 0, [i]);
      while (j > 0) {
        step(`Compare indices ${j - 1} and ${j}.`, 2, [j - 1, j]);
        if (a[j - 1]! <= a[j]!) break;
        [a[j - 1], a[j]] = [a[j]!, a[j - 1]!];
        step("Move the inserted value one position left.", 2, [j - 1, j]);
        j--;
      }
      step(
        `Prefix 0–${i} is sorted.`,
        3,
        [],
        Array.from({ length: i + 1 }, (_, n) => n),
      );
    }
  } else if (key === "quick-sort") {
    const sort = (lo: number, hi: number) => {
      if (lo >= hi) return;
      const pivot = a[hi]!;
      step(`Choose pivot ${pivot} at index ${hi}.`, 0, [hi]);
      let boundary = lo;
      for (let j = lo; j < hi; j++) {
        step(`Compare ${a[j]} with pivot ${pivot}.`, 1, [j, hi]);
        if (a[j]! <= pivot) {
          [a[boundary], a[j]] = [a[j]!, a[boundary]!];
          step(`Extend the <= pivot partition through ${boundary}.`, 2, [
            boundary,
            j,
          ]);
          boundary++;
        }
      }
      [a[boundary], a[hi]] = [a[hi]!, a[boundary]!];
      step(`Pivot ${pivot} is in final position ${boundary}.`, 3, [boundary]);
      sort(lo, boundary - 1);
      sort(boundary + 1, hi);
    };
    sort(0, a.length - 1);
  } else if (key === "shell-sort") {
    for (
      let gap = Math.floor(a.length / 2);
      gap > 0;
      gap = Math.floor(gap / 2)
    ) {
      step(`Use gap ${gap}.`, 0);
      for (let i = gap; i < a.length; i++) {
        const value = a[i]!;
        let j = i;
        step(`Insert ${value} into its gap-${gap} prefix.`, 1, [i]);
        while (j >= gap && a[j - gap]! > value) {
          a[j] = a[j - gap]!;
          step(
            `Shift ${a[j]} from ${j - gap} to ${j}.`,
            2,
            [j - gap, j],
            [],
            [value],
          );
          j -= gap;
        }
        a[j] = value;
        step(`Place ${value} at ${j}.`, 3, [j]);
      }
      step(`Gap ${gap} pass complete. Halve the gap.`, 4);
    }
  } else if (key === "radix-sort") {
    const minimum = Math.min(...a),
      maximum = Math.max(...a) - minimum;
    step(
      `Use key = value - (${minimum}) so negative inputs preserve order.`,
      0,
    );
    for (let place = 1; place <= maximum; place *= 10) {
      const counts = Array<number>(10).fill(0),
        output = Array<number>(a.length).fill(0);
      const digit = (v: number) => Math.floor((v - minimum) / place) % 10;
      for (let i = 0; i < a.length; i++) {
        counts[digit(a[i]!)]!++;
        step(
          `Count digit ${digit(a[i]!)} of offset key ${a[i]! - minimum} at place ${place}.`,
          1,
          [i],
          [],
          counts,
        );
      }
      for (let i = 1; i < 10; i++) counts[i]! += counts[i - 1]!;
      step("Cumulative counts give exclusive bucket ends.", 2, [], [], counts);
      for (let i = a.length - 1; i >= 0; i--) {
        const bucket = digit(a[i]!);
        output[--counts[bucket]!] = a[i]!;
        step(`Place ${a[i]} stably in bucket ${bucket}.`, 3, [i], [], output);
      }
      a.splice(0, a.length, ...output);
      step(`Completed digit place ${place}.`, 4, [], [], output);
    }
  } else if (key === "heap-sort") {
    const sift = (root: number, end: number) => {
      while (root * 2 + 1 < end) {
        let child = root * 2 + 1;
        if (child + 1 < end && a[child + 1]! > a[child]!) child++;
        step(`Compare parent ${root} with larger child ${child}.`, 1, [
          root,
          child,
        ]);
        if (a[root]! >= a[child]!) return;
        [a[root], a[child]] = [a[child]!, a[root]!];
        step("Restore the max-heap ordering.", 2, [root, child]);
        root = child;
      }
    };
    for (let root = Math.floor(a.length / 2) - 1; root >= 0; root--)
      sift(root, a.length);
    step("Max heap built. The root is the maximum.", 0);
    for (let end = a.length - 1; end > 0; end--) {
      [a[0], a[end]] = [a[end]!, a[0]!];
      step(
        `Maximum placed at ${end}.`,
        3,
        [0, end],
        a.map((_, i) => i).slice(end),
      );
      sift(0, end);
      step(`Remaining prefix of length ${end} is a max heap.`, 4);
    }
  } else {
    const merge = (lo: number, hi: number) => {
      if (hi - lo <= 1) return;
      const mid = Math.floor((lo + hi) / 2);
      step(`Split range ${lo}–${hi - 1} at ${mid}.`, 0, [lo, mid, hi - 1]);
      merge(lo, mid);
      merge(mid, hi);
      const left = a.slice(lo, mid),
        right = a.slice(mid, hi),
        temp: number[] = [];
      let l = 0,
        r = 0;
      while (l < left.length || r < right.length) {
        if (r === right.length || (l < left.length && left[l]! <= right[r]!))
          temp.push(left[l++]!);
        else temp.push(right[r++]!);
        step(
          "Take the smaller front value into auxiliary storage.",
          2,
          [lo, hi - 1],
          [],
          temp,
        );
      }
      for (let i = 0; i < temp.length; i++) {
        a[lo + i] = temp[i]!;
        step(`Write ${temp[i]} to index ${lo + i}.`, 3, [lo + i], [], temp);
      }
    };
    merge(0, a.length);
  }
  step(
    key.endsWith("search")
      ? found === null
        ? "Target not found."
        : `First matching index: ${found}.`
      : "Sorting complete.",
    key.endsWith("search") ? algorithms[key].pseudocode.length - 1 : 0,
    found === null ? [] : [found],
    key.endsWith("search") ? [] : a.map((_, i) => i),
    [],
    true,
  );
  return steps;
}
export type EvidenceAnswer = {
  familyId: string;
  selectedOption: number | null;
  isCorrect: boolean | null;
};
export function mastery(attempts: { items: EvidenceAnswer[] }[]) {
  const latest = new Map<string, EvidenceAnswer>();
  for (const attempt of attempts.slice(0, 5))
    for (const item of attempt.items)
      if (!latest.has(item.familyId) && latest.size < 20)
        latest.set(item.familyId, item);
  const answers = [...latest.values()],
    evidenceCount = answers.filter((a) => a.selectedOption !== null).length;
  const score = answers.length
    ? Math.round(
        (answers.filter((a) => a.isCorrect).length / answers.length) * 100,
      )
    : null;
  const state = !attempts.length
    ? "UNASSESSED"
    : evidenceCount < 10
      ? "INSUFFICIENT_EVIDENCE"
      : score! < 60
        ? "WEAK"
        : score! < 80
          ? "DEVELOPING"
          : "MASTERED";
  return {
    score: evidenceCount >= 10 ? score : null,
    evidenceCount,
    familyCount: answers.length,
    state,
  };
}
export function quizMix(state: string) {
  return state === "MASTERED"
    ? [2, 4, 4]
    : state === "DEVELOPING"
      ? [3, 4, 3]
      : [6, 4, 0];
}
export function normalizeOutput(value: string) {
  return value
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[\t ]+$/, ""))
    .join("\n");
}
