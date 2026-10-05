import * as editor from '@/application/editor/editorModel'
import { findElement, updateElements } from '@/application/editor/scene'
import { worldToScreen } from '@/application/editor/viewport'
import { labelBox } from '@/domain/element/geometry'
import { isShapeElement, type ShapeElement, type TextElement } from '@/domain/element/types'
import type { KeyboardEvent } from 'react'
import { dispatch, useEditor } from '../editor/store'
import { commitTextEdit } from '../editor/textEditing'
import { fontFor, LABEL_FONT_SIZE, LINE_HEIGHT, measureText, wrapText } from './text'

/** Inline editor for a free text element or for a shape's label. */
export function TextEditor() {
  const element = useEditor((m) => findElement(m.elements, m.editingTextId))
  if (!element) return null
  if (element.type === 'text') return <FreeTextArea key={element.id} element={element} />
  if (isShapeElement(element)) return <LabelTextArea key={element.id} element={element} />
  return null
}

const baseClass = 'board-ink absolute resize-none overflow-hidden border-0 bg-transparent p-0 outline-none'

const finishOnEscape = (e: KeyboardEvent) => {
  if (e.key === 'Escape') commitTextEdit()
}

function FreeTextArea({ element }: { element: TextElement }) {
  const viewport = useEditor((m) => m.viewport)
  const position = worldToScreen(viewport, element)
  const fontSize = element.fontSize * viewport.zoom

  const onChange = (text: string) => {
    const size = measureText(text, element.fontSize)
    dispatch((m) =>
      editor.updateLive(
        m,
        updateElements(m.elements, [element.id], (el) => (el.type === 'text' ? { ...el, text, ...size } : el)),
      ),
    )
  }

  return (
    <textarea
      autoFocus
      value={element.text}
      onChange={(e) => onChange(e.target.value)}
      onBlur={commitTextEdit}
      onKeyDown={finishOnEscape}
      spellCheck={false}
      wrap="off"
      className={`${baseClass} whitespace-pre`}
      style={{
        left: position.x,
        top: position.y,
        font: fontFor(fontSize),
        lineHeight: LINE_HEIGHT,
        color: element.style.strokeColor,
        width: Math.max(element.width * viewport.zoom + fontSize, fontSize),
        height: Math.max(element.height * viewport.zoom, fontSize * LINE_HEIGHT),
      }}
    />
  )
}

function LabelTextArea({ element }: { element: ShapeElement }) {
  const viewport = useEditor((m) => m.viewport)
  const box = labelBox(element)
  const lines = wrapText(element.label, LABEL_FONT_SIZE, box.width).length
  const height = lines * LABEL_FONT_SIZE * LINE_HEIGHT
  const topLeft = worldToScreen(viewport, { x: box.x, y: element.y + element.height / 2 - height / 2 })

  const onChange = (label: string) =>
    dispatch((m) =>
      editor.updateLive(
        m,
        updateElements(m.elements, [element.id], (el) => (isShapeElement(el) ? { ...el, label } : el)),
      ),
    )

  return (
    <textarea
      autoFocus
      value={element.label}
      onChange={(e) => onChange(e.target.value)}
      onBlur={commitTextEdit}
      onKeyDown={finishOnEscape}
      onFocus={(e) => e.currentTarget.setSelectionRange(element.label.length, element.label.length)}
      spellCheck={false}
      className={`${baseClass} text-center whitespace-pre-wrap`}
      style={{
        left: topLeft.x,
        top: topLeft.y,
        width: Math.max(box.width, LABEL_FONT_SIZE) * viewport.zoom,
        height: height * viewport.zoom,
        font: fontFor(LABEL_FONT_SIZE * viewport.zoom),
        lineHeight: LINE_HEIGHT,
        color: element.style.strokeColor,
      }}
    />
  )
}
