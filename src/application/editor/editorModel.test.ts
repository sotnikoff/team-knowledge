import { describe, expect, it } from 'vitest'
import { anchorPoint, BINDING_GAP } from '@/domain/element/binding'
import { absolutePoints, createLinear } from '@/domain/element/factory'
import { isLinearElement, type DiagramElement } from '@/domain/element/types'
import * as editor from './editorModel'
import { translateElements } from './scene'

const el = (id: string, x = 0): DiagramElement => ({
  id,
  type: 'rectangle',
  label: '',
  x,
  y: 0,
  width: 10,
  height: 10,
  seed: 1,
  style: editor.defaultStyle,
})

describe('editorModel', () => {
  it('turns a whole interaction into a single undo step', () => {
    let m = editor.createEditorModel([el('a')])
    m = editor.beginInteraction(m)
    m = editor.updateLive(m, [el('a', 5)])
    m = editor.updateLive(m, [el('a', 10)])
    m = editor.endInteraction(m)
    expect(m.history.past).toHaveLength(1)

    m = editor.undo(m)
    expect(m.elements[0]?.x).toBe(0)
    m = editor.redo(m)
    expect(m.elements[0]?.x).toBe(10)
  })

  it('reorders the selection as one undo step and ignores moves that change nothing', () => {
    let m = editor.select(editor.createEditorModel([el('a'), el('b')]), ['a'])
    m = editor.reorderSelected(m, 'front')
    expect(m.elements.map((e) => e.id)).toEqual(['b', 'a'])
    expect(editor.reorderSelected(m, 'forward')).toBe(m)
    m = editor.undo(m)
    expect(m.elements.map((e) => e.id)).toEqual(['a', 'b'])
  })

  it('sets the heads of the selected lines as one undo step and remembers them for new arrows', () => {
    const line = createLinear({ id: 'l', type: 'line', seed: 1, style: editor.defaultStyle, origin: { x: 0, y: 0 } })
    let m = editor.select(editor.createEditorModel([el('a'), line]), ['a', 'l'])
    m = editor.setArrowStyle(m, { sides: 'both' })
    expect(m.elements[1]).toMatchObject({ startArrowhead: 'arrow', endArrowhead: 'arrow' })
    m = editor.setArrowStyle(m, { head: 'dot' })
    expect(m.elements[1]).toMatchObject({ startArrowhead: 'dot', endArrowhead: 'dot' })
    expect(m.arrowStyle).toEqual({ sides: 'both', head: 'dot' })
    expect(m.history.past).toHaveLength(2)
    m = editor.undo(m)
    expect(m.elements[1]).toMatchObject({ startArrowhead: 'arrow', endArrowhead: 'arrow' })
  })

  it('does not record an interaction that changed nothing', () => {
    let m = editor.createEditorModel([el('a')])
    m = editor.endInteraction(editor.beginInteraction(m))
    expect(editor.canUndo(m)).toBe(false)
  })

  it('deletes the selection and restores it on undo', () => {
    let m = editor.select(editor.createEditorModel([el('a'), el('b')]), ['a'])
    m = editor.deleteSelected(m)
    expect(m.elements.map((e) => e.id)).toEqual(['b'])
    m = editor.undo(m)
    expect(m.elements.map((e) => e.id)).toEqual(['a', 'b'])
  })

  it('drops selected ids that no longer exist after undo', () => {
    let m = editor.createEditorModel([])
    m = editor.commit(m, [el('a')])
    m = editor.select(m, ['a'])
    m = editor.undo(m)
    expect(m.selectedIds).toEqual([])
  })

  it('applies style to the selection as one step', () => {
    let m = editor.select(editor.createEditorModel([el('a'), el('b')]), ['b'])
    m = editor.applyStyle(m, { strokeColor: '#f00' })
    expect(m.elements[1]?.style.strokeColor).toBe('#f00')
    expect(m.elements[0]?.style.strokeColor).toBe(editor.defaultStyle.strokeColor)
    expect(m.style.strokeColor).toBe('#f00')
    expect(editor.canUndo(m)).toBe(true)
  })

  it('a new commit clears the redo branch', () => {
    let m = editor.commit(editor.createEditorModel([]), [el('a')])
    m = editor.undo(m)
    m = editor.commit(m, [el('b')])
    expect(editor.canRedo(m)).toBe(false)
  })
})

describe('editorModel bindings', () => {
  const shape = (id: string, x: number): DiagramElement => ({ ...el(id, x), width: 100, height: 50 })
  const arrow = (): DiagramElement => {
    const base = createLinear({ id: 'arrow', type: 'arrow', seed: 1, style: editor.defaultStyle, origin: { x: 0, y: 0 } })
    return {
      ...base,
      startBinding: { elementId: 'a', anchor: 'right' },
      endBinding: { elementId: 'b', anchor: 'left' },
    }
  }
  const arrowStart = (m: editor.EditorModel) => {
    const found = m.elements.find((e) => e.id === 'arrow')
    return found && isLinearElement(found) ? absolutePoints(found)[0] : undefined
  }

  it('glues bound arrows to their targets on load', () => {
    const m = editor.createEditorModel([shape('a', 0), shape('b', 300), arrow()])
    expect(arrowStart(m)).toEqual(anchorPoint(shape('a', 0), 'right'))
  })

  it('drags bound arrows along when a shape moves', () => {
    let m = editor.createEditorModel([shape('a', 0), shape('b', 300), arrow()])
    m = editor.beginInteraction(m)
    m = editor.updateLive(m, translateElements(m.elements, ['a'], 0, 40))
    m = editor.endInteraction(m)
    expect(arrowStart(m)).toEqual({ x: 100 + BINDING_GAP, y: 25 + 40 })
    expect(m.history.past).toHaveLength(1)
  })

  it('unbinds an arrow moved on its own', () => {
    let m = editor.createEditorModel([shape('a', 0), shape('b', 300), arrow()])
    m = editor.updateLive(m, translateElements(m.elements, ['arrow'], 0, 100))
    const moved = m.elements.find((e) => e.id === 'arrow')
    expect(moved && isLinearElement(moved) ? [moved.startBinding, moved.endBinding] : null).toEqual([null, null])
  })

  it('unbinds arrows when their target is deleted', () => {
    let m = editor.select(editor.createEditorModel([shape('a', 0), shape('b', 300), arrow()]), ['b'])
    m = editor.deleteSelected(m)
    const left = m.elements.find((e) => e.id === 'arrow')
    expect(left && isLinearElement(left) ? left.endBinding : 'missing').toBeNull()
  })
})
