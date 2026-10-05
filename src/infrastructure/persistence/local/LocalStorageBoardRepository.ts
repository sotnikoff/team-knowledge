import type { BoardRepository } from '@/application/ports/BoardRepository'
import { toSummary, type Board, type BoardId, type BoardSummary } from '@/domain/board/Board'
import {
  BoardAlreadyExistsError,
  BoardConflictError,
  BoardNotFoundError,
  StorageUnavailableError,
} from '@/domain/shared/errors'
import type { BoardSummaryDto } from '../dto/BoardDto'
import { boardFromDto, boardToDto, summaryFromDto, summaryToDto } from '../dto/boardMapper'
import type { KeyValueStore } from './KeyValueStore'

/**
 * Stores boards the same way the REST API will expose them: an index of
 * summaries (`GET /boards`) plus one document per board (`GET /boards/:id`).
 */
export class LocalStorageBoardRepository implements BoardRepository {
  private readonly store: KeyValueStore
  private readonly prefix: string

  constructor(store: KeyValueStore, prefix = 'tk') {
    this.store = store
    this.prefix = prefix
  }

  async list(): Promise<BoardSummary[]> {
    return this.readIndex().map(summaryFromDto)
  }

  async get(id: BoardId): Promise<Board> {
    const raw = this.read(this.boardKey(id))
    if (raw === null) throw new BoardNotFoundError(id)
    return this.parse(() => boardFromDto(raw))
  }

  async create(board: Board): Promise<Board> {
    if (this.read(this.boardKey(board.id)) !== null) throw new BoardAlreadyExistsError(board.id)
    this.write(board)
    return this.get(board.id)
  }

  async save(board: Board): Promise<Board> {
    const stored = await this.get(board.id)
    if (stored.version !== board.version) throw new BoardConflictError(board.id)
    this.write({ ...board, version: stored.version + 1 })
    return this.get(board.id)
  }

  async delete(id: BoardId): Promise<void> {
    if (this.read(this.boardKey(id)) === null) throw new BoardNotFoundError(id)
    this.guard(() => {
      this.store.removeItem(this.boardKey(id))
      this.writeIndex(this.readIndex().filter((s) => s.id !== id))
    })
  }

  // ---------- internals ----------

  private get indexKey(): string {
    return `${this.prefix}:boards:index`
  }

  private boardKey(id: BoardId): string {
    return `${this.prefix}:board:${id}`
  }

  private write(board: Board): void {
    const summary = summaryToDto(toSummary(board))
    const index = this.readIndex().filter((s) => s.id !== board.id)
    this.guard(() => {
      this.store.setItem(this.boardKey(board.id), JSON.stringify(boardToDto(board)))
      this.writeIndex([...index, summary])
    })
  }

  private readIndex(): BoardSummaryDto[] {
    const raw = this.read(this.indexKey)
    if (raw === null) return []
    if (!Array.isArray(raw)) throw new StorageUnavailableError('Board index is corrupted')
    return raw as BoardSummaryDto[]
  }

  private writeIndex(index: BoardSummaryDto[]): void {
    this.store.setItem(this.indexKey, JSON.stringify(index))
  }

  /** Reads and JSON-parses a key; `null` if absent. */
  private read(key: string): unknown {
    const text = this.guard(() => this.store.getItem(key))
    if (text === null) return null
    return this.parse(() => JSON.parse(text) as unknown)
  }

  /** Translates storage failures (quota, disabled storage) into a domain error. */
  private guard<T>(action: () => T): T {
    try {
      return action()
    } catch (error) {
      throw new StorageUnavailableError('Local storage is unavailable', { cause: error })
    }
  }

  /** Translates malformed data into a domain error. */
  private parse<T>(action: () => T): T {
    try {
      return action()
    } catch (error) {
      throw new StorageUnavailableError('Stored board data is corrupted', { cause: error })
    }
  }
}
