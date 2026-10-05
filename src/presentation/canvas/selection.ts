import { handlePosition, RESIZE_HANDLES, type ResizeHandle } from '@/domain/element/geometry'
import { absolutePoints } from '@/domain/element/factory'
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

/** Which end of a line/arrow is under `p`, if any. */
export function linearEndAt(el: LinearElement, p: Point, zoom: number): 'start' | 'end' | null {
  const points = absolutePoints(el)
  const radius = HANDLE_SIZE / zoom
  const near = (q: Point | undefined) => q !== undefined && Math.hypot(q.x - p.x, q.y - p.y) <= radius
  if (near(points.at(-1))) return 'end'
  if (near(points[0])) return 'start'
  return null
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
