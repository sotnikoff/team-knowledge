import type { Space, SpaceId } from '@/domain/space/Space'
import type { SpaceRepository } from '../../ports/SpaceRepository'

export class OpenSpace {
  private readonly spaces: SpaceRepository

  constructor(spaces: SpaceRepository) {
    this.spaces = spaces
  }

  execute(id: SpaceId): Promise<Space> {
    return this.spaces.get(id)
  }
}
