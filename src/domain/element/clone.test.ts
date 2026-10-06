import { describe, expect, it } from 'vitest'
import { cloneElements } from './clone'
import { createLinear } from './factory'
import { TRANSPARENT, type DiagramElement, type LinearElement } from './types'

const style = { strokeColor: '#000', fillColor: TRANSPARENT, fillStyle: 'hachure' as const, strokeWidth: 2, roughness: 1 }
const box = (id: string, x: number): DiagramElement => ({
  id, type: 'rectangle', label: 'Box', x, y: 0, width: 100, height: 50, seed: 7, style,
})
const arrow: LinearElement = {
  ...createLinear({ id: 'arrow', type: 'arrow', seed: 1, style, origin: { x: 100, y: 25 } }),
  startBinding: { elementId: 'a', anchor: 'right' },
  endBinding: { elementId: 'b', anchor: 'left' },
}

describe('cloneElements', () => {
  let n = 0
  const newId = () => `new-${++n}`

  it('gives copies fresh ids and moves them', () => {
    const [copy] = cloneElements([box('a', 10)], newId, { x: 5, y: 7 })
    expect(copy).toMatchObject({ type: 'rectangle', label: 'Box', x: 15, y: 7 })
    expect(copy?.id).not.toBe('a')
  })

  it('keeps bindings between copied elements and drops the others', () => {
    const copies = cloneElements([box('a', 0), arrow], newId, { x: 0, y: 0 })
    const [shape, line] = copies as [DiagramElement, LinearElement]
    expect(line.startBinding).toEqual({ elementId: shape.id, anchor: 'right' })
    expect(line.endBinding).toBeNull()
  })
})
