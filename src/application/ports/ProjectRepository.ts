import type { Project, ProjectDraft, ProjectId } from '@/domain/project/Project'

/**
 * Driven port for projects — the top level, holding spaces. Mirrors the REST API:
 *
 *   list()      -> GET    /projects
 *   get(id)     -> GET    /projects/:id
 *   create(d)   -> POST   /projects        (server assigns the id)
 *   save(p)     -> PUT    /projects/:id   If-Match: p.version
 *   delete(id)  -> DELETE /projects/:id
 *
 * `delete` removes the project TOGETHER WITH its spaces and their boards and
 * documents — a server-side cascade on the backend, a single request.
 * Shared semantics: see `repository.contract.ts`.
 */
export interface ProjectRepository {
  list(): Promise<Project[]>
  get(id: ProjectId): Promise<Project>
  create(draft: ProjectDraft): Promise<Project>
  save(project: Project): Promise<Project>
  delete(id: ProjectId): Promise<void>
}
