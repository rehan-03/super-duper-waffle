/**
 * Graph Geometry and Edge Calculation Utilities.
 * Guarantees that edge endpoints land exactly on node borders in the shared SVG coordinate system.
 */

export const SVG_VIEWBOX_WIDTH = 800;
export const SVG_VIEWBOX_HEIGHT = 420;
export const DEFAULT_NODE_RADIUS = 24;

export interface Point {
  x: number;
  y: number;
}

export interface EdgeEndpoints {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/**
 * Computes circular layout coordinates in SVG viewBox units.
 */
export function computeCircleLayout(
  count: number,
  viewWidth = SVG_VIEWBOX_WIDTH,
  viewHeight = SVG_VIEWBOX_HEIGHT,
  padding = 60,
): Point[] {
  const cx = viewWidth / 2;
  const cy = viewHeight / 2;
  const rx = Math.max(80, (viewWidth - padding * 2) / 2);
  const ry = Math.max(60, (viewHeight - padding * 2) / 2);

  const points: Point[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (2 * Math.PI * i) / count - Math.PI / 2;
    points.push({
      x: Math.round((cx + rx * Math.cos(angle)) * 100) / 100,
      y: Math.round((cy + ry * Math.sin(angle)) * 100) / 100,
    });
  }
  return points;
}

/**
 * Shortens an edge so it ends precisely at the node border (radius),
 * rather than piercing through to the center.
 */
export function calculateEdgeEndpoints(
  p1: Point,
  p2: Point,
  radius1 = DEFAULT_NODE_RADIUS,
  radius2 = DEFAULT_NODE_RADIUS,
): EdgeEndpoints {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // If distance is too small (overlapping nodes), return centers directly
  if (dist <= radius1 + radius2) {
    return {
      x1: Math.round(p1.x * 100) / 100,
      y1: Math.round(p1.y * 100) / 100,
      x2: Math.round(p2.x * 100) / 100,
      y2: Math.round(p2.y * 100) / 100,
    };
  }

  const ux = dx / dist;
  const uy = dy / dist;

  return {
    x1: Math.round((p1.x + ux * radius1) * 100) / 100,
    y1: Math.round((p1.y + uy * radius1) * 100) / 100,
    x2: Math.round((p2.x - ux * radius2) * 100) / 100,
    y2: Math.round((p2.y - uy * radius2) * 100) / 100,
  };
}

/**
 * Verifies that edge endpoints land on the node circumference within tolerance.
 */
export function verifyEdgeLandsOnNodeBorder(
  endpoints: EdgeEndpoints,
  center1: Point,
  center2: Point,
  radius1 = DEFAULT_NODE_RADIUS,
  radius2 = DEFAULT_NODE_RADIUS,
  tolerance = 1.0,
): { valid: boolean; dist1: number; dist2: number } {
  const dist1 = Math.sqrt(
    Math.pow(endpoints.x1 - center1.x, 2) + Math.pow(endpoints.y1 - center1.y, 2),
  );
  const dist2 = Math.sqrt(
    Math.pow(endpoints.x2 - center2.x, 2) + Math.pow(endpoints.y2 - center2.y, 2),
  );

  const valid =
    Math.abs(dist1 - radius1) <= tolerance &&
    Math.abs(dist2 - radius2) <= tolerance;

  return { valid, dist1, dist2 };
}
