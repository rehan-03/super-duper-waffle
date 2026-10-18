import type {
  AlgorithmDefinition,
  ElementState,
  GraphEdge,
  GraphVertex,
  VisualizerStep,
} from "../types";

export const bfsPseudocode = [
  "BFS(graph, startVertex):",
  "  create queue Q; enqueue startVertex",
  "  mark startVertex as discovered (level = 0)",
  "  while Q is not empty:",
  "    u = Q.dequeue(); visit(u)",
  "    for each neighbor v of u:",
  "      if v is not discovered:",
  "        mark v discovered (level = level[u] + 1)",
  "        light up edge (u, v); enqueue v",
  "  BFS traversal complete!",
];

export const defaultGraphVertices = [
  { id: 0, label: "0" },
  { id: 1, label: "1" },
  { id: 2, label: "2" },
  { id: 3, label: "3" },
  { id: 4, label: "4" },
  { id: 5, label: "5" },
];

export const defaultGraphEdges: [number, number][] = [
  [0, 1],
  [0, 2],
  [1, 3],
  [1, 4],
  [2, 4],
  [2, 5],
  [3, 4],
  [4, 5],
];

export function computeCirclePositions(
  count: number,
): { x: number; y: number }[] {
  const result: { x: number; y: number }[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (2 * Math.PI * i) / count - Math.PI / 2;
    result.push({
      x: Math.round(50 + 38 * Math.cos(angle)),
      y: Math.round(50 + 36 * Math.sin(angle)),
    });
  }
  return result;
}

export const bfsDefinition: AlgorithmDefinition = {
  id: "breadth-first-search",
  name: "Breadth-First Search (BFS)",
  category: "graph",
  isGraph: true,
  requiresTarget: true,
  description:
    "A graph traversal algorithm that explores vertices level by level using a First-In-First-Out (FIFO) queue. Edges light up as they are traversed, and vertices are color-coded by their discovery level.",
  complexity: {
    best: "O(V + E)",
    average: "O(V + E)",
    worst: "O(V + E)",
    space: "O(V) queue",
  },
  pseudocode: bfsPseudocode,
  generateSteps: (
    initialValues: number[],
    options?: { target?: number; graphEdges?: [number, number, number?][] },
  ): VisualizerStep[] => {
    const numVertices = Math.max(4, Math.min(8, initialValues.length || 6));
    const verticesList = Array.from({ length: numVertices }, (_, i) => i);
    const positions = computeCirclePositions(numVertices);

    const edgesList: [number, number][] = options?.graphEdges
      ? options.graphEdges.map(([u, v]) => [u, v])
      : defaultGraphEdges.filter(([u, v]) => u < numVertices && v < numVertices);

    // Build adjacency list
    const adj: number[][] = Array.from({ length: numVertices }, () => []);
    edgesList.forEach(([u, v]) => {
      adj[u]!.push(v);
      adj[v]!.push(u);
    });
    adj.forEach((neighbors) => neighbors.sort((a, b) => a - b));

    const startVertex =
      options?.target !== undefined && options.target < numVertices
        ? options.target
        : 0;

    const steps: VisualizerStep[] = [];
    let comparisons = 0;
    const swaps = 0;
    const shifts = 0;
    const writes = 0;
    let operations = 0;
    let stepCount = 0;

    const vertexStates: ElementState[] = Array(numVertices).fill("default");
    const vertexLevels: number[] = Array(numVertices).fill(-1);
    const edgeStates = new Map<string, "default" | "active" | "traversed" | "backtrack">();

    edgesList.forEach(([u, v]) => {
      edgeStates.set(`${Math.min(u, v)}-${Math.max(u, v)}`, "default");
    });

    const queue: number[] = [];
    const discovered = new Set<number>();
    const visitOrder: number[] = [];

    function makeGraphVertices(): GraphVertex[] {
      return verticesList.map((id) => ({
        id,
        label: String(id),
        x: positions[id]!.x,
        y: positions[id]!.y,
        state: vertexStates[id]!,
        level: vertexLevels[id]!,
      }));
    }

    function makeGraphEdges(): GraphEdge[] {
      return edgesList.map(([u, v]) => ({
        from: u,
        to: v,
        state: edgeStates.get(`${Math.min(u, v)}-${Math.max(u, v)}`) || "default",
      }));
    }

    function recordStep(
      type: VisualizerStep["type"],
      indices: number[],
      pseudocodeLine: number,
      description: string,
    ) {
      stepCount++;
      operations++;
      steps.push({
        id: `bfs-step-${stepCount}`,
        type,
        values: [...verticesList],
        keys: verticesList.map((v) => `v-${v}`),
        indices: [...indices],
        states: [...vertexStates],
        pseudocodeLine,
        description,
        counters: { comparisons, swaps, shifts, writes, operations },
        queue: [...queue],
        graphVertices: makeGraphVertices(),
        graphEdges: makeGraphEdges(),
      });
    }

    // Step 0: Init
    recordStep(
      "init",
      [],
      0,
      `Ready to run Breadth-First Search on ${numVertices} vertices starting from vertex ${startVertex}. Initializing empty queue.`,
    );

    // Enqueue start vertex
    discovered.add(startVertex);
    vertexLevels[startVertex] = 0;
    vertexStates[startVertex] = "frontier";
    queue.push(startVertex);

    recordStep(
      "enqueue",
      [startVertex],
      1,
      `Enqueued start vertex ${startVertex} into the queue at Level 0.`,
    );

    while (queue.length > 0) {
      const u = queue.shift()!;
      vertexStates[u] = "active";
      visitOrder.push(u);

      recordStep(
        "dequeue",
        [u],
        4,
        `Dequeued vertex ${u} (Level ${vertexLevels[u]}) from the front of the queue and visited it. Inspecting adjacent neighbors.`,
      );

      const neighbors = adj[u]!;

      for (const v of neighbors) {
        comparisons++;
        const edgeKey = `${Math.min(u, v)}-${Math.max(u, v)}`;

        if (!discovered.has(v)) {
          discovered.add(v);
          vertexLevels[v] = vertexLevels[u]! + 1;
          vertexStates[v] = "frontier";
          edgeStates.set(edgeKey, "traversed");
          queue.push(v);

          recordStep(
            "enqueue",
            [v],
            7,
            `Discovered neighbor vertex ${v} via edge (${u}, ${v}) at Level ${vertexLevels[v]}. Light up edge and enqueue ${v} at the rear.`,
          );
        } else {
          // Already discovered
          recordStep(
            "compare",
            [u, v],
            6,
            `Neighbor vertex ${v} is already discovered (Level ${vertexLevels[v]}). Skipping edge (${u}, ${v}).`,
          );
        }
      }

      vertexStates[u] = "sorted";
    }

    // Traversal complete
    recordStep(
      "complete",
      visitOrder,
      9,
      `BFS traversal complete! Visited ${visitOrder.length} reachable vertices in order: [${visitOrder.join(" → ")}].`,
    );

    return steps;
  },
};
