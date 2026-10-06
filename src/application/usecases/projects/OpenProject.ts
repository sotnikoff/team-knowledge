import type { Project, ProjectId } from '@/domain/project/Project'
import type { ProjectRepository } from '../../ports/ProjectRepository'

export class OpenProject {
  private readonly projects: ProjectRepository

  constructor(projects: ProjectRepository) {
    this.projects = projects
  }

  execute(id: ProjectId): Promise<Project> {
    return this.projects.get(id)
  }
}
