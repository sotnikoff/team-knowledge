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
    expect(board.elements[1]).toMatchObject({ type: 'arrow', startBinding: null, endBinding: null })
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

  it('rejects an unknown anchor', () => {
    const bad = structuredClone(legacy)
    Object.assign(bad.elements[1]!, { endBinding: { elementId: 'r', anchor: 'center' } })
    expect(() => boardFromDto(bad)).toThrow(InvalidDataError)
  })
})
