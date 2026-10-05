import { containsPoint, type Point } from '../shared/geometry'
import { absolutePoints, withAbsolutePoints } from './factory'
import {
  ANCHORS,
  isBindableElement,
  isLinearElement,
  type Anchor,
  type BindableElement,
  type Binding,
  type DiagramElement,
  type ElementId,
  type LinearElement,
} from './types'

/** Distance between an anchored line end and the element's outline. */
export const BINDING_GAP = 6

/** Midpoint of the given side, pushed `gap` units outwards. */
export function anchorPoint(el: DiagramElement, anchor: Anchor, gap = BINDING_GAP): Point {
  const cx = el.x + el.width / 2
  const cy = el.y + el.height / 2
  switch (anchor) {
    case 'top':
      return { x: cx, y: el.y - gap }
    case 'right':
      return { x: el.x + el.width + gap, y: cy }
    case 'bottom':
      return { x: cx, y: el.y + el.height + gap }
    case 'left':
      return { x: el.x - gap, y: cy }
  }
}

function nearestAnchor(el: DiagramElement, p: Point): Anchor {
  let best: Anchor = 'top'
  let bestDistance = Infinity
  for (const anchor of ANCHORS) {
    const a = anchorPoint(el, anchor)
    const d = Math.hypot(a.x - p.x, a.y - p.y)
    if (d < bestDistance) {
      best = anchor
      bestDistance = d
    }
  }
  return best
}

/**
 * The binding a line end dropped at `p` should snap to: the nearest anchor of
 * the topmost bindable element whose bounds (grown by `threshold`) contain `p`.
 */
export function findBindingTarget(
  elements: readonly DiagramElement[],
  p: Point,
  options: { threshold: number; excludeIds?: readonly ElementId[] },
): Binding | null {
  const excluded = new Set(options.excludeIds)
  for (let i = elements.length - 1; i >= 0; i--) {
    const el = elements[i]!
    if (excluded.has(el.id) || !isBindableElement(el)) continue
    if (containsPoint(el, p, options.threshold)) {
      return { elementId: el.id, anchor: nearestAnchor(el, p) }
    }
  }
  return null
}

const samePoint = (a: Point, b: Point) => a.x === b.x && a.y === b.y

/**
 * Moves the bound ends of every line/arrow onto their anchors and drops
 * bindings whose target no longer exists. Returns the same array (by
 * reference) when nothing changed, so callers can cheaply detect changes.
 */
export function syncBindings(elements: readonly DiagramElement[]): readonly DiagramElement[] {
  const byId = new Map<ElementId, BindableElement>()
  for (const el of elements) if (isBindableElement(el)) byId.set(el.id, el)

  let changed = false
  const next = elements.map((el) => {
    if (!isLinearElement(el) || (!el.startBinding && !el.endBinding)) return el
    const synced = syncLinear(el, byId)
    if (synced !== el) changed = true
    return synced
  })
  return changed ? next : elements
}

function syncLinear(el: LinearElement, targets: ReadonlyMap<ElementId, BindableElement>): LinearElement {
  const points = absolutePoints(el)
  const last = points.length - 1
  let { startBinding, endBinding } = el
  let moved = false

  const resolve = (binding: Binding | null, index: number): Binding | null => {
    if (!binding) return null
    const target = targets.get(binding.elementId)
    if (!target) return null
    const anchor = anchorPoint(target, binding.anchor)
    if (!samePoint(points[index]!, anchor)) {
      points[index] = anchor
      moved = true
    }
    return binding
  }

  startBinding = resolve(startBinding, 0)
  endBinding = resolve(endBinding, last)

  if (!moved && startBinding === el.startBinding && endBinding === el.endBinding) return el
  return { ...withAbsolutePoints(el, points), startBinding, endBinding }
}

/** Drops the bindings of `el` whose targets are not in `keep`. */
export function detachBindings(el: DiagramElement, keep: ReadonlySet<ElementId>): DiagramElement {
  if (!isLinearElement(el)) return el
  const startBinding = el.startBinding && keep.has(el.startBinding.elementId) ? el.startBinding : null
  const endBinding = el.endBinding && keep.has(el.endBinding.elementId) ? el.endBinding : null
  if (startBinding === el.startBinding && endBinding === el.endBinding) return el
  return { ...el, startBinding, endBinding }
}

/** Sets one end of a line/arrow to `point`, optionally bound to an anchor. */
export function moveLinearEnd(
  el: LinearElement,
  end: 'start' | 'end',
  point: Point,
  binding: Binding | null,
): LinearElement {
  const points = absolutePoints(el)
  points[end === 'start' ? 0 : points.length - 1] = point
  const moved = withAbsolutePoints(el, points)
  return end === 'start' ? { ...moved, startBinding: binding } : { ...moved, endBinding: binding }
}
