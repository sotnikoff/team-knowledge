import { describe, expect, it } from 'vitest'
import type { Archive, ArchivedSpace } from '@/domain/archive/Archive'
import { createDocumentElement, createLinear } from '@/domain/element/factory'
import { InvalidFileError } from '@/domain/shared/errors'
import { TRANSPARENT } from '@/domain/element/types'
import { JsonArchiveFormat } from './JsonArchiveFormat'

const style = { strokeColor: '#000', fillColor: TRANSPARENT, fillStyle: 'solid' as const, strokeWidth: 2, roughness: 1 }
const space: ArchivedSpace = {
  id: 's1',
  name: 'Payments',
  documents: [{ id: 'd1', title: 'API', content: { type: 'doc', content: [{ type: 'paragraph' }] } }],
  boards: [
    {
      id: 'b1',
      name: 'Flow',
      elements: [
        createDocumentElement({ id: 'c', documentId: 'd1', seed: 1, style, x: 0, y: 0, width: 300 }),
        { ...createLinear({ id: 'a', type: 'arrow', seed: 2, style, origin: { x: 0, y: 0 } }), endArrowhead: null },
      ],
    },
  ],
}

describe('JsonArchiveFormat', () => {
  const format = new JsonArchiveFormat()
  const archives: Archive[] = [
    { kind: 'project', project: { id: 'p1', name: 'Shop', spaces: [space] } },
    { kind: 'space', space },
    { kind: 'board', board: space.boards[0]! },
    { kind: 'document', document: space.documents[0]! },
  ]

  it.each(archives)('round-trips a $kind', (archive) => {
    expect(format.parse(format.serialize(archive))).toEqual(archive)
  })

  it('rejects files that are not usable exports', () => {
    const bad = [
      'not json',
      '{"format":"something-else","kind":"board","version":1}',
      '{"format":"team-knowledge","kind":"board","version":2,"board":{}}',
      '{"format":"team-knowledge","kind":"sofa","version":1}',
      '{"format":"team-knowledge","kind":"board","version":1,"board":{"id":"b","name":"x","elements":[{"id":"e","type":"blob"}]}}',
    ]
    for (const text of bad) {
      expect(() => format.parse(text)).toThrow(InvalidFileError)
    }
  })
})
