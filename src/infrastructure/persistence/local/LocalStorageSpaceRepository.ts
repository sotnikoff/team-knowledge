import type { SpaceRepository } from '@/application/ports/SpaceRepository'
import type { ProjectId } from '@/domain/project/Project'
import type { Space, SpaceDraft, SpaceId } from '@/domain/space/Space'
import { spaceFromDto, spaceToDto } from '../dto/spaceMapper'
import type { KeyValueStore } from './KeyValueStore'
import { LocalCollection, type LocalIdentity } from './LocalCollection'
import { boardCollection } from './LocalStorageBoardRepository'
import { documentCollection } from './LocalStorageDocumentRepository'
import { DEFAULT_PREFIX } from './prefix'

export function spaceCollection(store: KeyValueStore, prefix: string, identity: LocalIdentity) {
  return new LocalCollection<Space, Space>(
    store,
    { index: `${prefix}:spaces:index`, item: (id) => `${prefix}:space:${id}` },
    {
      entity: 'space',
      toDto: spaceToDto,
      fromDto: spaceFromDto,
      toIndexEntry: spaceToDto,
      summaryFromDto: spaceFromDto,
    },
    identity,
  )
}

/** Removes spaces with all their boards and documents (what the server's cascade does). */
export function deleteSpacesCascade(
  store: KeyValueStore,
  prefix: string,
  identity: LocalIdentity,
  spaceIds: readonly SpaceId[],
): void {
  const ids = new Set(spaceIds)
  for (const children of [boardCollection(store, prefix, identity), documentCollection(store, prefix, identity)]) {
    children.deleteMany(children.list().filter((c) => ids.has(c.spaceId)).map((c) => c.id))
  }
  spaceCollection(store, prefix, identity).deleteMany(spaceIds)
}

export class LocalStorageSpaceRepository implements SpaceRepository {
  private readonly spaces: LocalCollection<Space, Space>
  private readonly store: KeyValueStore
  private readonly prefix: string
  private readonly identity: LocalIdentity

  /** `identity` assigns ids/timestamps of created spaces — a localStorage-only concern. */
  constructor(store: KeyValueStore, identity: LocalIdentity, prefix = DEFAULT_PREFIX) {
    this.store = store
    this.prefix = prefix
    this.identity = identity
    this.spaces = spaceCollection(store, prefix, identity)
  }

  async list(projectId: ProjectId): Promise<Space[]> {
    return this.spaces.list().filter((s) => s.projectId === projectId)
  }

  async get(id: SpaceId): Promise<Space> {
    return this.spaces.get(id)
  }

  async create(draft: SpaceDraft): Promise<Space> {
    return this.spaces.create(draft)
  }

  async save(space: Space): Promise<Space> {
    return this.spaces.save(space)
  }

  /** Cascades to the space's boards and documents (what the server will do). */
  async delete(id: SpaceId): Promise<void> {
    this.spaces.get(id) // NotFoundError for an unknown id
    deleteSpacesCascade(this.store, this.prefix, this.identity, [id])
  }
}
