import { describe, expect, it } from 'vitest'
import { runVersionedRepositoryContract } from '@/application/ports/repository.contract'
import { newBoard, replaceElements, type Board } from '@/domain/board/Board'
import { newDocument, replaceContent, type Document } from '@/domain/document/Document'
import { NotFoundError, StorageUnavailableError } from '@/domain/shared/errors'
import { newProject, renameProject, type Project } from '@/domain/project/Project'
import { newSpace, renameSpace, type Space } from '@/domain/space/Space'
import { InMemoryKeyValueStore, type KeyValueStore } from './KeyValueStore'
import type { LocalIdentity } from './LocalCollection'
import { LocalStorageBoardRepository } from './LocalStorageBoardRepository'
import { LocalStorageDocumentRepository } from './LocalStorageDocumentRepository'
import { LocalStorageProjectRepository } from './LocalStorageProjectRepository'
import { LocalStorageSpaceRepository } from './LocalStorageSpaceRepository'
import { purgeLegacyData } from './prefix'

const t0 = new Date('2026-01-01T00:00:00.000Z')

/** The local adapters accept an access token and ignore it. */
const testTokens = { current: () => 'test-token' }

/** Deterministic ids and time: what the browser gets from crypto + Date. */
function testIdentity(): LocalIdentity {
  let counter = 0
  return { ids: { next: () => `id-${++counter}` }, clock: { now: () => t0 } }
}

runVersionedRepositoryContract<Project, LocalStorageProjectRepository>({
  name: 'LocalStorageProjectRepository',
  entity: 'project',
  make: () => new LocalStorageProjectRepository(new InMemoryKeyValueStore(), testIdentity(), testTokens),
  list: (repo) => repo.list(),
  draft: () => newProject({ name: 'Project' }),
  modify: (project, now) => renameProject(project, 'Renamed', now),
  scoped: false,
})

runVersionedRepositoryContract<Space, LocalStorageSpaceRepository>({
  name: 'LocalStorageSpaceRepository',
  entity: 'space',
  make: () => new LocalStorageSpaceRepository(new InMemoryKeyValueStore(), testIdentity(), testTokens),
  list: (repo, projectId) => repo.list(projectId),
  draft: (projectId) => newSpace({ projectId, name: 'Space' }),
  modify: (space, now) => renameSpace(space, 'Renamed', now),
  scoped: true,
})

runVersionedRepositoryContract<Board, LocalStorageBoardRepository>({
  name: 'LocalStorageBoardRepository',
  entity: 'board',
  make: () => new LocalStorageBoardRepository(new InMemoryKeyValueStore(), testIdentity(), testTokens),
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
          style: { strokeColor: '#000', fillColor: 'transparent', fillStyle: 'hachure', strokeWidth: 2, roughness: 1 },
        },
      ],
      now,
    ),
  heavyField: 'elements',
  scoped: true,
})

runVersionedRepositoryContract<Document, LocalStorageDocumentRepository>({
  name: 'LocalStorageDocumentRepository',
  entity: 'document',
  make: () => new LocalStorageDocumentRepository(new InMemoryKeyValueStore(), testIdentity(), testTokens),
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
  scoped: true,
})

describe('LocalStorage adapters assign identity themselves', () => {
  it('uses the injected id generator and clock (a server would do this on POST)', async () => {
    const repo = new LocalStorageSpaceRepository(new InMemoryKeyValueStore(), testIdentity(), testTokens)
    const created = await repo.create(newSpace({ projectId: 'p1', name: 'One' }))
    expect(created).toEqual({ id: 'id-1', projectId: 'p1', name: 'One', version: 1, createdAt: t0, updatedAt: t0 })
  })
})

describe('LocalStorageSpaceRepository specifics', () => {
  it('deletes the boards and documents of a deleted space, and only them', async () => {
    const store = new InMemoryKeyValueStore()
    const identity = testIdentity()
    const spaces = new LocalStorageSpaceRepository(store, identity, testTokens)
    const boards = new LocalStorageBoardRepository(store, identity, testTokens)
    const documents = new LocalStorageDocumentRepository(store, identity, testTokens)
    const one = await spaces.create(newSpace({ projectId: 'p1', name: 'One' }))
    const two = await spaces.create(newSpace({ projectId: 'p1', name: 'Two' }))
    const b1 = await boards.create(newBoard({ spaceId: one.id, name: 'B' }))
    const b2 = await boards.create(newBoard({ spaceId: two.id, name: 'B' }))
    const d1 = await documents.create(newDocument({ spaceId: one.id, title: 'D' }))

    await spaces.delete(one.id)

    expect(await boards.list(one.id)).toEqual([])
    expect(await documents.list(one.id)).toEqual([])
    expect((await boards.list(two.id)).map((b) => b.id)).toEqual([b2.id])
    expect(store.getItem(`tk3:board:${b1.id}`)).toBeNull()
    expect(store.getItem(`tk3:document:${d1.id}`)).toBeNull()
  })
})

