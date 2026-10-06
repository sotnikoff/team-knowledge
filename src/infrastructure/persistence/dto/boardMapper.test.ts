import { describe, expect, it } from 'vitest'
import { boardFromDto, boardToDto } from './boardMapper'
import { InvalidDataError } from './common'

const legacy = {
  schemaVersion: 1,
  id: 'b1',
  spaceId: 's1',
  name: 'Old board',
  version: 3,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  elements: [
    {
      id: 'r',
      type: 'rectangle',
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      seed: 1,
      style: { strokeColor: '#000', fillColor: 'transparent', strokeWidth: 2, roughness: 1 },
    },
    {
      id: 'l',
      type: 'arrow',
      x: 0,
      y: 0,
      width: 10,
      height: 0,
      seed: 1,
      style: { strokeColor: '#000', fillColor: 'transparent', strokeWidth: 2, roughness: 1 },
      points: [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
      ],
    },
  ],
}

describe('boardMapper', () => {
  it('reads data saved before labels and bindings existed', () => {
    const board = boardFromDto(legacy)
    expect(board.elements[0]).toMatchObject({ type: 'rectangle', label: '' })
    expect(board.elements[1]).toMatchObject({ type: 'arrow', startBinding: null, endBinding: null, curved: false, label: '' })
  })

  it('round-trips labels and bindings', () => {
    const board = boardFromDto(legacy)
    const withExtras = {
      ...board,
      elements: [
        { ...board.elements[0]!, label: 'Hello' },
        { ...board.elements[1]!, endBinding: { elementId: 'r', anchor: 'left' as const } },
      ],
    }
    expect(boardFromDto(JSON.parse(JSON.stringify(boardToDto(withExtras))))).toEqual(withExtras)
  })

  it('reads a missing fill style as hachure and round-trips a solid fill', () => {
    const board = boardFromDto(legacy)
    expect(board.elements[0]!.style.fillStyle).toBe('hachure')
    const rect = board.elements[0]!
    const solid = { ...board, elements: [{ ...rect, style: { ...rect.style, fillColor: '#a5d8ff', fillStyle: 'solid' as const } }] }
    expect(boardFromDto(JSON.parse(JSON.stringify(boardToDto(solid))))).toEqual(solid)
  })

  it('reads heads of older lines and arrows, and keeps a deliberately removed head', () => {
    const board = boardFromDto(legacy)
    expect(board.elements[1]).toMatchObject({ startArrowhead: null, endArrowhead: 'arrow' })
    const plainLine = structuredClone(legacy)
    Object.assign(plainLine.elements[1]!, { type: 'line' })
    expect(boardFromDto(plainLine).elements[1]).toMatchObject({ startArrowhead: null, endArrowhead: null })

    const arrow = board.elements[1]!
    const edited = { ...board, elements: [{ ...arrow, startArrowhead: 'dot' as const, endArrowhead: null }] }
    expect(boardFromDto(JSON.parse(JSON.stringify(boardToDto(edited))))).toEqual(edited)
  })

  it('rejects an unknown arrowhead', () => {
    const bad = structuredClone(legacy)
    Object.assign(bad.elements[1]!, { endArrowhead: 'heart' })
    expect(() => boardFromDto(bad)).toThrow(InvalidDataError)
  })

  it('rejects an unknown fill style', () => {
    const bad = structuredClone(legacy)
    Object.assign(bad.elements[0]!.style, { fillStyle: 'dots' })
    expect(() => boardFromDto(bad)).toThrow(InvalidDataError)
  })

  it('rejects an unknown anchor', () => {
    const bad = structuredClone(legacy)
    Object.assign(bad.elements[1]!, { endBinding: { elementId: 'r', anchor: 'center' } })
    expect(() => boardFromDto(bad)).toThrow(InvalidDataError)
  })

  it('round-trips a document card and requires its documentId', () => {
    const board = boardFromDto(legacy)
    const card = {
      id: 'card',
      type: 'document' as const,
      documentId: 'doc-1',
      x: 5,
      y: 6,
      width: 480,
      height: 320,
      seed: 3,
      style: board.elements[0]!.style,
    }
    const withCard = { ...board, elements: [...board.elements, card] }
    expect(boardFromDto(JSON.parse(JSON.stringify(boardToDto(withCard))))).toEqual(withCard)

    const broken = structuredClone(legacy)
    broken.elements.push({ ...broken.elements[0]!, id: 'x', type: 'document' })
    expect(() => boardFromDto(broken)).toThrow(InvalidDataError)
  })

  it('round-trips an architecture component and rejects an unknown kind', () => {
    const board = boardFromDto(legacy)
    const component = {
      id: 'db',
      type: 'tech' as const,
      kind: 'database' as const,
      label: 'Orders DB',
      x: 1,
      y: 2,
      width: 140,
      height: 120,
      seed: 7,
      style: board.elements[0]!.style,
    }
    const withComponent = { ...board, elements: [...board.elements, component] }
    expect(boardFromDto(JSON.parse(JSON.stringify(boardToDto(withComponent))))).toEqual(withComponent)

    const broken = structuredClone(legacy)
    broken.elements.push({ ...broken.elements[0]!, id: 'x', type: 'tech', kind: 'mainframe' } as never)
    expect(() => boardFromDto(broken)).toThrow(InvalidDataError)
  })
})

