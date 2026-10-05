import type { BoardSummary } from '@/domain/board/Board'
import type { BoardRepository } from '../ports/BoardRepository'

export class ListBoards {
  private readonly boards: BoardRepository

  constructor(boards: BoardRepository) {
    this.boards = boards
  }

  /** Most recently updated first. */
  async execute(): Promise<BoardSummary[]> {
    const list = await this.boards.list()
    return list.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
  }
}
