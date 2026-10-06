import type { Project } from '@/domain/project/Project'
import type { ProjectRepository } from '../../ports/ProjectRepository'
import { byRecentUpdate } from '../sorting'

export class ListProjects {
  private readonly projects: ProjectRepository

  constructor(projects: ProjectRepository) {
    this.projects = projects
  }

  /** Most recently updated first. */
  async execute(): Promise<Project[]> {
    return (await this.projects.list()).sort(byRecentUpdate)
  }
}
