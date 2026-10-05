import type { Point } from '@/domain/shared/geometry'

/** screen = (world + scroll) * zoom */
export interface Viewport {
  readonly scrollX: number
  readonly scrollY: number
  readonly zoom: number
}

export const MIN_ZOOM = 0.1
export const MAX_ZOOM = 5
export const initialViewport: Viewport = { scrollX: 0, scrollY: 0, zoom: 1 }

export function screenToWorld(v: Viewport, p: Point): Point {
  return { x: p.x / v.zoom - v.scrollX, y: p.y / v.zoom - v.scrollY }
}

export function worldToScreen(v: Viewport, p: Point): Point {
  return { x: (p.x + v.scrollX) * v.zoom, y: (p.y + v.scrollY) * v.zoom }
}

/** Pans by a delta expressed in screen pixels. */
export function panBy(v: Viewport, dx: number, dy: number): Viewport {
  return { ...v, scrollX: v.scrollX + dx / v.zoom, scrollY: v.scrollY + dy / v.zoom }
}

/** Zooms keeping the world point under `anchor` (screen coords) fixed. */
export function zoomAt(v: Viewport, nextZoom: number, anchor: Point): Viewport {
  const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, nextZoom))
  const world = screenToWorld(v, anchor)
  return { zoom, scrollX: anchor.x / zoom - world.x, scrollY: anchor.y / zoom - world.y }
}
