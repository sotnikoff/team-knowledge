import * as editor from '@/application/editor/editorModel'
import { findElement } from '@/application/editor/scene'
import type { ElementId } from '@/domain/element/types'
import { dispatch, getModel } from './store'

/** Opens the inline editor for a text element or a shape's label. */
export function startEditing(id: ElementId): void {
  dispatch(
    editor.beginInteraction,
    (s) => editor.select(s, [id]),
    (s) => editor.setEditingText(s, id),
  )
}

/**
 * Closes the inline text editor. Empty text is discarded; a text that did not
 * exist before the edit leaves no trace in the undo history.
 */
export function commitTextEdit(): void {
  const m = getModel()
  const el = findElement(m.elements, m.editingTextId)
  if (!el) {
    dispatch((s) => editor.setEditingText(s, null))
    return
  }
  if (el.type === 'text' && el.text.trim() === '') {
    const base = m.interactionBase
    const existedBefore = base?.some((e) => e.id === el.id) ?? true
    dispatch(
      (s) =>
        editor.updateLive(
          s,
          existedBefore || !base ? s.elements.filter((e) => e.id !== el.id) : base,
        ),
      (s) => editor.select(s, []),
    )
  }
  dispatch(editor.endInteraction, (s) => editor.setEditingText(s, null), (s) => editor.setTool(s, 'select'))
}
