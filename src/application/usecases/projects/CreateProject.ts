import { newProject, type Project } from '@/domain/project/Project'
import type { ProjectRepository } from '../../ports/ProjectRepository'

export class CreateProject {
  private readonly projects: ProjectRepository

  constructor(projects: ProjectRepository) {
    this.projects = projects
  }

  /** The repository assigns the id (and the first version / timestamps). */
  execute(input: { name: string }): Promise<Project> {
    return this.projects.create(newProject({ name: input.name }))
  }
}
