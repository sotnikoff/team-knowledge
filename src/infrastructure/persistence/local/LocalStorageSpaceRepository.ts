import type { SpaceRepository } from '@/application/ports/SpaceRepository'
import type { Space, SpaceDraft, SpaceId } from '@/domain/space/Space'
import { spaceFromDto, spaceToDto } from '../dto/spaceMapper'
import type { KeyValueStore } from './KeyValueStore'
import { LocalCollection, type LocalIdentity } from './LocalCollection'
import { boardCollection } from './LocalStorageBoardRepository'
import { documentCollection } from './LocalStorageDocumentRepository'
import { DEFAULT_PREFIX } from './prefix'

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
    this.spaces = new LocalCollection<Space, Space>(
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

  async list(): Promise<Space[]> {
    return this.spaces.list()
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
    this.spaces.delete(id)
    for (const children of [
      boardCollection(this.store, this.prefix, this.identity),
      documentCollection(this.store, this.prefix, this.identity),
    ]) {
      children.deleteMany(children.list().filter((c) => c.spaceId === id).map((c) => c.id))
    }
  }
}
