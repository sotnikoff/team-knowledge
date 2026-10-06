import { newSpace, type Space } from '@/domain/space/Space'
import type { SpaceRepository } from '../../ports/SpaceRepository'

export class CreateSpace {
  private readonly spaces: SpaceRepository

  constructor(spaces: SpaceRepository) {
    this.spaces = spaces
  }

  /** The repository assigns the id (and the first version / timestamps). */
  execute(input: { name: string }): Promise<Space> {
    return this.spaces.create(newSpace({ name: input.name }))
  }
}
