import type { Board, BoardId } from '@/domain/board/Board'
import type { BoardRepository } from '../../ports/BoardRepository'

export class OpenBoard {
  private readonly boards: BoardRepository

  constructor(boards: BoardRepository) {
    this.boards = boards
  }

  execute(id: BoardId): Promise<Board> {
    return this.boards.get(id)
  }
}
