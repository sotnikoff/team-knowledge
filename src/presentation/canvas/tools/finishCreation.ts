import * as editor from '@/application/editor/editorModel'
import { findElement, topmostElementAt } from '@/application/editor/scene'
import type { DiagramElement, ElementId } from '@/domain/element/types'
import type { Point } from '@/domain/shared/geometry'
import { dispatch, getModel } from '../../editor/store'
import { HIT_TOLERANCE } from '../selection'

/**
 * Ends a drawing gesture: keeps the element if it is big enough (and switches
 * back to the selection tool), otherwise discards it without an undo step.
 *
 * A gesture that drew nothing is a click: if it landed on an existing element,
 * that element gets selected (and the selection tool activated), so anything —
 * a pencil stroke above all — can be picked to move or delete without
 * switching tools first.
 */
export function finishCreation(
  id: ElementId,
  isUseful: (el: DiagramElement) => boolean,
  options: { keepTool?: boolean; clickedAt?: Point } = {},
): void {
  const el = findElement(getModel().elements, id)
  if (!el || !isUseful(el)) {
    const base = getModel().interactionBase ?? getModel().elements
    const zoom = getModel().viewport.zoom
    const hit = options.clickedAt ? topmostElementAt(base, options.clickedAt, HIT_TOLERANCE / zoom) : null
    dispatch(
      (m) => editor.updateLive(m, base),
      editor.endInteraction,
      (m) => (hit ? editor.select(editor.setTool(m, 'select'), [hit.id]) : editor.select(m, [])),
    )
    return
  }
  dispatch(editor.endInteraction, (m) => (options.keepTool ? editor.select(m, []) : editor.setTool(m, 'select')))
}
