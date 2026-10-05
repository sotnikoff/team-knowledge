import type { SpaceId } from '@/domain/space/Space'
import type { SpaceRepository } from '../../ports/SpaceRepository'

export class DeleteSpace {
  private readonly spaces: SpaceRepository

  constructor(spaces: SpaceRepository) {
    this.spaces = spaces
  }

  /** Deletes the space with all its boards and documents (port contract). */
  execute(id: SpaceId): Promise<void> {
    return this.spaces.delete(id)
  }
}
