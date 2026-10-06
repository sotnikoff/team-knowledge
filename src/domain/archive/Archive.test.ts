import { describe, expect, it } from 'vitest'
import { createDocumentElement } from '../element/factory'
import { TRANSPARENT, type DiagramElement } from '../element/types'
import { remapDocumentRefs } from './Archive'

const style = { strokeColor: '#000', fillColor: TRANSPARENT, fillStyle: 'hachure' as const, strokeWidth: 2, roughness: 1 }

describe('remapDocumentRefs', () => {
  it('points cards at the new documents and leaves the rest alone', () => {
    const inArchive = createDocumentElement({ id: 'c1', documentId: 'old', seed: 1, style, x: 0, y: 0, width: 300 })
    const outside = createDocumentElement({ id: 'c2', documentId: 'elsewhere', seed: 1, style, x: 0, y: 0, width: 300 })
    const shape: DiagramElement = { id: 'r', type: 'rectangle', label: '', x: 0, y: 0, width: 1, height: 1, seed: 1, style }
    const [a, b, c] = remapDocumentRefs([inArchive, outside, shape], new Map([['old', 'new']]))
    expect(a).toMatchObject({ documentId: 'new' })
    expect(b).toBe(outside)
    expect(c).toBe(shape)
  })
})
