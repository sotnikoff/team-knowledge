import { describe, expect, it } from 'vitest'
import { runVersionedRepositoryContract } from '@/application/ports/repository.contract'
import { createBoard, replaceElements } from '@/domain/board/Board'
import { createDocument, replaceContent } from '@/domain/document/Document'
import { StorageUnavailableError } from '@/domain/shared/errors'
import { createSpace, renameSpace } from '@/domain/space/Space'
import { InMemoryKeyValueStore, type KeyValueStore } from './KeyValueStore'
import { LocalStorageBoardRepository } from './LocalStorageBoardRepository'
import { LocalStorageDocumentRepository } from './LocalStorageDocumentRepository'
import { LocalStorageSpaceRepository } from './LocalStorageSpaceRepository'
import { purgeLegacyData } from './prefix'

const t0 = new Date('2026-01-01T00:00:00.000Z')

runVersionedRepositoryContract({
  name: 'LocalStorageSpaceRepository',
  entity: 'space',
  make: () => new LocalStorageSpaceRepository(new InMemoryKeyValueStore()),
  list: (repo) => repo.list(),
  sample: (id) => createSpace({ id, name: 'Space', now: t0 }),
  modify: (space, now) => renameSpace(space, 'Renamed', now),
  scopedBySpace: false,
})

runVersionedRepositoryContract({
  name: 'LocalStorageBoardRepository',
  entity: 'board',
  make: () => new LocalStorageBoardRepository(new InMemoryKeyValueStore()),
  list: (repo, spaceId) => repo.list(spaceId),
  sample: (id, spaceId) => createBoard({ id, spaceId, name: 'Board', now: t0 }),
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

runVersionedRepositoryContract({
  name: 'LocalStorageDocumentRepository',
  entity: 'document',
  make: () => new LocalStorageDocumentRepository(new InMemoryKeyValueStore()),
  list: (repo, spaceId) => repo.list(spaceId),
  sample: (id, spaceId) => createDocument({ id, spaceId, title: 'Doc', now: t0 }),
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

describe('LocalStorageSpaceRepository specifics', () => {
  it('deletes the boards and documents of a deleted space, and only them', async () => {
    const store = new InMemoryKeyValueStore()
    const spaces = new LocalStorageSpaceRepository(store)
    const boards = new LocalStorageBoardRepository(store)
    const documents = new LocalStorageDocumentRepository(store)
    await spaces.create(createSpace({ id: 's1', name: 'One', now: t0 }))
    await spaces.create(createSpace({ id: 's2', name: 'Two', now: t0 }))
    await boards.create(createBoard({ id: 'b1', spaceId: 's1', name: 'B', now: t0 }))
    await boards.create(createBoard({ id: 'b2', spaceId: 's2', name: 'B', now: t0 }))
    await documents.create(createDocument({ id: 'd1', spaceId: 's1', title: 'D', now: t0 }))

    await spaces.delete('s1')

    expect(await boards.list('s1')).toEqual([])
    expect(await documents.list('s1')).toEqual([])
    expect((await boards.list('s2')).map((b) => b.id)).toEqual(['b2'])
    expect(store.getItem('tk2:board:b1')).toBeNull()
    expect(store.getItem('tk2:document:d1')).toBeNull()
  })
})

describe('LocalCollection failure mapping', () => {
  const board = createBoard({ id: 'b1', spaceId: 's1', name: 'Board', now: t0 })

  it('maps quota errors to StorageUnavailableError', async () => {
    const full: KeyValueStore = {
      getItem: () => null,
      setItem: () => {
        throw new DOMException('full', 'QuotaExceededError')
      },
      removeItem: () => {},
    }
    await expect(new LocalStorageBoardRepository(full).create(board)).rejects.toBeInstanceOf(
      StorageUnavailableError,
    )
  })

  it('maps corrupted data to StorageUnavailableError', async () => {
    const store = new InMemoryKeyValueStore()
    store.setItem('tk2:board:b1', '{"broken":')
    await expect(new LocalStorageBoardRepository(store).get('b1')).rejects.toBeInstanceOf(
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
