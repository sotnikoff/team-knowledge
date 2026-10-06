import { describe, expect, it } from 'vitest'
import { createDocumentElement } from '@/domain/element/factory'
import type { DiagramElement } from '@/domain/element/types'
import { defaultStyle } from './editorModel'
import { splitAtDocuments } from './scene'

const box = (id: string): DiagramElement => ({
  id,
  type: 'rectangle',
  label: '',
  x: 0,
  y: 0,
  width: 10,
  height: 10,
  seed: 1,
  style: defaultStyle,
})
const doc = (id: string) => createDocumentElement({ id, documentId: id, seed: 1, style: defaultStyle, x: 0, y: 0, width: 100 })
const ids = (list: readonly (readonly DiagramElement[])[]) => list.map((l) => l.map((el) => el.id).join(''))

describe('splitAtDocuments', () => {
  it('cuts the drawings at every document card, keeping the order', () => {
    const strata = splitAtDocuments([box('a'), doc('D'), box('b'), box('c'), doc('E')])
    expect(strata.documents.map((d) => d.id)).toEqual(['D', 'E'])
    expect(ids(strata.drawings)).toEqual(['a', 'bc', ''])
  })

  it('has a single drawing when there are no cards', () => {
    expect(ids(splitAtDocuments([box('a'), box('b')]).drawings)).toEqual(['ab'])
    expect(ids(splitAtDocuments([]).drawings)).toEqual([''])
  })
})
