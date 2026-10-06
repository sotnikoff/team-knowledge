import type { Point } from '../shared/geometry'
import { translateElement } from './geometry'
import { isLinearElement, type Binding, type DiagramElement, type ElementId } from './types'

/**
 * Copies of `elements` (e.g. pasted from the clipboard) with fresh ids, moved
 * by `offset`. Bindings between the copied elements follow the copies; a
 * binding to anything that was not copied is dropped, so a pasted arrow never
 * stays glued to the original shape.
 */
export function cloneElements(
  elements: readonly DiagramElement[],
  newId: () => ElementId,
  offset: Point,
): DiagramElement[] {
  const ids = new Map(elements.map((el) => [el.id, newId()]))
  const rebind = (binding: Binding | null): Binding | null => {
    const elementId = binding && ids.get(binding.elementId)
    return binding && elementId ? { ...binding, elementId } : null
  }
  return elements.map((el) => {
    const moved = { ...translateElement(el, offset.x, offset.y), id: ids.get(el.id)! }
    return isLinearElement(moved)
      ? { ...moved, startBinding: rebind(moved.startBinding), endBinding: rebind(moved.endBinding) }
      : moved
  })
}
