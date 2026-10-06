import { describe, expect, it } from 'vitest'
import {
  anchorPoint,
  BINDING_GAP,
  detachBindings,
  findBindingTarget,
  moveLinearEnd,
  syncBindings,
} from './binding'
import { absolutePoints, createDocumentElement, createLinear } from './factory'
import { translateElement } from './geometry'
import { TRANSPARENT, type DiagramElement, type LinearElement, type ShapeElement } from './types'

const style = { strokeColor: '#000', fillColor: TRANSPARENT, fillStyle: 'hachure' as const, strokeWidth: 2, roughness: 1 }

const box = (id: string, x: number, y: number): ShapeElement => ({
  id,
  type: 'rectangle',
  label: '',
  x,
  y,
  width: 100,
  height: 50,
  seed: 1,
  style,
})

/** Arrow from the right side of `a` to the left side of `b`. */
function connect(a: ShapeElement, b: ShapeElement): LinearElement {
  const arrow = createLinear({ id: 'arrow', type: 'arrow', seed: 1, style, origin: anchorPoint(a, 'right') })
  const withStart = { ...arrow, startBinding: { elementId: a.id, anchor: 'right' as const } }
  return moveLinearEnd(withStart, 'end', anchorPoint(b, 'left'), { elementId: b.id, anchor: 'left' })
}

const findArrow = (elements: readonly DiagramElement[]) =>
  elements.find((el) => el.id === 'arrow') as LinearElement

describe('anchorPoint', () => {
  it('returns side midpoints pushed out by the gap', () => {
    const a = box('a', 0, 0)
    expect(anchorPoint(a, 'top')).toEqual({ x: 50, y: -BINDING_GAP })
    expect(anchorPoint(a, 'right')).toEqual({ x: 100 + BINDING_GAP, y: 25 })
    expect(anchorPoint(a, 'bottom')).toEqual({ x: 50, y: 50 + BINDING_GAP })
    expect(anchorPoint(a, 'left')).toEqual({ x: -BINDING_GAP, y: 25 })
  })
})

describe('findBindingTarget', () => {
  const a = box('a', 0, 0)

  it('snaps to the nearest side of the shape under the point', () => {
    expect(findBindingTarget([a], { x: 95, y: 30 }, { threshold: 10 })).toEqual({
      elementId: 'a',
      anchor: 'right',
    })
    expect(findBindingTarget([a], { x: 50, y: -8 }, { threshold: 10 })?.anchor).toBe('top')
  })

  it('ignores points far away and excluded elements', () => {
    expect(findBindingTarget([a], { x: 300, y: 300 }, { threshold: 10 })).toBeNull()
    expect(findBindingTarget([a], { x: 50, y: 25 }, { threshold: 10, excludeIds: ['a'] })).toBeNull()
  })

  it('does not bind to lines', () => {
    const line = createLinear({ id: 'l', type: 'line', seed: 1, style, origin: { x: 0, y: 0 } })
    expect(findBindingTarget([line], { x: 0, y: 0 }, { threshold: 10 })).toBeNull()
  })
})

describe('syncBindings', () => {
  const a = box('a', 0, 0)
  const b = box('b', 300, 200)

  it('returns the same array when everything is in place', () => {
    const elements = [a, b, connect(a, b)]
    expect(syncBindings(elements)).toBe(elements)
  })

  it('makes a bound arrow follow its moved target', () => {
    const elements = [a, translateElement(b, 50, -100), connect(a, b)]
    const arrow = findArrow(syncBindings(elements))
    const points = absolutePoints(arrow)
    expect(points[0]).toEqual(anchorPoint(a, 'right'))
    expect(points.at(-1)).toEqual(anchorPoint(translateElement(b, 50, -100), 'left'))
  })

  it('drops bindings to deleted elements and keeps the arrow where it was', () => {
    const arrow = connect(a, b)
    const synced = findArrow(syncBindings([a, arrow]))
    expect(synced.endBinding).toBeNull()
    expect(synced.startBinding).toEqual({ elementId: 'a', anchor: 'right' })
    expect(absolutePoints(synced)).toEqual(absolutePoints(arrow))
  })
})

describe('detachBindings', () => {
  it('keeps only bindings to elements in the given set', () => {
    const arrow = detachBindings(connect(box('a', 0, 0), box('b', 300, 0)), new Set(['a'])) as LinearElement
    expect(arrow.startBinding?.elementId).toBe('a')
    expect(arrow.endBinding).toBeNull()
  })
})

describe('binding to a document card', () => {
  it('snaps to the card and follows it when it grows', () => {
    const card = { ...createDocumentElement({ id: 'card', documentId: 'd1', seed: 1, style, x: 0, y: 0 }), height: 200 }
    const target = findBindingTarget([card], { x: 240, y: 205 }, { threshold: 10 })
    expect(target).toEqual({ elementId: 'card', anchor: 'bottom' })

    const arrow = moveLinearEnd(
      createLinear({ id: 'arrow', type: 'arrow', seed: 1, style, origin: { x: 240, y: 400 } }),
      'end',
      anchorPoint(card, 'bottom'),
      target,
    )
    const taller = { ...card, height: 350 }
    const synced = findArrow(syncBindings([taller, arrow]))
    expect(absolutePoints(synced).at(-1)).toEqual(anchorPoint(taller, 'bottom'))
  })
})
