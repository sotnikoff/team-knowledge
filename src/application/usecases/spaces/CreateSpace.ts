import type { ProjectId } from '@/domain/project/Project'
import { newSpace, type Space } from '@/domain/space/Space'
import type { ProjectRepository } from '../../ports/ProjectRepository'
import type { SpaceRepository } from '../../ports/SpaceRepository'

export class CreateSpace {
  private readonly spaces: SpaceRepository
  private readonly projects: ProjectRepository

  constructor(spaces: SpaceRepository, projects: ProjectRepository) {
    this.spaces = spaces
    this.projects = projects
  }

  /** The repository assigns the id (and the first version / timestamps). */
  async execute(input: { projectId: ProjectId; name: string }): Promise<Space> {
    await this.projects.get(input.projectId) // NotFoundError if the project is gone
    return this.spaces.create(newSpace({ projectId: input.projectId, name: input.name }))
  }
}
