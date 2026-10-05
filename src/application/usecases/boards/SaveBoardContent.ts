import { replaceElements, type Board } from '@/domain/board/Board'
import type { DiagramElement } from '@/domain/element/types'
import type { BoardRepository } from '../../ports/BoardRepository'
import type { Clock } from '../../ports/Clock'

export class SaveBoardContent {
  private readonly boards: BoardRepository
  private readonly clock: Clock

  constructor(boards: BoardRepository, clock: Clock) {
    this.boards = boards
    this.clock = clock
  }

  /**
   * `base` is the last board returned by the repository; its version is the
   * concurrency token. Continue from the returned board for the next save.
   */
  execute(base: Board, elements: readonly DiagramElement[]): Promise<Board> {
    return this.boards.save(replaceElements(base, elements, this.clock.now()))
  }
}
