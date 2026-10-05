export interface Point {
  readonly x: number
  readonly y: number
}

/** Axis-aligned rectangle with non-negative width/height. */
export interface Bounds {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

export function boundsFromPoints(a: Point, b: Point): Bounds {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    width: Math.abs(b.x - a.x),
    height: Math.abs(b.y - a.y),
  }
}

export function boundsOfPoints(points: readonly Point[]): Bounds {
  if (points.length === 0) return { x: 0, y: 0, width: 0, height: 0 }
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const p of points) {
    minX = Math.min(minX, p.x)
    minY = Math.min(minY, p.y)
    maxX = Math.max(maxX, p.x)
    maxY = Math.max(maxY, p.y)
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}

export function unionBounds(list: readonly Bounds[]): Bounds | null {
  if (list.length === 0) return null
  return boundsOfPoints(
    list.flatMap((b) => [
      { x: b.x, y: b.y },
      { x: b.x + b.width, y: b.y + b.height },
    ]),
  )
}

export function containsPoint(b: Bounds, p: Point, tolerance = 0): boolean {
  return (
    p.x >= b.x - tolerance &&
    p.x <= b.x + b.width + tolerance &&
    p.y >= b.y - tolerance &&
    p.y <= b.y + b.height + tolerance
  )
}

export function containsBounds(outer: Bounds, inner: Bounds): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.width <= outer.x + outer.width &&
    inner.y + inner.height <= outer.y + outer.height
  )
}

export function distanceToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const lengthSq = dx * dx + dy * dy
  if (lengthSq === 0) return Math.hypot(p.x - a.x, p.y - a.y)
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq))
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy))
}

export function distanceToPolyline(p: Point, points: readonly Point[], closed = false): number {
  if (points.length === 0) return Infinity
  if (points.length === 1) return Math.hypot(p.x - points[0]!.x, p.y - points[0]!.y)
  let min = Infinity
  const count = closed ? points.length : points.length - 1
  for (let i = 0; i < count; i++) {
    min = Math.min(min, distanceToSegment(p, points[i]!, points[(i + 1) % points.length]!))
  }
  return min
}

export function isPointInPolygon(p: Point, polygon: readonly Point[]): boolean {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i]!
    const b = polygon[j]!
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) {
      inside = !inside
    }
  }
  return inside
}
