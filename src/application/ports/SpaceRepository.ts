import type { Space, SpaceDraft, SpaceId } from '@/domain/space/Space'

/**
 * Driven port for spaces ("зарисовки"). Mirrors the REST API:
 *
 *   list()      -> GET    /spaces
 *   get(id)     -> GET    /spaces/:id
 *   create(d)   -> POST   /spaces          (server assigns the id)
 *   save(s)     -> PUT    /spaces/:id   If-Match: s.version
 *   delete(id)  -> DELETE /spaces/:id
 *
 * `delete` removes the space TOGETHER WITH all its boards and documents — on
 * the backend that is a server-side cascade, so it stays a single request.
 * Shared semantics: see `repository.contract.ts`.
 */
export interface SpaceRepository {
  list(): Promise<Space[]>
  get(id: SpaceId): Promise<Space>
  create(draft: SpaceDraft): Promise<Space>
  save(space: Space): Promise<Space>
  delete(id: SpaceId): Promise<void>
}
