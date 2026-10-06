import type { DiagramElement } from '../element/types'
import type { SpaceId } from '../space/Space'
import { normalizeName } from '../shared/name'
import type { Draft, Versioned } from '../shared/versioned'

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

export type BoardDraft = Draft<Board>

/** A new, empty board; the repository gives it an id when it is created. */
export function newBoard(params: { spaceId: SpaceId; name: string }): BoardDraft {
  return { spaceId: params.spaceId, name: normalizeName(params.name), elements: [] }
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
