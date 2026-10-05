import { createBoard, type Board } from '@/domain/board/Board'
import type { BoardRepository } from '../ports/BoardRepository'
import type { Clock } from '../ports/Clock'
import type { IdGenerator } from '../ports/IdGenerator'

export class CreateBoard {
  private readonly boards: BoardRepository
  private readonly ids: IdGenerator
  private readonly clock: Clock

  constructor(boards: BoardRepository, ids: IdGenerator, clock: Clock) {
    this.boards = boards
    this.ids = ids
    this.clock = clock
  }

  execute(input: { name: string }): Promise<Board> {
    const board = createBoard({ id: this.ids.next(), name: input.name, now: this.clock.now() })
    return this.boards.create(board)
  }
}
