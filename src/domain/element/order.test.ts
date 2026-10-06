import { describe, expect, it } from 'vitest'
import { reorderElements } from './order'
import { TRANSPARENT, type DiagramElement } from './types'

const box = (id: string, x = 0): DiagramElement => ({
  id,
  type: 'rectangle',
  label: '',
  x,
  y: 0,
  width: 10,
  height: 10,
  seed: 1,
  style: { strokeColor: '#000', fillColor: TRANSPARENT, fillStyle: 'hachure', strokeWidth: 1, roughness: 0 },
})

const order = (elements: readonly DiagramElement[]) => elements.map((el) => el.id).join('')

describe('reorderElements', () => {
  const abcd = [box('a'), box('b'), box('c'), box('d')]

  it('brings the selection to the front and sends it to the back, keeping its order', () => {
    expect(order(reorderElements(abcd, ['c', 'a'], 'front'))).toBe('bdac')
    expect(order(reorderElements(abcd, ['d', 'b'], 'back'))).toBe('bdac')
  })

  it('moves one step over the nearest overlapping element', () => {
    expect(order(reorderElements(abcd, ['a'], 'forward'))).toBe('bacd')
    expect(order(reorderElements(abcd, ['d'], 'backward'))).toBe('abdc')
    expect(order(reorderElements(abcd, ['a', 'b'], 'forward'))).toBe('cabd')
  })

  it('skips elements that do not overlap the selection', () => {
    const elements = [box('a'), box('far', 500), box('b')]
    expect(order(reorderElements(elements, ['a'], 'forward'))).toBe('farba')
    expect(order(reorderElements(elements, ['b'], 'backward'))).toBe('bafar')
  })

  it('returns the same array when nothing can move', () => {
    expect(reorderElements(abcd, ['d'], 'forward')).toBe(abcd)
    expect(reorderElements(abcd, ['d'], 'front')).toBe(abcd)
    expect(reorderElements(abcd, ['a'], 'back')).toBe(abcd)
    expect(reorderElements(abcd, [], 'front')).toBe(abcd)
    const apart = [box('a'), box('far', 500)]
    expect(reorderElements(apart, ['a'], 'forward')).toBe(apart)
  })
})
