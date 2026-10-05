import type { Bounds, Point } from '../shared/geometry'
import { catmullRomSegments, cubicAt, pointAlong, traceLine } from './curve'
import { absolutePoints, withAbsolutePoints } from './factory'
import type { LinearElement } from './types'

/**
 * Editing of lines/arrows with bend points. `points[0]` and the last point are
 * the ends (they can be bound to shapes); everything in between is a bend.
 */

/** Absolute polyline that is drawn for the element. */
export function linePath(el: LinearElement): Point[] {
  return traceLine(absolutePoints(el), el.curved)
}

/** Middle of every segment along the drawn line (where a new bend can be pulled out). */
export function segmentMidpoints(el: LinearElement): Point[] {
  const points = absolutePoints(el)
  if (el.curved && points.length > 2) return catmullRomSegments(points).map((s) => cubicAt(s, 0.5))
  return points.slice(1).map((p, i) => ({ x: (points[i]!.x + p.x) / 2, y: (points[i]!.y + p.y) / 2 }))
}

/** Font size of line labels (world units); shared with the renderer. */
export const LINE_LABEL_FONT_SIZE = 20
export const LINE_LABEL_LINE_HEIGHT = 1.25

/** Where the label sits: the middle of the drawn line, bends included. */
export function lineLabelAnchor(el: LinearElement): Point {
  return pointAlong(linePath(el), 0.5)
}

/**
 * Approximate box of the label, for hit-testing only (the domain cannot
 * measure text; the renderer measures it exactly).
 */
export function lineLabelBox(el: LinearElement): Bounds | null {
  const lines = el.label.split('\n')
  if (el.label.trim() === '') return null
  const width = Math.max(...lines.map((line) => line.length)) * LINE_LABEL_FONT_SIZE * 0.55
  const height = lines.length * LINE_LABEL_FONT_SIZE * LINE_LABEL_LINE_HEIGHT
  const anchor = lineLabelAnchor(el)
  return { x: anchor.x - width / 2, y: anchor.y - height / 2, width, height }
}

export function isBendIndex(el: LinearElement, index: number): boolean {
  return index > 0 && index < el.points.length - 1
}

export function moveLinePoint(el: LinearElement, index: number, point: Point): LinearElement {
  const points = absolutePoints(el)
  if (index < 0 || index >= points.length) return el
  points[index] = point
  return withAbsolutePoints(el, points)
}

/** Inserts a bend so that it becomes `points[index]`. */
export function insertBend(el: LinearElement, index: number, point: Point): LinearElement {
  if (index < 1 || index > el.points.length - 1) return el
  const points = absolutePoints(el)
  points.splice(index, 0, point)
  return withAbsolutePoints(el, points)
}

/** Removes a bend; the ends cannot be removed. */
export function removeBend(el: LinearElement, index: number): LinearElement {
  if (!isBendIndex(el, index)) return el
  const points = absolutePoints(el)
  points.splice(index, 1)
  return withAbsolutePoints(el, points)
}

/** Switches between a smooth curve and a broken line (bounds are recomputed). */
export function setCurved(el: LinearElement, curved: boolean): LinearElement {
  if (el.curved === curved) return el
  return withAbsolutePoints({ ...el, curved }, absolutePoints(el))
}
