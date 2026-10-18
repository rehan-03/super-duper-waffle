import type {
  AlgorithmDefinition,
  ElementState,
  GraphEdge,
  GraphVertex,
  VisualizerStep,
} from "../types";
import {
  computeCirclePositions,
  defaultGraphEdges,
} from "./breadth-first-search";

export const dfsPseudocode = [
  "DFS(graph, startVertex):",
  "  create stack S; push startVertex",
  "  while S is not empty:",
  "    u = S.top()                   // Inspect top vertex",
  "    if u is unvisited: mark u visited",
  "    v = findUnvisitedNeighbor(u)",
  "    if v exists: light up edge (u, v); push v onto S",
  "    else: S.pop(); backtrack to previous vertex",
  "  DFS traversal complete!",
];

export const dfsDefinition: AlgorithmDefinition = {
  id: "depth-first-search",
  name: "Depth-First Search (DFS)",
  category: "graph",
  isGraph: true,
  requiresTarget: true,
  description:
    "A graph traversal algorithm that explores as far as possible along each branch before backtracking using a Last-In-First-Out (LIFO) stack. Backtracking steps and active stack frames are visibly highlighted.",
  complexity: {
    best: "O(V + E)",
    average: "O(V + E)",
    worst: "O(V + E)",
    space: "O(V) recursion/stack",
  },
  pseudocode: dfsPseudocode,
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
    let swaps = 0;
    let shifts = 0;
    let writes = 0;
    let operations = 0;
    let stepCount = 0;

    const vertexStates: ElementState[] = Array(numVertices).fill("default");
    const edgeStates = new Map<string, "default" | "active" | "traversed" | "backtrack">();

    edgesList.forEach(([u, v]) => {
      edgeStates.set(`${Math.min(u, v)}-${Math.max(u, v)}`, "default");
    });

    const stack: number[] = [];
    const visited = new Set<number>();
    const visitOrder: number[] = [];

    function makeGraphVertices(): GraphVertex[] {
      return verticesList.map((id) => ({
        id,
        label: String(id),
        x: positions[id]!.x,
        y: positions[id]!.y,
        state: vertexStates[id]!,
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
        id: `dfs-step-${stepCount}`,
        type,
        values: [...verticesList],
        keys: verticesList.map((v) => `v-${v}`),
        indices: [...indices],
        states: [...vertexStates],
        pseudocodeLine,
        description,
        counters: { comparisons, swaps, shifts, writes, operations },
        stack: [...stack],
        graphVertices: makeGraphVertices(),
        graphEdges: makeGraphEdges(),
      });
    }

    // Init
    recordStep(
      "init",
      [],
      0,
      `Ready to run Depth-First Search on ${numVertices} vertices starting from vertex ${startVertex}. Initializing empty LIFO stack.`,
    );

    // Push start vertex
    stack.push(startVertex);
    vertexStates[startVertex] = "frontier";
    recordStep(
      "push",
      [startVertex],
      1,
      `Pushed start vertex ${startVertex} onto the stack.`,
    );

    while (stack.length > 0) {
      const u = stack[stack.length - 1]!;

      if (!visited.has(u)) {
        visited.add(u);
        visitOrder.push(u);
        vertexStates[u] = "active";
        recordStep(
          "visit",
          [u],
          4,
          `Visited vertex ${u} (top of stack). Exploring neighbors deeply.`,
        );
      }

      // Find first unvisited neighbor
      let nextUnvisited: number | null = null;
      for (const v of adj[u]!) {
        comparisons++;
        if (!visited.has(v)) {
          nextUnvisited = v;
          break;
        }
      }

      if (nextUnvisited !== null) {
        const v = nextUnvisited;
        const edgeKey = `${Math.min(u, v)}-${Math.max(u, v)}`;
        edgeStates.set(edgeKey, "traversed");
        vertexStates[v] = "frontier";
        stack.push(v);

        recordStep(
          "push",
          [v],
          6,
          `Traversing deeply: Found unvisited neighbor ${v} via edge (${u}, ${v}). Lighting up edge and pushing ${v} onto stack.`,
        );
      } else {
        // No unvisited neighbors: Backtrack!
        const popped = stack.pop()!;
        vertexStates[popped] = "visited";

        const parent = stack.length > 0 ? stack[stack.length - 1]! : null;

        if (parent !== null) {
          const p = parent;
          const edgeKey = `${Math.min(popped, p)}-${Math.max(popped, p)}`;
          edgeStates.set(edgeKey, "backtrack");
          recordStep(
            "backtrack",
            [popped, p],
            7,
            `Dead end reached at vertex ${popped}: all neighbors are visited. Popping ${popped} and backtracking to vertex ${p}.`,
          );
        } else {
          recordStep(
            "pop",
            [popped],
            7,
            `All reachable vertices from vertex ${popped} explored. Popping root vertex from stack.`,
          );
        }
      }
    }

    recordStep(
      "complete",
      visitOrder,
      8,
      `DFS traversal complete! Visited ${visitOrder.length} vertices in order: [${visitOrder.join(" → ")}].`,
    );

    return steps;
  },
};
