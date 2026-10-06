import type { BoardRepository } from '@/application/ports/BoardRepository'
import { toSummary, type Board, type BoardDraft, type BoardId, type BoardSummary } from '@/domain/board/Board'
import type { SpaceId } from '@/domain/space/Space'
import { boardFromDto, boardToDto, summaryFromDto, summaryToDto } from '../dto/boardMapper'
import type { KeyValueStore } from './KeyValueStore'
import { LocalCollection, type LocalIdentity } from './LocalCollection'
import { DEFAULT_PREFIX } from './prefix'

export function boardCollection(store: KeyValueStore, prefix: string, identity: LocalIdentity) {
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
    identity,
  )
}

export class LocalStorageBoardRepository implements BoardRepository {
  private readonly boards: LocalCollection<Board, BoardSummary>

  /** `identity` assigns ids/timestamps of created boards — a localStorage-only concern. */
  constructor(store: KeyValueStore, identity: LocalIdentity, prefix = DEFAULT_PREFIX) {
    this.boards = boardCollection(store, prefix, identity)
  }

  async list(spaceId: SpaceId): Promise<BoardSummary[]> {
    return this.boards.list().filter((b) => b.spaceId === spaceId)
  }

  async get(id: BoardId): Promise<Board> {
    return this.boards.get(id)
  }

  async create(draft: BoardDraft): Promise<Board> {
    return this.boards.create(draft)
  }

  async save(board: Board): Promise<Board> {
    return this.boards.save(board)
  }

  async delete(id: BoardId): Promise<void> {
    this.boards.delete(id)
  }
}
