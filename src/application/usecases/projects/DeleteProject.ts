import type { ProjectId } from '@/domain/project/Project'
import type { ProjectRepository } from '../../ports/ProjectRepository'

export class DeleteProject {
  private readonly projects: ProjectRepository

  constructor(projects: ProjectRepository) {
    this.projects = projects
  }

  /** Deletes the project with all its spaces, boards and documents (port contract). */
  execute(id: ProjectId): Promise<void> {
    return this.projects.delete(id)
  }
}
