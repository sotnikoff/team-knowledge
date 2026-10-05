import type { BoardRepository } from '@/application/ports/BoardRepository'
import { toSummary, type Board, type BoardId, type BoardSummary } from '@/domain/board/Board'
import type { SpaceId } from '@/domain/space/Space'
import { boardFromDto, boardToDto, summaryFromDto, summaryToDto } from '../dto/boardMapper'
import type { KeyValueStore } from './KeyValueStore'
import { LocalCollection } from './LocalCollection'
import { DEFAULT_PREFIX } from './prefix'

export function boardCollection(store: KeyValueStore, prefix: string) {
  return new LocalCollection<Board, BoardSummary>(
    store,
    { index: `${prefix}:boards:index`, item: (id) => `${prefix}:board:${id}` },
    {
      entity: 'board',
      toDto: boardToDto,
      fromDto: boardFromDto,
      toIndexEntry: (board) => summaryToDto(toSummary(board)),
      summaryFromDto,
    },
  )
}

export class LocalStorageBoardRepository implements BoardRepository {
  private readonly boards: LocalCollection<Board, BoardSummary>

  constructor(store: KeyValueStore, prefix = DEFAULT_PREFIX) {
    this.boards = boardCollection(store, prefix)
  }

  async list(spaceId: SpaceId): Promise<BoardSummary[]> {
    return this.boards.list().filter((b) => b.spaceId === spaceId)
  }

  async get(id: BoardId): Promise<Board> {
    return this.boards.get(id)
  }

  async create(board: Board): Promise<Board> {
    return this.boards.create(board)
  }

  async save(board: Board): Promise<Board> {
    return this.boards.save(board)
  }

  async delete(id: BoardId): Promise<void> {
    this.boards.delete(id)
  }
}
