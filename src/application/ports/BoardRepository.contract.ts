import { beforeEach, describe, expect, it } from 'vitest'
import { createBoard, replaceElements, type Board } from '@/domain/board/Board'
import {
  BoardAlreadyExistsError,
  BoardConflictError,
  BoardNotFoundError,
} from '@/domain/shared/errors'
import { TRANSPARENT, type DiagramElement } from '@/domain/element/types'
import type { BoardRepository } from './BoardRepository'

/**
 * Behavioural contract every `BoardRepository` adapter must satisfy
 * (Liskov: adapters are interchangeable). Call it from the adapter's test file:
 *
 *   runBoardRepositoryContract('LocalStorage', () => new LocalStorageBoardRepository(...))
 */
export function runBoardRepositoryContract(
  name: string,
  makeRepository: () => BoardRepository | Promise<BoardRepository>,
): void {
  describe(`BoardRepository contract: ${name}`, () => {
    let repo: BoardRepository
    const t0 = new Date('2026-01-01T00:00:00.000Z')
    const t1 = new Date('2026-01-02T00:00:00.000Z')
    const element: DiagramElement = {
      id: 'e1',
      type: 'rectangle',
      label: '',
      x: 1,
      y: 2,
      width: 3,
      height: 4,
      seed: 42,
      style: { strokeColor: '#000', fillColor: TRANSPARENT, strokeWidth: 2, roughness: 1 },
    }
    const newBoard = (id = 'b1', name = 'First'): Board => createBoard({ id, name, now: t0 })

    beforeEach(async () => {
      repo = await makeRepository()
    })

    it('starts empty', async () => {
      expect(await repo.list()).toEqual([])
    })

    it('creates and reads back a board', async () => {
      const created = await repo.create(newBoard())
      expect(created).toEqual(newBoard())
      expect(await repo.get('b1')).toEqual(newBoard())
    })

    it('lists summaries without elements', async () => {
      await repo.create(newBoard('b1', 'One'))
      await repo.create(newBoard('b2', 'Two'))
      const list = await repo.list()
      expect(list.map((b) => b.name).sort()).toEqual(['One', 'Two'])
      expect(list[0]).not.toHaveProperty('elements')
      expect(list[0]?.createdAt).toBeInstanceOf(Date)
    })

    it('rejects duplicate creation', async () => {
      await repo.create(newBoard())
      await expect(repo.create(newBoard())).rejects.toBeInstanceOf(BoardAlreadyExistsError)
    })

    it('rejects unknown ids', async () => {
      await expect(repo.get('nope')).rejects.toBeInstanceOf(BoardNotFoundError)
      await expect(repo.save(newBoard('nope'))).rejects.toBeInstanceOf(BoardNotFoundError)
      await expect(repo.delete('nope')).rejects.toBeInstanceOf(BoardNotFoundError)
    })

    it('saves content and bumps the version', async () => {
      const created = await repo.create(newBoard())
      const saved = await repo.save(replaceElements(created, [element], t1))
      expect(saved.version).toBe(created.version + 1)
      expect(saved.elements).toEqual([element])
      expect(saved.updatedAt).toEqual(t1)
      expect(await repo.get('b1')).toEqual(saved)
      const [summary] = await repo.list()
      expect(summary?.version).toBe(saved.version)
      expect(summary?.updatedAt).toEqual(t1)
    })

    it('rejects a save based on a stale version', async () => {
      const created = await repo.create(newBoard())
      await repo.save(created)
      await expect(repo.save(created)).rejects.toBeInstanceOf(BoardConflictError)
    })

    it('returns detached copies', async () => {
      const created = await repo.create(newBoard())
      ;(created as { name: string }).name = 'mutated'
      const read = await repo.get('b1')
      expect(read.name).toBe('First')
    })

    it('deletes a board', async () => {
      await repo.create(newBoard())
      await repo.delete('b1')
      expect(await repo.list()).toEqual([])
      await expect(repo.get('b1')).rejects.toBeInstanceOf(BoardNotFoundError)
    })
  })
}
