import { renameBoard, type Board, type BoardId } from '@/domain/board/Board'
import type { BoardRepository } from '../../ports/BoardRepository'
import type { Clock } from '../../ports/Clock'

export class RenameBoard {
  private readonly boards: BoardRepository
  private readonly clock: Clock

  constructor(boards: BoardRepository, clock: Clock) {
    this.boards = boards
    this.clock = clock
  }

  async execute(id: BoardId, name: string): Promise<Board> {
    const board = await this.boards.get(id)
    return this.boards.save(renameBoard(board, name, this.clock.now()))
  }
}
