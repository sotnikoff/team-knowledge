import { renameSpace, type Space, type SpaceId } from '@/domain/space/Space'
import type { Clock } from '../../ports/Clock'
import type { SpaceRepository } from '../../ports/SpaceRepository'

export class RenameSpace {
  private readonly spaces: SpaceRepository
  private readonly clock: Clock

  constructor(spaces: SpaceRepository, clock: Clock) {
    this.spaces = spaces
    this.clock = clock
  }

  async execute(id: SpaceId, name: string): Promise<Space> {
    const space = await this.spaces.get(id)
    return this.spaces.save(renameSpace(space, name, this.clock.now()))
  }
}
