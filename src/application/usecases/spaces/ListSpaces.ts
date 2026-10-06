import type { ProjectId } from '@/domain/project/Project'
import type { Space } from '@/domain/space/Space'
import type { SpaceRepository } from '../../ports/SpaceRepository'
import { byRecentUpdate } from '../sorting'

export class ListSpaces {
  private readonly spaces: SpaceRepository

  constructor(spaces: SpaceRepository) {
    this.spaces = spaces
  }

  /** Spaces of a project, most recently updated first. */
  async execute(projectId: ProjectId): Promise<Space[]> {
    return (await this.spaces.list(projectId)).sort(byRecentUpdate)
  }
}
