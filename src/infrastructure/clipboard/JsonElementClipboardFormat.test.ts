import { describe, expect, it } from 'vitest'
import { createLinear } from '@/domain/element/factory'
import { TRANSPARENT, type DiagramElement } from '@/domain/element/types'
import { JsonElementClipboardFormat } from './JsonElementClipboardFormat'

const style = { strokeColor: '#000', fillColor: TRANSPARENT, fillStyle: 'solid' as const, strokeWidth: 2, roughness: 1 }
const elements: DiagramElement[] = [
  { id: 'a', type: 'tech', kind: 'database', label: 'DB', x: 0, y: 0, width: 140, height: 120, seed: 1, style },
  createLinear({ id: 'l', type: 'arrow', seed: 2, style, origin: { x: 0, y: 0 } }),
]

describe('JsonElementClipboardFormat', () => {
  const format = new JsonElementClipboardFormat()

  it('round-trips elements', () => {
    expect(format.parse(format.serialize(elements))).toEqual(elements)
  })

  it('ignores text that is not elements of this app', () => {
    expect(format.parse('hello')).toBeNull()
    expect(format.parse('{"elements": []}')).toBeNull()
    expect(format.parse('[1, 2]')).toBeNull()
  })

  it('rejects malformed elements and newer formats', () => {
    expect(format.parse('{"kind":"team-knowledge/elements","version":1,"elements":[{"id":"x","type":"blob"}]}')).toBeNull()
    expect(format.parse('{"kind":"team-knowledge/elements","version":2,"elements":[]}')).toBeNull()
  })
})
