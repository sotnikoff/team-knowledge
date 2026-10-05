import { syncBindings } from '@/domain/element/binding'
import { setCurved } from '@/domain/element/linear'
import { isLinearElement } from '@/domain/element/types'
import type { Binding, DiagramElement, ElementId, ElementStyle } from '@/domain/element/types'
import { TRANSPARENT } from '@/domain/element/types'
import type { Bounds } from '@/domain/shared/geometry'
import * as history from './history'
import { updateElements } from './scene'
import { initialViewport, type Viewport } from './viewport'

export type ToolType =
  | 'select'
  | 'hand'
  | 'rectangle'
  | 'diamond'
  | 'ellipse'
  | 'arrow'
  | 'line'
  | 'freedraw'
  | 'text'

/**
 * Complete, framework-free state of the editor. Every transition below is a
 * pure function; the presentation layer only wraps them in a store.
 */
export interface EditorModel {
  readonly elements: readonly DiagramElement[]
  readonly selectedIds: readonly ElementId[]
  readonly tool: ToolType
  /** Style applied to newly drawn elements. */
  readonly style: ElementStyle
  readonly viewport: Viewport
  readonly history: history.History
  /** Elements as they were when the current pointer interaction started. */
  readonly interactionBase: readonly DiagramElement[] | null
  readonly marquee: Bounds | null
  /** Text element or shape label being edited inline. */
  readonly editingTextId: ElementId | null
  /** Element whose anchors are shown while drawing/dragging a line end. */
  readonly bindingHint: BindingHint | null
}

export interface BindingHint {
  readonly elementId: ElementId
  /** The anchor the line end currently snaps to, if any. */
  readonly active: Binding | null
}

export const defaultStyle: ElementStyle = {
  strokeColor: '#1e1e1e',
  fillColor: TRANSPARENT,
  strokeWidth: 2,
  roughness: 1,
}

export function createEditorModel(elements: readonly DiagramElement[]): EditorModel {
  return {
    elements: syncBindings(elements),
    selectedIds: [],
    tool: 'select',
    style: defaultStyle,
    viewport: initialViewport,
    history: history.emptyHistory,
    interactionBase: null,
    marquee: null,
    editingTextId: null,
    bindingHint: null,
  }
}

export function setTool(m: EditorModel, tool: ToolType): EditorModel {
  return { ...m, tool, selectedIds: tool === 'select' ? m.selectedIds : [], bindingHint: null }
}

export function select(m: EditorModel, ids: readonly ElementId[]): EditorModel {
  return { ...m, selectedIds: ids }
}

export function selectAll(m: EditorModel): EditorModel {
  return { ...m, tool: 'select', selectedIds: m.elements.map((el) => el.id) }
}

export function setViewport(m: EditorModel, viewport: Viewport): EditorModel {
  return { ...m, viewport }
}

export function setMarquee(m: EditorModel, marquee: Bounds | null): EditorModel {
  return { ...m, marquee }
}

export function setEditingText(m: EditorModel, id: ElementId | null): EditorModel {
  return { ...m, editingTextId: id }
}

export function setBindingHint(m: EditorModel, hint: BindingHint | null): EditorModel {
  const current = m.bindingHint
  const same =
    current === hint ||
    (current !== null &&
      hint !== null &&
      current.elementId === hint.elementId &&
      current.active?.elementId === hint.active?.elementId &&
      current.active?.anchor === hint.active?.anchor)
  return same ? m : { ...m, bindingHint: hint }
}

/** Starts a continuous change (drag, draw, resize) that becomes one undo step. */
export function beginInteraction(m: EditorModel): EditorModel {
  return m.interactionBase ? m : { ...m, interactionBase: m.elements }
}

/**
 * Updates elements during an interaction without touching history. Bound
 * lines/arrows follow their targets here, so every change keeps them glued.
 */
export function updateLive(m: EditorModel, elements: readonly DiagramElement[]): EditorModel {
  return { ...m, elements: syncBindings(elements) }
}

export function endInteraction(m: EditorModel): EditorModel {
  const base = m.interactionBase
  const changed = base !== null && base !== m.elements
  return {
    ...m,
    interactionBase: null,
    marquee: null,
    bindingHint: null,
    history: changed ? history.record(m.history, base) : m.history,
  }
}

/** A discrete change that is immediately one undo step. */
export function commit(m: EditorModel, elements: readonly DiagramElement[]): EditorModel {
  if (elements === m.elements) return m
  return { ...m, elements: syncBindings(elements), history: history.record(m.history, m.elements) }
}

export function deleteSelected(m: EditorModel): EditorModel {
  if (m.selectedIds.length === 0) return m
  const ids = new Set(m.selectedIds)
  return { ...commit(m, m.elements.filter((el) => !ids.has(el.id))), selectedIds: [] }
}

export function applyStyle(m: EditorModel, patch: Partial<ElementStyle>): EditorModel {
  const style = { ...m.style, ...patch }
  if (m.selectedIds.length === 0) return { ...m, style }
  const elements = updateElements(m.elements, m.selectedIds, (el) => ({
    ...el,
    style: { ...el.style, ...patch },
  }))
  return { ...commit(m, elements), style }
}

/** Makes the selected lines/arrows smooth curves or broken lines (one undo step). */
export function setLinesCurved(m: EditorModel, curved: boolean): EditorModel {
  const selected = new Set(m.selectedIds)
  let changed = false
  const elements = m.elements.map((el) => {
    if (!selected.has(el.id) || !isLinearElement(el) || el.curved === curved) return el
    changed = true
    return setCurved(el, curved)
  })
  return changed ? commit(m, elements) : m
}

function keepExistingSelection(m: EditorModel): EditorModel {
  const ids = new Set(m.elements.map((el) => el.id))
  return { ...m, selectedIds: m.selectedIds.filter((id) => ids.has(id)) }
}

export function undo(m: EditorModel): EditorModel {
  if (m.interactionBase) return m
  const result = history.undo(m.history, m.elements)
  return result ? keepExistingSelection({ ...m, ...result }) : m
}

export function redo(m: EditorModel): EditorModel {
  if (m.interactionBase) return m
  const result = history.redo(m.history, m.elements)
  return result ? keepExistingSelection({ ...m, ...result }) : m
}

export const canUndo = (m: EditorModel) => m.history.past.length > 0
export const canRedo = (m: EditorModel) => m.history.future.length > 0
