import * as editor from '@/application/editor/editorModel'
import { findElement } from '@/application/editor/scene'
import type { DiagramElement, ElementId } from '@/domain/element/types'
import { dispatch, getModel } from '../../editor/store'

/**
 * Ends a drawing gesture: keeps the element if it is big enough (and switches
 * back to the selection tool), otherwise discards it without an undo step.
 */
export function finishCreation(
  id: ElementId,
  isUseful: (el: DiagramElement) => boolean,
  options: { keepTool?: boolean } = {},
): void {
  const el = findElement(getModel().elements, id)
  if (!el || !isUseful(el)) {
    dispatch(
      (m) => editor.updateLive(m, m.interactionBase ?? m.elements),
      (m) => editor.select(m, []),
      editor.endInteraction,
    )
    return
  }
  dispatch(editor.endInteraction, (m) => (options.keepTool ? editor.select(m, []) : editor.setTool(m, 'select')))
}
