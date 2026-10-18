import { useEffect, useRef, useState } from "react";
import type { GraphEdge, GraphVertex } from "./types";
import {
  calculateEdgeEndpoints,
  computeCircleLayout,
  DEFAULT_NODE_RADIUS,
  Point,
  SVG_VIEWBOX_HEIGHT,
  SVG_VIEWBOX_WIDTH,
} from "./graph-geometry";

interface GraphCanvasProps {
  vertices: GraphVertex[];
  edges: GraphEdge[];
  nodeRadius?: number;
}

export function GraphCanvas({
  vertices,
  edges,
  nodeRadius = DEFAULT_NODE_RADIUS,
}: GraphCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Dynamic container dimensions
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    width: SVG_VIEWBOX_WIDTH,
    height: SVG_VIEWBOX_HEIGHT,
  });

  // Layout positions in SVG viewBox coordinate space [0..width] x [0..height]
  const [nodePositions, setNodePositions] = useState<Record<number, Point>>({});

  // Keep track of which nodes have been manually moved/dragged by the user
  const userMovedNodesRef = useRef<Set<number>>(new Set());
  const dimensionsRef = useRef(dimensions);
  dimensionsRef.current = dimensions;

  // Observe container resizing via ResizeObserver
  useEffect(() => {
    if (!containerRef.current) return;
    const updateDimensions = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const width = Math.max(300, Math.round(rect.width || SVG_VIEWBOX_WIDTH));
      const height = Math.max(260, Math.round(rect.height || SVG_VIEWBOX_HEIGHT));
      setDimensions((prev) => {
        if (Math.abs(prev.width - width) < 2 && Math.abs(prev.height - height) < 2) {
          return prev;
        }
        return { width, height };
      });
    };

    updateDimensions();

    const observer = new ResizeObserver(() => {
      updateDimensions();
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Compute or update node positions when vertices change or container resizes
  useEffect(() => {
    const { width, height } = dimensions;
    const padding = Math.min(width * 0.16, 75);
    const layout = computeCircleLayout(vertices.length, width, height, padding);

    setNodePositions((prev) => {
      const next: Record<number, Point> = { ...prev };
      vertices.forEach((v, idx) => {
        const existing = next[v.id];
        if (!userMovedNodesRef.current.has(v.id) || !existing) {
          next[v.id] = layout[idx] || { x: width / 2, y: height / 2 };
        } else {
          // Constrain dragged nodes inside new bounds
          next[v.id] = {
            x: Math.max(nodeRadius + 10, Math.min(width - nodeRadius - 10, existing.x)),
            y: Math.max(nodeRadius + 10, Math.min(height - nodeRadius - 10, existing.y)),
          };
        }
      });
      return next;
    });
  }, [vertices.length, dimensions.width, dimensions.height, nodeRadius]);

  // Dragging interaction state
  const [draggedNodeId, setDraggedNodeId] = useState<number | null>(null);

  const handlePointerDown = (id: number, e: React.PointerEvent<SVGGElement>) => {
    e.stopPropagation();
    e.preventDefault();
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    setDraggedNodeId(id);
    userMovedNodesRef.current.add(id);
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (draggedNodeId === null || !svgRef.current) return;

    // Convert client pixel coordinates to SVG viewBox coordinates
    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;

    const screenCTM = svg.getScreenCTM();
    if (!screenCTM) return;
    const svgPoint = pt.matrixTransform(screenCTM.inverse());

    const { width, height } = dimensionsRef.current;
    // Constrain within viewBox padding
    const clampedX = Math.max(nodeRadius + 10, Math.min(width - nodeRadius - 10, svgPoint.x));
    const clampedY = Math.max(nodeRadius + 10, Math.min(height - nodeRadius - 10, svgPoint.y));

    setNodePositions((prev) => ({
      ...prev,
      [draggedNodeId]: {
        x: Math.round(clampedX * 100) / 100,
        y: Math.round(clampedY * 100) / 100,
      },
    }));
  };

  const handlePointerUp = () => {
    if (draggedNodeId !== null) {
      setDraggedNodeId(null);
    }
  };

  return (
    <div
      ref={containerRef}
      className="algo-graph-stage unified-svg"
      role="region"
      aria-label="Unified SVG Graph Traversal Canvas"
    >
      <svg
        ref={svgRef}
        className="algo-graph-unified-svg"
        viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
        preserveAspectRatio="xMidYMid meet"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <defs>
          {/* Active glow filter for traversed and active elements */}
          <filter id="activeGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <filter id="frontierGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* ── EDGES LAYER: Shortened to end at node circumference ── */}
        <g className="algo-svg-edges-group">
          {edges.map((edge) => {
            const startCenter = nodePositions[edge.from] || { x: dimensions.width / 3, y: dimensions.height / 2 };
            const endCenter = nodePositions[edge.to] || { x: (dimensions.width * 2) / 3, y: dimensions.height / 2 };

            // Shorten edge by nodeRadius so it lands exactly on node border
            const endpoints = calculateEdgeEndpoints(
              startCenter,
              endCenter,
              nodeRadius,
              nodeRadius,
            );

            return (
              <line
                key={`edge-${edge.from}-${edge.to}`}
                x1={endpoints.x1}
                y1={endpoints.y1}
                x2={endpoints.x2}
                y2={endpoints.y2}
                className={`algo-svg-edge ${edge.state}`}
                data-edge={`${edge.from}-${edge.to}`}
                data-from={edge.from}
                data-to={edge.to}
                data-x1={endpoints.x1}
                data-y1={endpoints.y1}
                data-x2={endpoints.x2}
                data-y2={endpoints.y2}
              />
            );
          })}
        </g>

        {/* ── NODES LAYER: Rendered as SVG <g> elements in the exact same SVG ── */}
        <g className="algo-svg-nodes-group">
          {vertices.map((vertex) => {
            const pos = nodePositions[vertex.id] || { x: dimensions.width / 2, y: dimensions.height / 2 };
            const isDragging = draggedNodeId === vertex.id;

            return (
              <g
                key={`vertex-${vertex.id}`}
                className={`algo-svg-node ${vertex.state} ${isDragging ? "dragging" : ""}`}
                transform={`translate(${pos.x}, ${pos.y})`}
                onPointerDown={(e) => handlePointerDown(vertex.id, e)}
                style={{ cursor: isDragging ? "grabbing" : "grab" }}
                data-node-id={vertex.id}
                data-cx={pos.x}
                data-cy={pos.y}
              >
                {/* Outer halo / glow for active or frontier states */}
                {(vertex.state === "active" || vertex.state === "frontier") && (
                  <circle
                    r={nodeRadius + 6}
                    className="algo-node-glow-halo"
                    filter={vertex.state === "active" ? "url(#activeGlow)" : "url(#frontierGlow)"}
                  />
                )}

                {/* Primary node circle */}
                <circle
                  r={nodeRadius}
                  className={`algo-node-circle ${vertex.state}`}
                />

                {/* Vertex Label */}
                <text
                  className="algo-node-text"
                  textAnchor="middle"
                  dy=".35em"
                >
                  {vertex.label}
                </text>

                {/* Discovery Level Badge (BFS) */}
                {vertex.level !== undefined && vertex.level >= 0 && (
                  <g transform={`translate(0, ${nodeRadius + 14})`}>
                    <rect
                      x="-14"
                      y="-8"
                      width="28"
                      height="16"
                      rx="4"
                      className="algo-level-badge-rect"
                    />
                    <text
                      className="algo-level-badge-text"
                      textAnchor="middle"
                      dy=".3em"
                    >
                      L{vertex.level}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
