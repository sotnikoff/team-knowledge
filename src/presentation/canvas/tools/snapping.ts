import type { BindingHint } from '@/application/editor/editorModel'
import { findElement } from '@/application/editor/scene'
import { anchorPoint, findBindingTarget } from '@/domain/element/binding'
import type { Binding, ElementId } from '@/domain/element/types'
import type { Point } from '@/domain/shared/geometry'
import { getModel } from '../../editor/store'

/** How close (screen px) to a shape a line end must be to snap onto it. */
export const BINDING_THRESHOLD = 16

export interface SnappedEnd {
  readonly point: Point
  readonly binding: Binding | null
}

/** Snaps a line end to the nearest side midpoint of a shape under the pointer. */
export function snapLineEnd(world: Point, disabled: boolean, excludeIds: readonly ElementId[] = []): SnappedEnd {
  if (disabled) return { point: world, binding: null }
  const m = getModel()
  const binding = findBindingTarget(m.elements, world, {
    threshold: BINDING_THRESHOLD / m.viewport.zoom,
    excludeIds,
  })
  const target = binding && findElement(m.elements, binding.elementId)
  if (!binding || !target) return { point: world, binding: null }
  return { point: anchorPoint(target, binding.anchor), binding }
}

export function hintFor(binding: Binding | null): BindingHint | null {
  return binding ? { elementId: binding.elementId, active: binding } : null
}
