import type { Point } from '../shared/geometry'

/** One cubic Bézier piece of a smooth line. */
export interface CubicSegment {
  readonly from: Point
  readonly c1: Point
  readonly c2: Point
  readonly to: Point
}

/**
 * Uniform Catmull–Rom spline through all `points` (the curve passes through
 * every point, the end points are duplicated), as cubic Bézier segments.
 */
export function catmullRomSegments(points: readonly Point[]): CubicSegment[] {
  const segments: CubicSegment[] = []
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i]!
    const p2 = points[i + 1]!
    const p0 = points[i - 1] ?? p1
    const p3 = points[i + 2] ?? p2
    segments.push({
      from: p1,
      c1: { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 },
      c2: { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 },
      to: p2,
    })
  }
  return segments
}

export function cubicAt(s: CubicSegment, t: number): Point {
  const u = 1 - t
  const a = u * u * u
  const b = 3 * u * u * t
  const c = 3 * u * t * t
  const d = t * t * t
  return {
    x: a * s.from.x + b * s.c1.x + c * s.c2.x + d * s.to.x,
    y: a * s.from.y + b * s.c1.y + c * s.c2.y + d * s.to.y,
  }
}

const STEPS_PER_SEGMENT = 16

/**
 * The polyline actually traced by a line through `points`: the points
 * themselves for a broken line, a dense sampling of the spline for a smooth
 * one. Used for hit-testing and bounds, so they match what is drawn.
 */
export function traceLine(points: readonly Point[], curved: boolean): Point[] {
  if (!curved || points.length < 3) return [...points]
  const traced: Point[] = [points[0]!]
  for (const segment of catmullRomSegments(points)) {
    for (let step = 1; step <= STEPS_PER_SEGMENT; step++) traced.push(cubicAt(segment, step / STEPS_PER_SEGMENT))
  }
  return traced
}
