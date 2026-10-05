import type { BoardId } from '@/domain/board/Board'
import type { BoardRepository } from '../../ports/BoardRepository'

export class DeleteBoard {
  private readonly boards: BoardRepository

  constructor(boards: BoardRepository) {
    this.boards = boards
  }

  execute(id: BoardId): Promise<void> {
    return this.boards.delete(id)
  }
}
