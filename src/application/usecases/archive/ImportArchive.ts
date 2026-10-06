import { remapDocumentRefs, type Archive, type ArchivedSpace } from '@/domain/archive/Archive'
import type { Board } from '@/domain/board/Board'
import { newBoard } from '@/domain/board/Board'
import { newDocument, type Document, type DocumentId } from '@/domain/document/Document'
import { newProject, type Project, type ProjectId } from '@/domain/project/Project'
import { InvalidFileError } from '@/domain/shared/errors'
import { newSpace, type Space, type SpaceId } from '@/domain/space/Space'
import type { BoardRepository } from '../../ports/BoardRepository'
import type { DocumentRepository } from '../../ports/DocumentRepository'
import type { ProjectRepository } from '../../ports/ProjectRepository'
import type { SpaceRepository } from '../../ports/SpaceRepository'

/** Where an archive goes: a project to the top level, the rest into an existing parent. */
export type ImportTarget =
  | { readonly kind: 'project' }
  | { readonly kind: 'space'; readonly projectId: ProjectId }
  | { readonly kind: 'board'; readonly spaceId: SpaceId }
  | { readonly kind: 'document'; readonly spaceId: SpaceId }

export type Imported =
  | { readonly kind: 'project'; readonly project: Project }
  | { readonly kind: 'space'; readonly space: Space }
  | { readonly kind: 'board'; readonly board: Board }
  | { readonly kind: 'document'; readonly document: Document }

/**
 * Creates a copy of an archive: new entities with new ids, nothing is
 * overwritten. Inside a space documents are created first, so document cards
 * on the boards can point at the copies. If anything fails half-way, what was
 * created is deleted again (the cascade removes the children).
 */
export class ImportArchive {
  private readonly projects: ProjectRepository
  private readonly spaces: SpaceRepository
  private readonly boards: BoardRepository
  private readonly documents: DocumentRepository

  constructor(
    projects: ProjectRepository,
    spaces: SpaceRepository,
    boards: BoardRepository,
    documents: DocumentRepository,
  ) {
    this.projects = projects
    this.spaces = spaces
    this.boards = boards
    this.documents = documents
  }

  async execute(archive: Archive, target: ImportTarget): Promise<Imported> {
    switch (target.kind) {
      case 'project': {
        const archived = expectKind(archive, 'project').project
        const project = await this.projects.create(newProject({ name: archived.name }))
        await this.undoOnFailure(
          () => this.projects.delete(project.id),
          async () => {
            for (const space of archived.spaces) await this.copySpace(space, project.id)
          },
        )
        return { kind: 'project', project }
      }
      case 'space': {
        const archived = expectKind(archive, 'space').space
        await this.projects.get(target.projectId) // NotFoundError if the project is gone
        return { kind: 'space', space: await this.copySpace(archived, target.projectId) }
      }
      case 'board': {
        const archived = expectKind(archive, 'board').board
        await this.spaces.get(target.spaceId)
        // A lone board keeps its document cards as they are (they may point to documents of its old space).
        const draft = { ...newBoard({ spaceId: target.spaceId, name: archived.name }), elements: archived.elements }
        return { kind: 'board', board: await this.boards.create(draft) }
      }
      case 'document': {
        const archived = expectKind(archive, 'document').document
        await this.spaces.get(target.spaceId)
        const draft = { ...newDocument({ spaceId: target.spaceId, title: archived.title }), content: archived.content }
        return { kind: 'document', document: await this.documents.create(draft) }
      }
    }
  }

  private async copySpace(archived: ArchivedSpace, projectId: ProjectId): Promise<Space> {
    const space = await this.spaces.create(newSpace({ projectId, name: archived.name }))
    await this.undoOnFailure(
      () => this.spaces.delete(space.id),
      async () => {
        const newDocumentIds = new Map<DocumentId, DocumentId>()
        for (const doc of archived.documents) {
          const draft = { ...newDocument({ spaceId: space.id, title: doc.title }), content: doc.content }
          newDocumentIds.set(doc.id, (await this.documents.create(draft)).id)
        }
        for (const board of archived.boards) {
          const elements = remapDocumentRefs(board.elements, newDocumentIds)
          await this.boards.create({ ...newBoard({ spaceId: space.id, name: board.name }), elements })
        }
      },
    )
    return space
  }

  /** Runs `work`; on failure removes what was created (best effort) and rethrows the original error. */
  private async undoOnFailure(undo: () => Promise<void>, work: () => Promise<void>): Promise<void> {
    try {
      await work()
    } catch (error) {
      await undo().catch(() => {}) // the original error is what the user must see
      throw error
    }
  }
}

/** The archive if it holds the expected level; otherwise the file does not belong here. */
function expectKind<K extends Archive['kind']>(archive: Archive, kind: K): Extract<Archive, { kind: K }> {
  if (archive.kind !== kind) throw new InvalidFileError('wrongKind', { expected: kind, actual: archive.kind })
  return archive as Extract<Archive, { kind: K }>
}
