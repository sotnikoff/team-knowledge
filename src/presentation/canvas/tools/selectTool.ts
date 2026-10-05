import * as editor from '@/application/editor/editorModel'
import {
  elementsInside,
  findElement,
  selectionBounds,
  topmostElementAt,
  translateElements,
  updateElements,
} from '@/application/editor/scene'
import { moveLinearEnd } from '@/domain/element/binding'
import { insertBend, moveLinePoint } from '@/domain/element/linear'
import { elementBounds, resizeBounds, resizeElement } from '@/domain/element/geometry'
import { isLinearElement, type ElementId, type LinearElement } from '@/domain/element/types'
import { boundsFromPoints, containsPoint, type Point } from '@/domain/shared/geometry'
import { dispatch, getModel } from '../../editor/store'
import { handleAt, handleCursor, HIT_TOLERANCE, lineHandleAt } from '../selection'
import { hintFor, snapLineEnd } from './snapping'
import type { Tool, ToolSession } from './types'

const updateLine = (id: ElementId, update: (el: LinearElement) => LinearElement) =>
  dispatch((m) =>
    editor.updateLive(m, updateElements(m.elements, [id], (el) => (isLinearElement(el) ? update(el) : el))),
  )

/**
 * Drags a point of a selected line/arrow. Ends (re)bind to the shape they land
 * on; bends move freely. Dragging a segment midpoint pulls out a new bend —
 * only once the pointer actually moves, so a plain click changes nothing.
 */
function startLineHandleDrag(el: LinearElement, world: Point): ToolSession | null {
  const handle = lineHandleAt(el, world, getModel().viewport.zoom)
  if (!handle) return null
  dispatch(editor.beginInteraction)
  let index = handle.kind === 'point' ? handle.index : -1
  return {
    move: ({ world: p, altKey }) => {
      if (index === -1) {
        index = handle.index + 1
        updateLine(el.id, (line) => insertBend(line, index, p))
      }
      const line = findElement(getModel().elements, el.id)
      if (!line || !isLinearElement(line)) return
      const last = line.points.length - 1
      if (index !== 0 && index !== last) {
        updateLine(el.id, (current) => moveLinePoint(current, index, p))
        return
      }
      const snapped = snapLineEnd(p, altKey, [el.id])
      const end = index === 0 ? 'start' : 'end'
      updateLine(el.id, (current) => moveLinearEnd(current, end, snapped.point, snapped.binding))
      dispatch((m) => editor.setBindingHint(m, hintFor(snapped.binding)))
    },
    end: () => dispatch(editor.endInteraction),
  }
}

function startResize(id: ElementId, world: Point): ToolSession | null {
  const m = getModel()
  const original = findElement(m.elements, id)
  if (!original) return null
  if (isLinearElement(original)) return startLineHandleDrag(original, world)
  const handle = handleAt(elementBounds(original), world, m.viewport.zoom)
  if (!handle) return null
  dispatch(editor.beginInteraction)
  return {
    move: ({ world: p }) => {
      const target = resizeBounds(elementBounds(original), handle, p)
      dispatch((m) =>
        editor.updateLive(m, updateElements(m.elements, [id], () => resizeElement(original, target))),
      )
    },
    end: () => dispatch(editor.endInteraction),
  }
}

function startMove(ids: readonly ElementId[], start: Point): ToolSession {
  dispatch(editor.beginInteraction)
  const base = getModel().elements
  return {
    move: ({ world }) => {
      dispatch((m) => editor.updateLive(m, translateElements(base, ids, world.x - start.x, world.y - start.y)))
    },
    end: () => dispatch(editor.endInteraction),
  }
}

function startMarquee(start: Point, additive: boolean): ToolSession {
  const initial = additive ? getModel().selectedIds : []
  dispatch((m) => editor.select(m, initial))
  return {
    move: ({ world }) => {
      const area = boundsFromPoints(start, world)
      dispatch((m) => {
        const inside = elementsInside(m.elements, area).map((el) => el.id)
        return editor.setMarquee(editor.select(m, [...new Set([...initial, ...inside])]), area)
      })
    },
    end: () => dispatch((m) => editor.setMarquee(m, null)),
  }
}

export const selectTool: Tool = {
  cursor: 'default',
  begin: ({ world, shiftKey }) => {
    const m = getModel()
    const tolerance = HIT_TOLERANCE / m.viewport.zoom

    if (m.selectedIds.length === 1) {
      const resize = startResize(m.selectedIds[0]!, world)
      if (resize) return resize
    }

    const hit = topmostElementAt(m.elements, world, tolerance)
    if (hit) {
      const isSelected = m.selectedIds.includes(hit.id)
      if (shiftKey) {
        const next = isSelected ? m.selectedIds.filter((id) => id !== hit.id) : [...m.selectedIds, hit.id]
        dispatch((s) => editor.select(s, next))
        return isSelected ? null : startMove(next, world)
      }
      const ids = isSelected ? m.selectedIds : [hit.id]
      dispatch((s) => editor.select(s, ids))
      return startMove(ids, world)
    }

    // Dragging inside the current selection frame moves it, even between shapes.
    const frame = selectionBounds(m.elements, m.selectedIds)
    if (!shiftKey && frame && containsPoint(frame, world, tolerance)) {
      return startMove(m.selectedIds, world)
    }

    return startMarquee(world, shiftKey)
  },
}

/** Cursor to show while hovering with the select tool. */
export function hoverCursor(world: Point): string {
  const m = getModel()
  if (m.selectedIds.length === 1) {
    const el = findElement(m.elements, m.selectedIds[0]!)
    if (el && isLinearElement(el)) {
      if (lineHandleAt(el, world, m.viewport.zoom)) return 'pointer'
    } else {
      const handle = el && handleAt(elementBounds(el), world, m.viewport.zoom)
      if (handle) return handleCursor[handle]
    }
  }
  return topmostElementAt(m.elements, world, HIT_TOLERANCE / m.viewport.zoom) ? 'move' : 'default'
}
