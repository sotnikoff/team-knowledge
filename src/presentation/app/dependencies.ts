import { createContext, useContext } from 'react'
import type { IdGenerator } from '@/application/ports/IdGenerator'
import type {
  CreateBoard,
  CreateDocument,
  CreateSpace,
  DeleteBoard,
  DeleteDocument,
  DeleteSpace,
  ListBoards,
  ListDocuments,
  ListSpaces,
  OpenBoard,
  OpenDocument,
  OpenSpace,
  RenameBoard,
  RenameDocument,
  RenameSpace,
  SaveBoardContent,
  SaveDocumentContent,
} from '@/application/usecases'

/**
 * Everything the UI is allowed to depend on: use cases and narrow ports.
 * Components never see a repository or an adapter (Interface Segregation +
 * Dependency Inversion).
 */
export interface AppDependencies {
  readonly listSpaces: ListSpaces
  readonly createSpace: CreateSpace
  readonly openSpace: OpenSpace
  readonly renameSpace: RenameSpace
  readonly deleteSpace: DeleteSpace

  readonly listBoards: ListBoards
  readonly createBoard: CreateBoard
  readonly openBoard: OpenBoard
  readonly saveBoardContent: SaveBoardContent
  readonly renameBoard: RenameBoard
  readonly deleteBoard: DeleteBoard

  readonly listDocuments: ListDocuments
  readonly createDocument: CreateDocument
  readonly openDocument: OpenDocument
  readonly saveDocumentContent: SaveDocumentContent
  readonly renameDocument: RenameDocument
  readonly deleteDocument: DeleteDocument

  /** Ids of board elements only; entity ids are assigned by the repositories. */
  readonly ids: IdGenerator
}

export const DependenciesContext = createContext<AppDependencies | null>(null)

export function useDependencies(): AppDependencies {
  const deps = useContext(DependenciesContext)
  if (!deps) throw new Error('useDependencies must be used inside <DependenciesProvider>')
  return deps
}