describe('LocalStorageProjectRepository specifics', () => {
  it('deletes the spaces of a deleted project with their boards and documents, and only them', async () => {
    const store = new InMemoryKeyValueStore()
    const identity = testIdentity()
    const projects = new LocalStorageProjectRepository(store, identity, testTokens)
    const spaces = new LocalStorageSpaceRepository(store, identity, testTokens)
    const boards = new LocalStorageBoardRepository(store, identity, testTokens)
    const documents = new LocalStorageDocumentRepository(store, identity, testTokens)
    const doomed = await projects.create(newProject({ name: 'Doomed' }))
    const kept = await projects.create(newProject({ name: 'Kept' }))
    const s1 = await spaces.create(newSpace({ projectId: doomed.id, name: 'S1' }))
    const s2 = await spaces.create(newSpace({ projectId: kept.id, name: 'S2' }))
    const b1 = await boards.create(newBoard({ spaceId: s1.id, name: 'B' }))
    const b2 = await boards.create(newBoard({ spaceId: s2.id, name: 'B' }))
    const d1 = await documents.create(newDocument({ spaceId: s1.id, title: 'D' }))

    await projects.delete(doomed.id)

    expect(await spaces.list(doomed.id)).toEqual([])
    await expect(spaces.get(s1.id)).rejects.toBeInstanceOf(NotFoundError)
    await expect(boards.get(b1.id)).rejects.toBeInstanceOf(NotFoundError)
    await expect(documents.get(d1.id)).rejects.toBeInstanceOf(NotFoundError)
    expect((await spaces.list(kept.id)).map((s) => s.id)).toEqual([s2.id])
    expect((await boards.list(s2.id)).map((b) => b.id)).toEqual([b2.id])
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
      new LocalStorageBoardRepository(full, testIdentity(), testTokens).create(newBoard({ spaceId: 's1', name: 'Board' })),
    ).rejects.toBeInstanceOf(StorageUnavailableError)
  })

  it('maps corrupted data to StorageUnavailableError', async () => {
    const store = new InMemoryKeyValueStore()
    store.setItem('tk3:board:b1', '{"broken":')
    await expect(new LocalStorageBoardRepository(store, testIdentity(), testTokens).get('b1')).rejects.toBeInstanceOf(
      StorageUnavailableError,
    )
  })
})

describe('purgeLegacyData', () => {
  it('removes only keys of the old formats (tk:, tk2:)', () => {
    const data = new Map([
      ['tk:boards:index', '[]'],
      ['tk:board:1', '{}'],
      ['tk2:spaces:index', '[]'],
      ['tk3:projects:index', '[]'],
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
    expect([...data.keys()]).toEqual(['tk3:projects:index', 'other'])
  })
})

describe('arrow bindings survive a reload', () => {
  it('a bound arrow still follows its shape after save -> get -> editor load', async () => {
    const { createEditorModel, updateLive } = await import('@/application/editor/editorModel')
    const { translateElements } = await import('@/application/editor/scene')
    const { anchorPoint, moveLinearEnd } = await import('@/domain/element/binding')
    const { absolutePoints, createLinear } = await import('@/domain/element/factory')
    const style = { strokeColor: '#000', fillColor: 'transparent', fillStyle: 'hachure' as const, strokeWidth: 2, roughness: 1 }
    const box = { id: 'box', type: 'rectangle' as const, label: '', x: 0, y: 0, width: 100, height: 50, seed: 1, style }
    const arrow = moveLinearEnd(
      createLinear({ id: 'arrow', type: 'arrow', seed: 1, style, origin: { x: 300, y: 25 } }),
      'end',
      anchorPoint(box, 'right'),
      { elementId: 'box', anchor: 'right' },
    )

    const repo = new LocalStorageBoardRepository(new InMemoryKeyValueStore(), testIdentity(), testTokens)
    const created = await repo.create(newBoard({ spaceId: 's1', name: 'B' }))
    await repo.save(replaceElements(created, [box, arrow], t0))

    // "Reload": read from storage and load into a fresh editor.
    const loaded = await repo.get(created.id)
    let model = createEditorModel(loaded.elements)
    model = updateLive(model, translateElements(model.elements, ['box'], 0, 80))

    const moved = model.elements.find((el) => el.id === 'arrow')
    expect(moved && 'endBinding' in moved ? moved.endBinding : null).toEqual({ elementId: 'box', anchor: 'right' })
    expect(moved && moved.type === 'arrow' ? absolutePoints(moved).at(-1) : null).toEqual(
      anchorPoint({ ...box, y: 80 }, 'right'),
    )
  })
})
