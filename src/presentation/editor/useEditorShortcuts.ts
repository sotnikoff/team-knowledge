import { useEffect } from 'react'
import * as editor from '@/application/editor/editorModel'
import type { ToolType } from '@/application/editor/editorModel'
import type { LayerMove } from '@/domain/element/order'
import { isLinearElement, isShapeElement } from '@/domain/element/types'
import { findElement } from '@/application/editor/scene'
import { dispatch, getModel } from './store'
import { startEditing } from './textEditing'

/** Keyed by `KeyboardEvent.code`, so shortcuts work with any keyboard layout. */
export const toolShortcuts: Record<string, ToolType> = {
  KeyV: 'select',
  Digit1: 'select',
  KeyR: 'rectangle',
  Digit2: 'rectangle',
  KeyD: 'diamond',
  Digit3: 'diamond',
  KeyO: 'ellipse',
  Digit4: 'ellipse',
  KeyA: 'arrow',
  Digit5: 'arrow',
  KeyL: 'line',
  Digit6: 'line',
  KeyP: 'freedraw',
  Digit7: 'freedraw',
  KeyT: 'text',
  Digit8: 'text',
  KeyH: 'hand',
  KeyK: 'tech',
  Digit9: 'tech',
}

/** Ctrl/⌘ + ] / [ moves one layer; with Shift, all the way (as in Excalidraw and Figma). */
function layerMoveFor(code: string, shiftKey: boolean): LayerMove | null {
  if (code === 'BracketRight') return shiftKey ? 'front' : 'forward'
  if (code === 'BracketLeft') return shiftKey ? 'back' : 'backward'
  return null
}

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

/** Human-readable shortcut for a layer move, for tooltips. */
export function layerShortcutLabel(move: LayerMove): string {
  const mod = isMac ? '⌘' : 'Ctrl+'
  const shift = isMac ? '⇧' : 'Shift+'
  const keys: Record<LayerMove, string> = { front: `${shift}]`, forward: ']', backward: '[', back: `${shift}[` }
  return mod + keys[move]
}

function isTyping(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
  )
}

export function useEditorShortcuts(options: { onOpenDocument: (documentId: string) => void }): void {
  const { onOpenDocument } = options
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return
      const mod = e.metaKey || e.ctrlKey
      const key = e.key.toLowerCase()
      const code = e.code
      const layerMove = mod ? layerMoveFor(code, e.shiftKey) : null

      if (mod && code === 'KeyZ') {
        e.preventDefault()
        dispatch(e.shiftKey ? editor.redo : editor.undo)
      } else if (mod && code === 'KeyY') {
        e.preventDefault()
        dispatch(editor.redo)
      } else if (layerMove) {
        e.preventDefault()
        dispatch((m) => editor.reorderSelected(m, layerMove))
      } else if (mod && code === 'KeyA') {
        e.preventDefault()
        dispatch(editor.selectAll)
      } else if (key === 'delete' || key === 'backspace') {
        e.preventDefault()
        dispatch(editor.deleteSelected)
      } else if (key === 'enter') {
        // Enter on a selected shape/text starts typing into it.
        const m = getModel()
        const el = m.selectedIds.length === 1 ? findElement(m.elements, m.selectedIds[0]!) : null
        if (el?.type === 'document') {
          e.preventDefault()
          onOpenDocument(el.documentId)
        } else if (el && (isShapeElement(el) || isLinearElement(el) || el.type === 'text')) {
          e.preventDefault()
          startEditing(el.id)
        }
      } else if (key === 'escape') {
        dispatch((m) => editor.select(editor.setTool(m, 'select'), []))
      } else if (!mod && !e.altKey && toolShortcuts[code]) {
        const tool = toolShortcuts[code]
        dispatch((m) => editor.setTool(m, tool))
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onOpenDocument])
}
