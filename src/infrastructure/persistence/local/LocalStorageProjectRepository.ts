import type { AccessTokenProvider } from '@/application/ports/AccessTokenProvider'
import type { ProjectRepository } from '@/application/ports/ProjectRepository'
import type { Project, ProjectDraft, ProjectId } from '@/domain/project/Project'
import { projectFromDto, projectToDto } from '../dto/projectMapper'
import type { KeyValueStore } from './KeyValueStore'
import { LocalCollection, type LocalIdentity } from './LocalCollection'
import { deleteSpacesCascade, spaceCollection } from './LocalStorageSpaceRepository'
import { DEFAULT_PREFIX } from './prefix'

export class LocalStorageProjectRepository implements ProjectRepository {
  private readonly projects: LocalCollection<Project, Project>
  private readonly store: KeyValueStore
  private readonly prefix: string
  private readonly identity: LocalIdentity

  /** `identity` assigns ids/timestamps of created projects — a localStorage-only concern. */
  /**
   * `_tokens` is the access token every adapter receives; HTTP adapters send it
   * as `Authorization: Bearer`. Local data is not tied to users yet, so it is ignored.
   */
  constructor(store: KeyValueStore, identity: LocalIdentity, _tokens: AccessTokenProvider, prefix = DEFAULT_PREFIX) {
    this.store = store
    this.prefix = prefix
    this.identity = identity
    this.projects = new LocalCollection<Project, Project>(
      store,
      { index: `${prefix}:projects:index`, item: (id) => `${prefix}:project:${id}` },
      {
        entity: 'project',
        toDto: projectToDto,
        fromDto: projectFromDto,
        toIndexEntry: projectToDto,
        summaryFromDto: projectFromDto,
      },
      identity,
    )
  }

  async list(): Promise<Project[]> {
    return this.projects.list()
  }

  async get(id: ProjectId): Promise<Project> {
    return this.projects.get(id)
  }

  async create(draft: ProjectDraft): Promise<Project> {
    return this.projects.create(draft)
  }

  async save(project: Project): Promise<Project> {
    return this.projects.save(project)
  }

  /** Cascades to the project's spaces and their boards and documents (what the server will do). */
  async delete(id: ProjectId): Promise<void> {
    this.projects.delete(id)
    const spaces = spaceCollection(this.store, this.prefix, this.identity).list()
    deleteSpacesCascade(
      this.store,
      this.prefix,
      this.identity,
      spaces.filter((s) => s.projectId === id).map((s) => s.id),
    )
  }
}
