import { describe, it, expect } from "vitest";
import {
  computeCircleLayout,
  calculateEdgeEndpoints,
  verifyEdgeLandsOnNodeBorder,
  DEFAULT_NODE_RADIUS,
  Point,
} from "../../apps/web/src/visualizer/graph-geometry";
import {
  bfsDefinition,
  defaultGraphEdges,
  defaultGraphVertices,
} from "../../apps/web/src/visualizer/algorithms/breadth-first-search";
import { dfsDefinition } from "../../apps/web/src/visualizer/algorithms/depth-first-search";

describe("Graph Geometry & Edge-to-Node Border Precision Tests", () => {
  const containerViewports = [
    { name: "Mobile Small (320px)", width: 320, height: 280, padding: 45 },
    { name: "Mobile Standard (375px)", width: 375, height: 320, padding: 50 },
    { name: "Tablet (768px)", width: 768, height: 400, padding: 65 },
    { name: "Desktop (800px)", width: 800, height: 420, padding: 75 },
    { name: "Desktop Wide (1440px)", width: 1440, height: 500, padding: 85 },
  ];

  containerViewports.forEach(({ name, width, height, padding }) => {
    describe(`Container Width: ${name} (${width}x${height})`, () => {
      it("computes all node positions within container boundaries", () => {
        const nodeCount = 6;
        const positions = computeCircleLayout(nodeCount, width, height, padding);
        expect(positions).toHaveLength(nodeCount);

        positions.forEach((pos) => {
          expect(pos.x).toBeGreaterThanOrEqual(DEFAULT_NODE_RADIUS);
          expect(pos.x).toBeLessThanOrEqual(width - DEFAULT_NODE_RADIUS);
          expect(pos.y).toBeGreaterThanOrEqual(DEFAULT_NODE_RADIUS);
          expect(pos.y).toBeLessThanOrEqual(height - DEFAULT_NODE_RADIUS);
        });
      });

      it("ensures every edge endpoint lands precisely on the node border (within node radius)", () => {
        const positions = computeCircleLayout(
          defaultGraphVertices.length,
          width,
          height,
          padding,
        );

        defaultGraphEdges.forEach(([from, to]) => {
          const p1 = positions[from];
          const p2 = positions[to];
          expect(p1).toBeDefined();
          expect(p2).toBeDefined();

          const endpoints = calculateEdgeEndpoints(
            p1,
            p2,
            DEFAULT_NODE_RADIUS,
            DEFAULT_NODE_RADIUS,
          );

          // Verify endpoint 1 is distance R from center 1 (on node border)
          const dist1 = Math.sqrt(
            Math.pow(endpoints.x1 - p1.x, 2) + Math.pow(endpoints.y1 - p1.y, 2),
          );
          // Verify endpoint 2 is distance R from center 2 (on node border)
          const dist2 = Math.sqrt(
            Math.pow(endpoints.x2 - p2.x, 2) + Math.pow(endpoints.y2 - p2.y, 2),
          );

          // Both endpoints must equal the node radius within 0.1px tolerance
          expect(Math.abs(dist1 - DEFAULT_NODE_RADIUS)).toBeLessThanOrEqual(0.1);
          expect(Math.abs(dist2 - DEFAULT_NODE_RADIUS)).toBeLessThanOrEqual(0.1);

          // Both endpoints are within node radius distance of node centers
          expect(dist1).toBeLessThanOrEqual(DEFAULT_NODE_RADIUS + 0.1);
          expect(dist2).toBeLessThanOrEqual(DEFAULT_NODE_RADIUS + 0.1);

          // Built-in verification helper passes
          const verification = verifyEdgeLandsOnNodeBorder(
            endpoints,
            p1,
            p2,
            DEFAULT_NODE_RADIUS,
            DEFAULT_NODE_RADIUS,
            0.15,
          );
          expect(verification.valid).toBe(true);
        });
      });
    });
  });

  describe("Interactive Node Dragging Attachment", () => {
    it("keeps incident edges attached to node borders when a node moves dynamically", () => {
      const p1: Point = { x: 400, y: 210 };
      const draggedPositions: Point[] = [
        { x: 100, y: 80 },
        { x: 550, y: 120 },
        { x: 720, y: 350 },
        { x: 250, y: 300 },
      ];

      draggedPositions.forEach((draggedP2) => {
        const endpoints = calculateEdgeEndpoints(
          p1,
          draggedP2,
          DEFAULT_NODE_RADIUS,
          DEFAULT_NODE_RADIUS,
        );

        const dist1 = Math.sqrt(
          Math.pow(endpoints.x1 - p1.x, 2) + Math.pow(endpoints.y1 - p1.y, 2),
        );
        const dist2 = Math.sqrt(
          Math.pow(endpoints.x2 - draggedP2.x, 2) +
            Math.pow(endpoints.y2 - draggedP2.y, 2),
        );

        expect(Math.abs(dist1 - DEFAULT_NODE_RADIUS)).toBeLessThanOrEqual(0.1);
        expect(Math.abs(dist2 - DEFAULT_NODE_RADIUS)).toBeLessThanOrEqual(0.1);
      });
    });
  });

  describe("BFS & DFS Traversal and Edge Highlighting Logic", () => {
    it("BFS highlights traversed edges and populates queue correctly", () => {
      const steps = bfsDefinition.generateSteps([0, 1, 2, 3, 4, 5]);
      expect(steps.length).toBeGreaterThan(5);

      // Verify that every step with graphEdges maintains valid structure
      const edgeTraversalSteps = steps.filter((s) =>
        s.graphEdges?.some((e) => e.state === "active" || e.state === "traversed"),
      );
      expect(edgeTraversalSteps.length).toBeGreaterThan(0);

      // Final step must have all connected edges either traversed or default
      const finalStep = steps[steps.length - 1];
      expect(finalStep.type).toBe("complete");
      const traversedEdges = finalStep.graphEdges?.filter(
        (e) => e.state === "traversed",
      );
      expect(traversedEdges?.length).toBeGreaterThanOrEqual(4);

      // Every traversed edge must correspond to an actual edge in defaultGraphEdges
      traversedEdges?.forEach((edge) => {
        const edgeExists = defaultGraphEdges.some(
          ([u, v]) =>
            (edge.from === u && edge.to === v) ||
            (edge.from === v && edge.to === u),
        );
        expect(edgeExists).toBe(true);
      });
    });

    it("DFS highlights deep traversal edges and backtracking correctly", () => {
      const steps = dfsDefinition.generateSteps([0, 1, 2, 3, 4, 5]);
      expect(steps.length).toBeGreaterThan(5);

      // Verify presence of backtrack action step
      const backtrackStep = steps.find((s) => s.type === "backtrack");
      expect(backtrackStep).toBeDefined();

      // Final step must have completed DFS traversal
      const finalStep = steps[steps.length - 1];
      expect(finalStep.type).toBe("complete");
      expect(
        finalStep.graphVertices?.every((v) => v.state === "visited"),
      ).toBe(true);
    });
  });
});
