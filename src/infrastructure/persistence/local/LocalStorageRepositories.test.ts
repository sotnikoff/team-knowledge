import { describe, expect, it } from 'vitest'
import { runVersionedRepositoryContract } from '@/application/ports/repository.contract'
import { newBoard, replaceElements, type Board } from '@/domain/board/Board'
import { newDocument, replaceContent, type Document } from '@/domain/document/Document'
import { StorageUnavailableError } from '@/domain/shared/errors'
import { newSpace, renameSpace, type Space } from '@/domain/space/Space'
import { InMemoryKeyValueStore, type KeyValueStore } from './KeyValueStore'
import type { LocalIdentity } from './LocalCollection'
import { LocalStorageBoardRepository } from './LocalStorageBoardRepository'
import { LocalStorageDocumentRepository } from './LocalStorageDocumentRepository'
import { LocalStorageSpaceRepository } from './LocalStorageSpaceRepository'
import { purgeLegacyData } from './prefix'

const t0 = new Date('2026-01-01T00:00:00.000Z')

/** Deterministic ids and time: what the browser gets from crypto + Date. */
function testIdentity(): LocalIdentity {
  let counter = 0
  return { ids: { next: () => `id-${++counter}` }, clock: { now: () => t0 } }
}

runVersionedRepositoryContract<Space, LocalStorageSpaceRepository>({
  name: 'LocalStorageSpaceRepository',
  entity: 'space',
  make: () => new LocalStorageSpaceRepository(new InMemoryKeyValueStore(), testIdentity()),
  list: (repo) => repo.list(),
  draft: () => newSpace({ name: 'Space' }),
  modify: (space, now) => renameSpace(space, 'Renamed', now),
  scopedBySpace: false,
})

runVersionedRepositoryContract<Board, LocalStorageBoardRepository>({
  name: 'LocalStorageBoardRepository',
  entity: 'board',
  make: () => new LocalStorageBoardRepository(new InMemoryKeyValueStore(), testIdentity()),
  list: (repo, spaceId) => repo.list(spaceId),
  draft: (spaceId) => newBoard({ spaceId, name: 'Board' }),
  modify: (board, now) =>
    replaceElements(
      board,
      [
        {
          id: 'r',
          type: 'rectangle',
          label: 'Hi',
          x: 1,
          y: 2,
          width: 3,
          height: 4,
          seed: 42,
          style: { strokeColor: '#000', fillColor: 'transparent', strokeWidth: 2, roughness: 1 },
        },
      ],
      now,
    ),
  heavyField: 'elements',
  scopedBySpace: true,
})

runVersionedRepositoryContract<Document, LocalStorageDocumentRepository>({
  name: 'LocalStorageDocumentRepository',
  entity: 'document',
  make: () => new LocalStorageDocumentRepository(new InMemoryKeyValueStore(), testIdentity()),
  list: (repo, spaceId) => repo.list(spaceId),
  draft: (spaceId) => newDocument({ spaceId, title: 'Doc' }),
  modify: (doc, now) =>
    replaceContent(
      doc,
      {
        type: 'doc',
        content: [
          { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Title' }] },
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'bold', marks: [{ type: 'bold' }] }],
          },
        ],
      },
      now,
    ),
  heavyField: 'content',
  scopedBySpace: true,
})

describe('LocalStorage adapters assign identity themselves', () => {
  it('uses the injected id generator and clock (a server would do this on POST)', async () => {
    const repo = new LocalStorageSpaceRepository(new InMemoryKeyValueStore(), testIdentity())
    const created = await repo.create(newSpace({ name: 'One' }))
    expect(created).toEqual({ id: 'id-1', name: 'One', version: 1, createdAt: t0, updatedAt: t0 })
  })
})

describe('LocalStorageSpaceRepository specifics', () => {
  it('deletes the boards and documents of a deleted space, and only them', async () => {
    const store = new InMemoryKeyValueStore()
    const identity = testIdentity()
    const spaces = new LocalStorageSpaceRepository(store, identity)
    const boards = new LocalStorageBoardRepository(store, identity)
    const documents = new LocalStorageDocumentRepository(store, identity)
    const one = await spaces.create(newSpace({ name: 'One' }))
    const two = await spaces.create(newSpace({ name: 'Two' }))
    const b1 = await boards.create(newBoard({ spaceId: one.id, name: 'B' }))
    const b2 = await boards.create(newBoard({ spaceId: two.id, name: 'B' }))
    const d1 = await documents.create(newDocument({ spaceId: one.id, title: 'D' }))

    await spaces.delete(one.id)

    expect(await boards.list(one.id)).toEqual([])
    expect(await documents.list(one.id)).toEqual([])
    expect((await boards.list(two.id)).map((b) => b.id)).toEqual([b2.id])
    expect(store.getItem(`tk2:board:${b1.id}`)).toBeNull()
    expect(store.getItem(`tk2:document:${d1.id}`)).toBeNull()
  })
})

describe('LocalCollection failure mapping', () => {
  it('maps quota errors to StorageUnavailableError', async () => {
    const full: KeyValueStore = {
      getItem: () => null,
      setItem: () => {
        throw new DOMException('full', 'QuotaExceededError')
      },
      removeItem: () => {},
    }
    await expect(
      new LocalStorageBoardRepository(full, testIdentity()).create(newBoard({ spaceId: 's1', name: 'Board' })),
    ).rejects.toBeInstanceOf(StorageUnavailableError)
  })

  it('maps corrupted data to StorageUnavailableError', async () => {
    const store = new InMemoryKeyValueStore()
    store.setItem('tk2:board:b1', '{"broken":')
    await expect(new LocalStorageBoardRepository(store, testIdentity()).get('b1')).rejects.toBeInstanceOf(
      StorageUnavailableError,
    )
  })
})

describe('purgeLegacyData', () => {
  it('removes only keys of the old format', () => {
    const data = new Map([
      ['tk:boards:index', '[]'],
      ['tk:board:1', '{}'],
      ['tk2:spaces:index', '[]'],
      ['other', 'x'],
    ])
    const storage = {
      get length() {
        return data.size
      },
      key: (i: number) => [...data.keys()][i] ?? null,
      removeItem: (k: string) => void data.delete(k),
    } as Storage
    purgeLegacyData(storage)
    expect([...data.keys()]).toEqual(['tk2:spaces:index', 'other'])
  })
})
