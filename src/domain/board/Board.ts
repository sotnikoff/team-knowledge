import type { DiagramElement } from '../element/types'
import type { SpaceId } from '../space/Space'
import { normalizeName } from '../shared/name'
import type { Versioned } from '../shared/versioned'

export type BoardId = string

/** Lightweight projection used for listings (no elements). */
export interface BoardSummary extends Versioned {
  readonly id: BoardId
  readonly spaceId: SpaceId
  readonly name: string
}

export interface Board extends BoardSummary {
  readonly elements: readonly DiagramElement[]
}

export function createBoard(params: { id: BoardId; spaceId: SpaceId; name: string; now: Date }): Board {
  return {
    id: params.id,
    spaceId: params.spaceId,
    name: normalizeName(params.name),
    version: 1,
    createdAt: params.now,
    updatedAt: params.now,
    elements: [],
  }
}

export function renameBoard(board: Board, name: string, now: Date): Board {
  return { ...board, name: normalizeName(name), updatedAt: now }
}

export function replaceElements(
  board: Board,
  elements: readonly DiagramElement[],
  now: Date,
): Board {
  return { ...board, elements, updatedAt: now }
}

export function toSummary(board: Board): BoardSummary {
  const { elements: _elements, ...summary } = board
  return summary
}
