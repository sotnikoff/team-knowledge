import {
  containsPoint,
  distanceToPolyline,
  isPointInPolygon,
  type Bounds,
  type Point,
} from '../shared/geometry'
import { absolutePoints } from './factory'
import { lineLabelBox, linePath } from './linear'
import {
  TRANSPARENT,
  type DiagramElement,
  type ElementOfType,
  type ElementType,
  type PointsElement,
  type ShapeElement,
  isLinearElement,
  isShapeElement,
} from './types'

/**
 * Geometry behaviour of a single element type. Adding a new element type means
 * adding one entry to `geometryHandlers` — the mapped type below makes the
 * compiler insist on it (Open/Closed: existing handlers are untouched).
 */
export interface ElementGeometry<E extends DiagramElement> {
  hitTest(el: E, p: Point, tolerance: number): boolean
  /** Returns the element stretched to fit `target` (already normalized). */
  resize(el: E, target: Bounds): E
}

type GeometryRegistry = { [K in ElementType]: ElementGeometry<ElementOfType<K>> }

/** The interior is clickable when the shape is filled or has a label. */
const isSolid = (el: DiagramElement) =>
  el.style.fillColor !== TRANSPARENT || (isShapeElement(el) && el.label.trim() !== '')

const resizeBox = <E extends DiagramElement>(el: E, target: Bounds): E => ({
  ...el,
  x: target.x,
  y: target.y,
  width: target.width,
  height: target.height,
})

function rectOutline(b: Bounds): Point[] {
  return [
    { x: b.x, y: b.y },
    { x: b.x + b.width, y: b.y },
    { x: b.x + b.width, y: b.y + b.height },
    { x: b.x, y: b.y + b.height },
  ]
}

export function diamondPoints(b: Bounds): Point[] {
  return [
    { x: b.x + b.width / 2, y: b.y },
    { x: b.x + b.width, y: b.y + b.height / 2 },
    { x: b.x + b.width / 2, y: b.y + b.height },
    { x: b.x, y: b.y + b.height / 2 },
  ]
}

const pointsGeometry = <E extends PointsElement>(): ElementGeometry<E> => ({
  hitTest: (el, p, tol) => {
    if (!isLinearElement(el)) return distanceToPolyline(p, absolutePoints(el)) <= tol + el.style.strokeWidth / 2
    const label = lineLabelBox(el)
    return (
      distanceToPolyline(p, linePath(el)) <= tol + el.style.strokeWidth / 2 ||
      (label !== null && containsPoint(label, p, tol))
    )
  },
  resize: (el, target) => {
    const sx = el.width === 0 ? 1 : target.width / el.width
    const sy = el.height === 0 ? 1 : target.height / el.height
    return {
      ...el,
      x: target.x,
      y: target.y,
      width: el.width === 0 ? 0 : target.width,
      height: el.height === 0 ? 0 : target.height,
      points: el.points.map((pt) => ({ x: pt.x * sx, y: pt.y * sy })),
    }
  },
})

export const geometryHandlers: GeometryRegistry = {
  rectangle: {
    hitTest: (el, p, tol) =>
      isSolid(el) ? containsPoint(el, p, tol) : distanceToPolyline(p, rectOutline(el), true) <= tol,
    resize: resizeBox,
  },
  diamond: {
    hitTest: (el, p, tol) => {
      const poly = diamondPoints(el)
      return (isSolid(el) && isPointInPolygon(p, poly)) || distanceToPolyline(p, poly, true) <= tol
    },
    resize: resizeBox,
  },
  ellipse: {
    hitTest: (el, p, tol) => {
      const rx = el.width / 2
      const ry = el.height / 2
      if (rx === 0 || ry === 0) return containsPoint(el, p, tol)
      const nx = (p.x - (el.x + rx)) / rx
      const ny = (p.y - (el.y + ry)) / ry
      const d = Math.sqrt(nx * nx + ny * ny)
      if (isSolid(el) && d <= 1) return true
      return Math.abs(d - 1) * Math.min(rx, ry) <= tol
    },
    resize: resizeBox,
  },
  line: pointsGeometry(),
  arrow: pointsGeometry(),
  freedraw: pointsGeometry(),
  document: {
    hitTest: (el, p, tol) => containsPoint(el, p, tol),
    // Only the width is free: the height always follows the content.
    resize: (el, target) => ({ ...el, x: target.x, width: Math.max(160, target.width) }),
  },
  text: {
    hitTest: (el, p, tol) => containsPoint(el, p, tol),
    resize: (el, target) => {
      const scale = el.height === 0 ? 1 : Math.max(target.height / el.height, 0.1)
      return {
        ...el,
        x: target.x,
        y: target.y,
        fontSize: Math.max(4, el.fontSize * scale),
        width: el.width * scale,
        height: el.height * scale,
      }
    },
  },
}

