import { handlePosition, RESIZE_HANDLES, type ResizeHandle } from '@/domain/element/geometry'
import { absolutePoints } from '@/domain/element/factory'
import { segmentMidpoints } from '@/domain/element/linear'
import type { LinearElement } from '@/domain/element/types'
import type { Bounds, Point } from '@/domain/shared/geometry'

/** Sizes in screen pixels; divide by zoom to get world units. */
export const HANDLE_SIZE = 8
export const HIT_TOLERANCE = 6

export function handleAt(bounds: Bounds, p: Point, zoom: number): ResizeHandle | null {
  const half = HANDLE_SIZE / zoom
  for (const handle of RESIZE_HANDLES) {
    const h = handlePosition(bounds, handle)
    if (Math.abs(p.x - h.x) <= half && Math.abs(p.y - h.y) <= half) return handle
  }
  return null
}

/** A point of a line (end or bend) or the middle of one of its segments. */
export type LineHandle = { readonly kind: 'point' | 'midpoint'; readonly index: number }

/** Segments shorter than this on screen get no midpoint handle (avoids clutter). */
const MIN_SEGMENT_FOR_MIDPOINT = HANDLE_SIZE * 4

export function visibleMidpoints(el: LinearElement, zoom: number): { index: number; point: Point }[] {
  const points = absolutePoints(el)
  return segmentMidpoints(el)
    .map((point, index) => ({ index, point }))
    .filter(({ index }) => {
      const a = points[index]!
      const b = points[index + 1]!
      return Math.hypot(b.x - a.x, b.y - a.y) * zoom >= MIN_SEGMENT_FOR_MIDPOINT
    })
}

/** The handle of a selected line under `p`; points win over midpoints. */
export function lineHandleAt(el: LinearElement, p: Point, zoom: number): LineHandle | null {
  const radius = HANDLE_SIZE / zoom
  const near = (q: Point) => Math.hypot(q.x - p.x, q.y - p.y) <= radius
  const points = absolutePoints(el)
  // Last first: a fresh line has its end right where the user clicked.
  for (let i = points.length - 1; i >= 0; i--) if (near(points[i]!)) return { kind: 'point', index: i }
  const mid = visibleMidpoints(el, zoom).find(({ point }) => near(point))
  return mid ? { kind: 'midpoint', index: mid.index } : null
}

export const handleCursor: Record<ResizeHandle, string> = {
  nw: 'nwse-resize',
  se: 'nwse-resize',
  ne: 'nesw-resize',
  sw: 'nesw-resize',
  n: 'ns-resize',
  s: 'ns-resize',
  e: 'ew-resize',
  w: 'ew-resize',
}
