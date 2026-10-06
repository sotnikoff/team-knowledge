import { useEffect } from 'react'
import * as editor from '@/application/editor/editorModel'
import type { ToolType } from '@/application/editor/editorModel'
import type { LayerMove } from '@/domain/element/order'
import { isLinearElement, isShapeElement } from '@/domain/element/types'
import { findElement } from '@/application/editor/scene'
import { dispatch, getModel } from './store'
import { startEditing } from './textEditing'
import { ZOOM_STEP, zoomBy } from './zoom'

/** Tools as they appear on the toolbar; the number row 1…9, 0 picks them in this order. */
export const TOOLBAR_ORDER: readonly ToolType[] = [
  'hand',
  'select',
  'rectangle',
  'diamond',
  'ellipse',
  'arrow',
  'line',
  'freedraw',
  'text',
  'tech',
]

/** Number-row keys (not the numpad: its codes are `Numpad1`…), in toolbar order. */
const NUMBER_ROW = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0']

const LETTERS: Record<ToolType, string> = {
  hand: 'H',
  select: 'V',
  rectangle: 'R',
  diamond: 'D',
  ellipse: 'O',
  arrow: 'A',
  line: 'L',
  freedraw: 'P',
  text: 'T',
  tech: 'K',
}

/** Tooltip hint ("R or 3") and corner badge ("3") of a tool button; `or` is the localized word. */
export function toolHint(tool: ToolType, or: string): { hint: string; badge: string | undefined } {
  const letter = LETTERS[tool]
  const digit = NUMBER_ROW[TOOLBAR_ORDER.indexOf(tool)]
  return { hint: digit ? `${letter} ${or} ${digit}` : letter, badge: digit }
}

/** Keyed by `KeyboardEvent.code`, so shortcuts work with any keyboard layout. */
export const toolShortcuts: Record<string, ToolType> = Object.fromEntries([
  ...Object.entries(LETTERS).map(([tool, letter]) => [`Key${letter}`, tool]),
  ...TOOLBAR_ORDER.slice(0, NUMBER_ROW.length).map((tool, i) => [`Digit${NUMBER_ROW[i]}`, tool]),
])

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
      } else if (!mod && (code === 'Minus' || code === 'Equal')) {
        // Number-row − / = (the + is on the same key); Ctrl/⌘ ± stays the browser's page zoom.
        e.preventDefault()
        zoomBy(code === 'Equal' ? ZOOM_STEP : 1 / ZOOM_STEP)
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