function handlerFor<E extends DiagramElement>(el: E): ElementGeometry<E> {
  return geometryHandlers[el.type] as unknown as ElementGeometry<E>
}

export function hitTestElement(el: DiagramElement, p: Point, tolerance: number): boolean {
  return handlerFor(el).hitTest(el, p, tolerance)
}

export function resizeElement<E extends DiagramElement>(el: E, target: Bounds): E {
  return handlerFor(el).resize(el, target)
}

export function elementBounds(el: DiagramElement): Bounds {
  return { x: el.x, y: el.y, width: el.width, height: el.height }
}

export function translateElement<E extends DiagramElement>(el: E, dx: number, dy: number): E {
  return { ...el, x: el.x + dx, y: el.y + dy }
}

export type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w'

export const RESIZE_HANDLES: readonly ResizeHandle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']

export function handlePosition(b: Bounds, handle: ResizeHandle): Point {
  const cx = b.x + b.width / 2
  const cy = b.y + b.height / 2
  const right = b.x + b.width
  const bottom = b.y + b.height
  const map: Record<ResizeHandle, Point> = {
    nw: { x: b.x, y: b.y },
    n: { x: cx, y: b.y },
    ne: { x: right, y: b.y },
    e: { x: right, y: cy },
    se: { x: right, y: bottom },
    s: { x: cx, y: bottom },
    sw: { x: b.x, y: bottom },
    w: { x: b.x, y: cy },
  }
  return map[handle]
}

/** Moves the dragged handle of `start` to `pointer`, flipping when crossing over. */
export function resizeBounds(start: Bounds, handle: ResizeHandle, pointer: Point): Bounds {
  let left = start.x
  let top = start.y
  let right = start.x + start.width
  let bottom = start.y + start.height
  if (handle.includes('w')) left = pointer.x
  if (handle.includes('e')) right = pointer.x
  if (handle.includes('n')) top = pointer.y
  if (handle.includes('s')) bottom = pointer.y
  return {
    x: Math.min(left, right),
    y: Math.min(top, bottom),
    width: Math.abs(right - left),
    height: Math.abs(bottom - top),
  }
}

/** Whether `p` lies inside the shape's outline (not just its bounding box). */
export function isPointInsideShape(el: ShapeElement, p: Point): boolean {
  switch (el.type) {
    case 'rectangle':
      return containsPoint(el, p)
    case 'diamond':
      return isPointInPolygon(p, diamondPoints(el))
    case 'ellipse': {
      const rx = el.width / 2
      const ry = el.height / 2
      if (rx === 0 || ry === 0) return false
      const nx = (p.x - (el.x + rx)) / rx
      const ny = (p.y - (el.y + ry)) / ry
      return nx * nx + ny * ny <= 1
    }
  }
}

export const LABEL_PADDING = 8

/** Area available for a shape's label: the largest box comfortably inside it. */
export function labelBox(el: ShapeElement): Bounds {
  const ratio = el.type === 'rectangle' ? 1 : el.type === 'ellipse' ? Math.SQRT1_2 : 0.5
  const width = Math.max(0, el.width * ratio - LABEL_PADDING * 2)
  const height = Math.max(0, el.height * ratio - LABEL_PADDING * 2)
  return {
    x: el.x + (el.width - width) / 2,
    y: el.y + (el.height - height) / 2,
    width,
    height,
  }
}
