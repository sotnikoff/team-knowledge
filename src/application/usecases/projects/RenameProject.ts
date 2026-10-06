import { renameProject, type Project, type ProjectId } from '@/domain/project/Project'
import type { Clock } from '../../ports/Clock'
import type { ProjectRepository } from '../../ports/ProjectRepository'

export class RenameProject {
  private readonly projects: ProjectRepository
  private readonly clock: Clock

  constructor(projects: ProjectRepository, clock: Clock) {
    this.projects = projects
    this.clock = clock
  }

  async execute(id: ProjectId, name: string): Promise<Project> {
    const project = await this.projects.get(id)
    return this.projects.save(renameProject(project, name, this.clock.now()))
  }
}
