import { createBoard, type Board } from '@/domain/board/Board'
import type { SpaceId } from '@/domain/space/Space'
import type { BoardRepository } from '../../ports/BoardRepository'
import type { Clock } from '../../ports/Clock'
import type { IdGenerator } from '../../ports/IdGenerator'
import type { SpaceRepository } from '../../ports/SpaceRepository'

export class CreateBoard {
  private readonly boards: BoardRepository
  private readonly spaces: SpaceRepository
  private readonly ids: IdGenerator
  private readonly clock: Clock

  constructor(boards: BoardRepository, spaces: SpaceRepository, ids: IdGenerator, clock: Clock) {
    this.boards = boards
    this.spaces = spaces
    this.ids = ids
    this.clock = clock
  }

  async execute(input: { spaceId: SpaceId; name: string }): Promise<Board> {
    await this.spaces.get(input.spaceId) // NotFoundError if the space is gone
    const board = createBoard({
      id: this.ids.next(),
      spaceId: input.spaceId,
      name: input.name,
      now: this.clock.now(),
    })
    return this.boards.create(board)
  }
}
