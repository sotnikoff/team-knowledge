import { detachBindings } from '@/domain/element/binding'
import { elementBounds, hitTestElement, isPointInsideShape, translateElement } from '@/domain/element/geometry'
import { isShapeElement, type DiagramElement, type ElementId, type ShapeElement } from '@/domain/element/types'
import { containsBounds, unionBounds, type Bounds, type Point } from '@/domain/shared/geometry'

type Elements = readonly DiagramElement[]

/** Later elements are drawn on top, so they win the hit test. */
export function topmostElementAt(elements: Elements, p: Point, tolerance: number): DiagramElement | null {
  for (let i = elements.length - 1; i >= 0; i--) {
    const el = elements[i]!
    if (hitTestElement(el, p, tolerance)) return el
  }
  return null
}

export function elementsInside(elements: Elements, area: Bounds): DiagramElement[] {
  return elements.filter((el) => containsBounds(area, elementBounds(el)))
}

export function selectionBounds(elements: Elements, ids: readonly ElementId[]): Bounds | null {
  const set = new Set(ids)
  return unionBounds(elements.filter((el) => set.has(el.id)).map(elementBounds))
}

export function updateElements(
  elements: Elements,
  ids: readonly ElementId[],
  update: (el: DiagramElement) => DiagramElement,
): DiagramElement[] {
  const set = new Set(ids)
  return elements.map((el) => (set.has(el.id) ? update(el) : el))
}

/**
 * Moves the given elements. A line/arrow moved without its target lets go of
 * it (otherwise binding sync would pull it straight back).
 */
export function translateElements(elements: Elements, ids: readonly ElementId[], dx: number, dy: number) {
  const moving = new Set(ids)
  return updateElements(elements, ids, (el) => detachBindings(translateElement(el, dx, dy), moving))
}

/** Topmost shape whose interior contains `p` (for editing its label). */
export function shapeAt(elements: Elements, p: Point): ShapeElement | null {
  for (let i = elements.length - 1; i >= 0; i--) {
    const el = elements[i]!
    if (isShapeElement(el) && isPointInsideShape(el, p)) return el
  }
  return null
}

export function findElement(elements: Elements, id: ElementId | null): DiagramElement | null {
  if (id === null) return null
  return elements.find((el) => el.id === id) ?? null
}
