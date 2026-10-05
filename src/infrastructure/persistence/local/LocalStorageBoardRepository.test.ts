import { describe, expect, it } from 'vitest'
import { runBoardRepositoryContract } from '@/application/ports/BoardRepository.contract'
import { createBoard } from '@/domain/board/Board'
import { StorageUnavailableError } from '@/domain/shared/errors'
import { InMemoryKeyValueStore, type KeyValueStore } from './KeyValueStore'
import { LocalStorageBoardRepository } from './LocalStorageBoardRepository'

runBoardRepositoryContract(
  'LocalStorageBoardRepository',
  () => new LocalStorageBoardRepository(new InMemoryKeyValueStore()),
)

describe('LocalStorageBoardRepository specifics', () => {
  const board = createBoard({ id: 'b1', name: 'Board', now: new Date('2026-01-01T00:00:00Z') })

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
    store.setItem('tk:board:b1', '{"broken":')
    await expect(new LocalStorageBoardRepository(store).get('b1')).rejects.toBeInstanceOf(
      StorageUnavailableError,
    )
  })
})
