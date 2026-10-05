import type { Board, BoardId, BoardSummary } from '@/domain/board/Board'

/**
 * Driven port for board persistence.
 *
 * The shape deliberately mirrors the future REST API so that the HTTP adapter
 * is a thin translation layer:
 *
 *   list()      -> GET    /boards                  (summaries, no elements)
 *   get(id)     -> GET    /boards/:id
 *   create(b)   -> POST   /boards
 *   save(b)     -> PUT    /boards/:id   If-Match: b.version
 *   delete(id)  -> DELETE /boards/:id
 *
 * Contract (verified for every adapter by `BoardRepository.contract.ts`):
 * - every method is async, even if the backing store is synchronous;
 * - returned objects are detached copies — mutating them never affects storage;
 * - `get`/`save`/`delete` of an unknown id reject with `BoardNotFoundError`;
 * - `create` of an existing id rejects with `BoardAlreadyExistsError`;
 * - `save` succeeds only if `board.version` equals the stored version, otherwise
 *   it rejects with `BoardConflictError`; on success the stored (and returned)
 *   board has `version + 1`. Callers must continue from the returned board;
 * - infrastructure failures reject with `StorageUnavailableError`.
 */
export interface BoardRepository {
  list(): Promise<BoardSummary[]>
  get(id: BoardId): Promise<Board>
  create(board: Board): Promise<Board>
  save(board: Board): Promise<Board>
  delete(id: BoardId): Promise<void>
}
