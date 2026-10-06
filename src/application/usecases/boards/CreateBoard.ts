import { newBoard, type Board } from '@/domain/board/Board'
import type { SpaceId } from '@/domain/space/Space'
import type { BoardRepository } from '../../ports/BoardRepository'
import type { SpaceRepository } from '../../ports/SpaceRepository'

export class CreateBoard {
  private readonly boards: BoardRepository
  private readonly spaces: SpaceRepository

  constructor(boards: BoardRepository, spaces: SpaceRepository) {
    this.boards = boards
    this.spaces = spaces
  }

  /** The repository assigns the id (and the first version / timestamps). */
  async execute(input: { spaceId: SpaceId; name: string }): Promise<Board> {
    await this.spaces.get(input.spaceId) // NotFoundError if the space is gone
    return this.boards.create(newBoard({ spaceId: input.spaceId, name: input.name }))
  }
}
