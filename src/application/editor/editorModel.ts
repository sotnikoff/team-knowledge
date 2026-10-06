import { syncBindings } from '@/domain/element/binding'
import { cloneElements } from '@/domain/element/clone'
import { elementBounds } from '@/domain/element/geometry'
import { arrowStyleOf, setCurved, withArrowStyle, type ArrowStyle } from '@/domain/element/linear'
import { reorderElements, type LayerMove } from '@/domain/element/order'
import type { TechKind } from '@/domain/element/tech'
import { isLinearElement } from '@/domain/element/types'
import type { Binding, DiagramElement, ElementId, ElementStyle } from '@/domain/element/types'
import { TRANSPARENT } from '@/domain/element/types'
import { unionBounds, type Bounds, type Point } from '@/domain/shared/geometry'
import * as history from './history'
import { updateElements } from './scene'
import { initialViewport, type Viewport } from './viewport'

export type ToolType =
  | 'select'
  | 'hand'
  | 'tech'
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
  /** Component placed by the 'tech' tool (database, service…). */
  readonly techKind: TechKind
  /** Style applied to newly drawn elements. */
  readonly style: ElementStyle
  /** Heads of newly drawn arrows (and the head shown for a line without heads). */
  readonly arrowStyle: ArrowStyle
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
  fillStyle: 'hachure',
  strokeWidth: 2,
  roughness: 1,
}

export const defaultArrowStyle: ArrowStyle = { sides: 'end', head: 'arrow' }

export function createEditorModel(elements: readonly DiagramElement[]): EditorModel {
  return {
    elements: syncBindings(elements),
    selectedIds: [],
    tool: 'select',
    techKind: 'service',
    style: defaultStyle,
    arrowStyle: defaultArrowStyle,
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

/** Picks a component from the palette and arms the 'tech' tool with it. */
export function chooseTechKind(m: EditorModel, kind: TechKind): EditorModel {
  return { ...setTool(m, 'tech'), techKind: kind }
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

/** Changes the stacking order of the selection (one undo step; no-op if nothing moves). */
export function reorderSelected(m: EditorModel, move: LayerMove): EditorModel {
  return commit(m, reorderElements(m.elements, m.selectedIds, move))
}

/**
 * Changes where the heads of the selected lines/arrows are and what they look
 * like (one undo step), and remembers it for new arrows.
 */
export function setArrowStyle(m: EditorModel, patch: Partial<ArrowStyle>): EditorModel {
  const selected = new Set(m.selectedIds)
  const elements = m.elements.map((el) =>
    selected.has(el.id) && isLinearElement(el)
      ? withArrowStyle(el, { ...arrowStyleOf(el, m.arrowStyle.head), ...patch })
      : el,
  )
  const changed = elements.some((el, i) => el !== m.elements[i])
  const arrowStyle = { ...m.arrowStyle, ...patch }
  return { ...(changed ? commit(m, elements) : m), arrowStyle }
}

/** The selected elements, in stacking order (what gets copied to the clipboard). */
export function selectedElements(m: EditorModel): DiagramElement[] {
  const selected = new Set(m.selectedIds)
  return m.elements.filter((el) => selected.has(el.id))
}

/**
 * Adds copies of `elements` on top, centred on `at` (the mouse), selected, as
 * one undo step. Copies get new ids from `newId`; see `cloneElements`.
 */
export function pasteElements(
  m: EditorModel,
  elements: readonly DiagramElement[],
  at: Point,
  newId: () => ElementId,
): EditorModel {
  const bounds = unionBounds(elements.map(elementBounds))
  if (!bounds) return m
  const offset = { x: at.x - (bounds.x + bounds.width / 2), y: at.y - (bounds.y + bounds.height / 2) }
  const copies = cloneElements(elements, newId, offset)
  return {
    ...commit(m, [...m.elements, ...copies]),
    tool: 'select',
    selectedIds: copies.map((el) => el.id),
    editingTextId: null,
  }
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
