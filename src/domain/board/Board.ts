import type { DiagramElement } from '../element/types'
import { InvalidBoardNameError } from '../shared/errors'

export type BoardId = string

/** Lightweight projection used for listings (no elements). */
export interface BoardSummary {
  readonly id: BoardId
  readonly name: string
  /**
   * Optimistic-concurrency token. The value a client read must match the
   * stored one for a save to succeed; every successful save increments it.
   */
  readonly version: number
  readonly createdAt: Date
  readonly updatedAt: Date
}

export interface Board extends BoardSummary {
  readonly elements: readonly DiagramElement[]
}

export const BOARD_NAME_MAX_LENGTH = 100

export function normalizeBoardName(raw: string): string {
  const name = raw.trim()
  if (name.length === 0) throw new InvalidBoardNameError('name must not be empty')
  if (name.length > BOARD_NAME_MAX_LENGTH) {
    throw new InvalidBoardNameError(`name must be at most ${BOARD_NAME_MAX_LENGTH} characters`)
  }
  return name
}

export function createBoard(params: { id: BoardId; name: string; now: Date }): Board {
  return {
    id: params.id,
    name: normalizeBoardName(params.name),
    version: 1,
    createdAt: params.now,
    updatedAt: params.now,
    elements: [],
  }
}

export function renameBoard(board: Board, name: string, now: Date): Board {
  return { ...board, name: normalizeBoardName(name), updatedAt: now }
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
