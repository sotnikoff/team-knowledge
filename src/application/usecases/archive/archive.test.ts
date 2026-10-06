import { describe, expect, it } from 'vitest'
import type { Board } from '@/domain/board/Board'
import type { Document } from '@/domain/document/Document'
import { createDocumentElement } from '@/domain/element/factory'
import { TRANSPARENT } from '@/domain/element/types'
import type { Project } from '@/domain/project/Project'
import { InvalidFileError, NotFoundError, type EntityKind } from '@/domain/shared/errors'
import type { Draft, Versioned } from '@/domain/shared/versioned'
import type { Space } from '@/domain/space/Space'
import { ExportArchive } from './ExportArchive'
import { ImportArchive } from './ImportArchive'

const style = { strokeColor: '#000', fillColor: TRANSPARENT, fillStyle: 'hachure' as const, strokeWidth: 2, roughness: 1 }
const t0 = new Date('2026-01-01T00:00:00.000Z')

/** In-memory storage with the port semantics the use cases rely on (ids on create, cascades). */
function memoryStorage() {
  let counter = 0
  function collection<T extends Versioned>(entity: EntityKind, parentOf: (item: T) => string | undefined) {
    const items = new Map<string, T>()
    return {
      items,
      failCreate: false,
      async list(parentId?: string) {
        return [...items.values()].filter((i) => parentId === undefined || parentOf(i) === parentId)
      },
      async get(id: string) {
        const item = items.get(id)
        if (!item) throw new NotFoundError(entity, id)
        return item
      },
      async create(draft: Draft<T>) {
        if (this.failCreate) throw new Error('disk full')
        const item = { ...draft, id: `${entity}-${++counter}`, version: 1, createdAt: t0, updatedAt: t0 } as T
        items.set(item.id, item)
        return item
      },
      async save(item: T) {
        return item
      },
      async delete(id: string) {
        items.delete(id)
      },
    }
  }
  const projects = collection<Project>('project', () => undefined)
  const spaces = collection<Space>('space', (s) => s.projectId)
  const boards = collection<Board>('board', (b) => b.spaceId)
  const documents = collection<Document>('document', (d) => d.spaceId)
  // Cascades, as the real repositories do.
  const deleteSpace = spaces.delete.bind(spaces)
  spaces.delete = async (id) => {
    for (const [k, b] of boards.items) if (b.spaceId === id) boards.items.delete(k)
    for (const [k, d] of documents.items) if (d.spaceId === id) documents.items.delete(k)
    await deleteSpace(id)
  }
  const deleteProject = projects.delete.bind(projects)
  projects.delete = async (id) => {
    for (const s of await spaces.list(id)) await spaces.delete(s.id)
    await deleteProject(id)
  }
  const exporter = new ExportArchive(projects, spaces, boards, documents)
  const importer = new ImportArchive(projects, spaces, boards, documents)
  return { projects, spaces, boards, documents, exporter, importer }
}

async function seed(store: ReturnType<typeof memoryStorage>) {
  const project = await store.projects.create({ name: 'Shop' })
  const space = await store.spaces.create({ projectId: project.id, name: 'Payments' })
  const doc = await store.documents.create({
    spaceId: space.id,
    title: 'API',
    content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hi' }] }] },
  })
  const card = createDocumentElement({ id: 'card', documentId: doc.id, seed: 1, style, x: 0, y: 0, width: 300 })
  await store.boards.create({ spaceId: space.id, name: 'Flow', elements: [card] })
  return { project, space, doc }
}

describe('export / import archives', () => {
  it('imports a project as a copy with new ids, cards pointing at the copied documents', async () => {
    const store = memoryStorage()
    const { project, doc } = await seed(store)
    const archive = await store.exporter.execute({ kind: 'project', id: project.id })

    const imported = await store.importer.execute(archive, { kind: 'project' })
    if (imported.kind !== 'project') throw new Error('expected a project')
    expect(imported.project.id).not.toBe(project.id)
    expect(imported.project.name).toBe('Shop')

    const [space] = await store.spaces.list(imported.project.id)
    const [copiedDoc] = await store.documents.list(space!.id)
    const [copiedBoard] = await store.boards.list(space!.id)
    expect(copiedDoc).toMatchObject({ title: 'API', content: (await store.documents.get(doc.id)).content })
    expect(copiedDoc!.id).not.toBe(doc.id)
    expect(copiedBoard!.elements[0]).toMatchObject({ type: 'document', documentId: copiedDoc!.id })
    // The original is untouched.
    expect(store.projects.items.size).toBe(2)
  })

  it('imports a space, a board and a document into the given parents', async () => {
    const store = memoryStorage()
    const { project, space, doc } = await seed(store)
    const other = await store.projects.create({ name: 'Other' })

    const spaceArchive = await store.exporter.execute({ kind: 'space', id: space.id })
    const copied = await store.importer.execute(spaceArchive, { kind: 'space', projectId: other.id })
    expect(copied).toMatchObject({ kind: 'space', space: { projectId: other.id, name: 'Payments' } })

    const docArchive = await store.exporter.execute({ kind: 'document', id: doc.id })
    const copiedDoc = await store.importer.execute(docArchive, { kind: 'document', spaceId: space.id })
    expect(copiedDoc).toMatchObject({ kind: 'document', document: { spaceId: space.id, title: 'API' } })
    expect(await store.spaces.list(project.id)).toHaveLength(1)
  })

  it('refuses a file of another level, and a missing parent', async () => {
    const store = memoryStorage()
    const { space, doc } = await seed(store)
    const docArchive = await store.exporter.execute({ kind: 'document', id: doc.id })
    await expect(store.importer.execute(docArchive, { kind: 'board', spaceId: space.id })).rejects.toMatchObject({
      reason: 'wrongKind',
      expected: 'board',
      actual: 'document',
    })
    await expect(store.importer.execute(docArchive, { kind: 'board', spaceId: space.id })).rejects.toBeInstanceOf(
      InvalidFileError,
    )
    await expect(store.importer.execute(docArchive, { kind: 'document', spaceId: 'nope' })).rejects.toBeInstanceOf(
      NotFoundError,
    )
  })

  it('removes a half-imported project when something fails', async () => {
    const store = memoryStorage()
    const { project } = await seed(store)
    const archive = await store.exporter.execute({ kind: 'project', id: project.id })
    store.boards.failCreate = true

    await expect(store.importer.execute(archive, { kind: 'project' })).rejects.toThrow('disk full')
    expect(store.projects.items.size).toBe(1)
    expect(store.spaces.items.size).toBe(1)
    expect(store.documents.items.size).toBe(1)
  })
})
