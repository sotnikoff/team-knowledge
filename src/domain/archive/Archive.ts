import type { BoardId } from '../board/Board'
import type { DocumentId } from '../document/Document'
import type { RichText } from '../document/richText'
import type { DiagramElement } from '../element/types'
import type { ProjectId } from '../project/Project'
import type { SpaceId } from '../space/Space'

/**
 * Content of an export file: what a project, space, board or document
 * consists of, without versions or dates. The original ids are kept only to
 * re-link references inside the archive (document cards on boards) on import;
 * an import always creates new entities with new ids.
 */
export interface ArchivedDocument {
  readonly id: DocumentId
  readonly title: string
  readonly content: RichText
}

export interface ArchivedBoard {
  readonly id: BoardId
  readonly name: string
  readonly elements: readonly DiagramElement[]
}

export interface ArchivedSpace {
  readonly id: SpaceId
  readonly name: string
  readonly boards: readonly ArchivedBoard[]
  readonly documents: readonly ArchivedDocument[]
}

export interface ArchivedProject {
  readonly id: ProjectId
  readonly name: string
  readonly spaces: readonly ArchivedSpace[]
}

export type Archive =
  | { readonly kind: 'project'; readonly project: ArchivedProject }
  | { readonly kind: 'space'; readonly space: ArchivedSpace }
  | { readonly kind: 'board'; readonly board: ArchivedBoard }
  | { readonly kind: 'document'; readonly document: ArchivedDocument }

export type ArchiveKind = Archive['kind'] // same values as ArchiveFileKind in shared/errors

export const ARCHIVE_KINDS: readonly ArchiveKind[] = ['project', 'space', 'board', 'document']

/**
 * Points document cards at the new ids of documents imported alongside the
 * board; cards of documents outside the archive are left as they are.
 */
export function remapDocumentRefs(
  elements: readonly DiagramElement[],
  newIds: ReadonlyMap<DocumentId, DocumentId>,
): DiagramElement[] {
  return elements.map((el) => {
    const documentId = el.type === 'document' ? newIds.get(el.documentId) : undefined
    return el.type === 'document' && documentId ? { ...el, documentId } : el
  })
}
