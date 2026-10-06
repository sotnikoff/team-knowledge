import { describe, expect, it } from 'vitest'
import type { Board } from '@/domain/board/Board'
import type { Document } from '@/domain/document/Document'
import { NotFoundError } from '@/domain/shared/errors'
import type { Project } from '@/domain/project/Project'
import type { Space } from '@/domain/space/Space'
import type { BoardRepository } from '../ports/BoardRepository'
import type { DocumentRepository } from '../ports/DocumentRepository'
import type { ProjectRepository } from '../ports/ProjectRepository'
import type { SpaceRepository } from '../ports/SpaceRepository'
import { CreateBoard, CreateDocument, CreateProject, CreateSpace } from './index'

/** Minimal in-memory fakes: use cases are tested without any adapter. */
function memoryRepo<T extends { id: string }>() {
  const items = new Map<string, T>()
  return {
    items,
    list: async () => [...items.values()],
    get: async (id: string) => {
      const item = items.get(id)
      if (!item) throw new NotFoundError('space', id)
      return item
    },
    // Plays the storage: the id is assigned on create.
    create: async (draft: Omit<T, 'id'>) => {
      const item = { ...draft, id: `id-${++counter}` } as T
      items.set(item.id, item)
      return item
    },
    save: async (item: T) => item,
    delete: async (id: string) => void items.delete(id),
  }
}

let counter = 0

describe('creating content in a space', () => {
  it('creates boards and documents inside an existing space', async () => {
    const projects = memoryRepo<Project>()
    const spaces = memoryRepo<Space>()
    const boards = memoryRepo<Board>()
    const documents = memoryRepo<Document>()
    const project = await new CreateProject(projects as ProjectRepository).execute({ name: 'Shop' })
    const space = await new CreateSpace(spaces as SpaceRepository, projects as ProjectRepository).execute({
      projectId: project.id,
      name: 'Arch',
    })
    expect(space.projectId).toBe(project.id)

    const board = await new CreateBoard(boards as BoardRepository, spaces as SpaceRepository).execute({
      spaceId: space.id,
      name: 'Flow',
    })
    const doc = await new CreateDocument(documents as DocumentRepository, spaces as SpaceRepository).execute(
      { spaceId: space.id, title: 'Notes' },
    )

    expect(board.spaceId).toBe(space.id)
    expect(doc.spaceId).toBe(space.id)
    expect(doc.content.type).toBe('doc')
  })

  it('refuses to create a space in a missing project', async () => {
    const spaces = memoryRepo<Space>()
    const create = new CreateSpace(spaces as SpaceRepository, memoryRepo<Project>() as ProjectRepository)
    await expect(create.execute({ projectId: 'nope', name: 'x' })).rejects.toBeInstanceOf(NotFoundError)
    expect(spaces.items.size).toBe(0)
  })

  it('refuses to create a board in a missing space', async () => {
    const boards = memoryRepo<Board>()
    const create = new CreateBoard(boards as BoardRepository, memoryRepo<Space>() as SpaceRepository)
    await expect(create.execute({ spaceId: 'nope', name: 'x' })).rejects.toBeInstanceOf(NotFoundError)
    expect(boards.items.size).toBe(0)
  })
})
