import { elementBounds } from './geometry'
import type { DiagramElement, ElementId } from './types'
import type { Bounds } from '../shared/geometry'

/** Z-order moves; later elements in the list are drawn on top. */
export const LAYER_MOVES = ['front', 'forward', 'backward', 'back'] as const
export type LayerMove = (typeof LAYER_MOVES)[number]

type Elements = readonly DiagramElement[]

const overlaps = (a: Bounds, b: Bounds) =>
  a.x <= b.x + b.width && b.x <= a.x + a.width && a.y <= b.y + b.height && b.y <= a.y + a.height

/**
 * Moves the selected elements in the stacking order, keeping their relative order.
 * One step forward/backward jumps over the nearest element that actually overlaps
 * the selection, so every step changes what is visible. Returns the same array
 * when nothing moves.
 */
export function reorderElements(elements: Elements, ids: readonly ElementId[], move: LayerMove): Elements {
  const selected = new Set(ids)
  const isSelected = (el: DiagramElement) => selected.has(el.id)
  if (!elements.some(isSelected)) return elements

  const result = (() => {
    switch (move) {
      case 'front':
        return [...elements.filter((el) => !isSelected(el)), ...elements.filter(isSelected)]
      case 'back':
        return [...elements.filter(isSelected), ...elements.filter((el) => !isSelected(el))]
      case 'forward':
        return stepForward(elements, isSelected)
      case 'backward':
        return [...stepForward([...elements].reverse(), isSelected)].reverse()
    }
  })()
  return result.every((el, i) => el === elements[i]) ? elements : result
}

/** Puts the selected elements below the nearest overlapping one right above it. */
function stepForward(elements: Elements, isSelected: (el: DiagramElement) => boolean): Elements {
  const lowest = elements.findIndex(isSelected)
  const boxes = elements.filter(isSelected).map(elementBounds)
  const target = elements.findIndex(
    (el, i) => i > lowest && !isSelected(el) && boxes.some((b) => overlaps(b, elementBounds(el))),
  )
  if (target < 0) return elements
  // Selected elements below the target move just above it; those already higher stay.
  const moving = elements.slice(0, target).filter(isSelected)
  const rest = elements.filter((el, i) => !(i < target && isSelected(el)))
  const at = rest.indexOf(elements[target]!) + 1
  return [...rest.slice(0, at), ...moving, ...rest.slice(at)]
}
