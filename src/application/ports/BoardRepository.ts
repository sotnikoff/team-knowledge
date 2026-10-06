import type { Board, BoardDraft, BoardId, BoardSummary } from '@/domain/board/Board'
import type { SpaceId } from '@/domain/space/Space'

/**
 * Driven port for board persistence. Mirrors the REST API:
 *
 *   list(spaceId) -> GET    /spaces/:spaceId/boards   (summaries, no elements)
 *   get(id)       -> GET    /boards/:id
 *   create(draft) -> POST   /spaces/:spaceId/boards     (server assigns the id)
 *   save(b)       -> PUT    /boards/:id   If-Match: b.version
 *   delete(id)    -> DELETE /boards/:id
 *
 * Shared semantics of all repositories are documented (and verified for every
 * adapter) in `repository.contract.ts`.
 */
export interface BoardRepository {
  list(spaceId: SpaceId): Promise<BoardSummary[]>
  get(id: BoardId): Promise<Board>
  create(draft: BoardDraft): Promise<Board>
  save(board: Board): Promise<Board>
  delete(id: BoardId): Promise<void>
}
