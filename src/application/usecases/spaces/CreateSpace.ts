import { createSpace, type Space } from '@/domain/space/Space'
import type { Clock } from '../../ports/Clock'
import type { IdGenerator } from '../../ports/IdGenerator'
import type { SpaceRepository } from '../../ports/SpaceRepository'

export class CreateSpace {
  private readonly spaces: SpaceRepository
  private readonly ids: IdGenerator
  private readonly clock: Clock

  constructor(spaces: SpaceRepository, ids: IdGenerator, clock: Clock) {
    this.spaces = spaces
    this.ids = ids
    this.clock = clock
  }

  execute(input: { name: string }): Promise<Space> {
    return this.spaces.create(createSpace({ id: this.ids.next(), name: input.name, now: this.clock.now() }))
  }
}
