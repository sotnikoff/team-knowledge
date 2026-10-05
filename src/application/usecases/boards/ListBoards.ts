import type { BoardSummary } from '@/domain/board/Board'
import type { SpaceId } from '@/domain/space/Space'
import type { BoardRepository } from '../../ports/BoardRepository'
import { byRecentUpdate } from '../sorting'

export class ListBoards {
  private readonly boards: BoardRepository

  constructor(boards: BoardRepository) {
    this.boards = boards
  }

  /** Boards of a space, most recently updated first. */
  async execute(spaceId: SpaceId): Promise<BoardSummary[]> {
    return (await this.boards.list(spaceId)).sort(byRecentUpdate)
  }
}
