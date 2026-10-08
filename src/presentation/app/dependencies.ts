import { createContext, useContext } from 'react'
import type { ArchiveFormat } from '@/application/ports/ArchiveFormat'
import type { ElementClipboardFormat } from '@/application/ports/ElementClipboardFormat'
import type { IdGenerator } from '@/application/ports/IdGenerator'
import type { SessionStore } from '@/application/ports/SessionStore'
import type {
  CompleteProfile,
  CreateBoard,
  CreateDocument,
  CreateProject,
  CreateSpace,
  DeleteBoard,
  ExportArchive,
  ImportArchive,
  DeleteDocument,
  DeleteProject,
  DeleteSpace,
  GetSession,
  ListBoards,
  ListDocuments,
  ListProjects,
  ListSpaces,
  Logout,
  OpenBoard,
  OpenDocument,
  OpenProject,
  OpenSpace,
  RenameBoard,
  RenameDocument,
  RenameProject,
  RenameSpace,
  RequestLoginCode,
  SaveBoardContent,
  SaveDocumentContent,
  VerifyLoginCode,
} from '@/application/usecases'

/**
 * Everything the UI is allowed to depend on: use cases and narrow ports.
 * Components never see a repository or an adapter (Interface Segregation +
 * Dependency Inversion).
 */
export interface AppDependencies {
  /** Only to subscribe to sign-in / sign-out; reading goes through `getSession`. */
  readonly sessions: Pick<SessionStore, 'subscribe'>
  readonly getSession: GetSession
  readonly requestLoginCode: RequestLoginCode
  readonly verifyLoginCode: VerifyLoginCode
  readonly completeProfile: CompleteProfile
  readonly logout: Logout

  readonly listProjects: ListProjects
  readonly createProject: CreateProject
  readonly openProject: OpenProject
  readonly renameProject: RenameProject
  readonly deleteProject: DeleteProject

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

  /** JSON export/import of a project, space, board or document (always imported as a copy). */
  readonly exportArchive: ExportArchive
  readonly importArchive: ImportArchive
  readonly archiveFormat: ArchiveFormat

  /** Ids of board elements only; entity ids are assigned by the repositories. */
  readonly ids: IdGenerator
  /** Board elements as clipboard text (copy/paste between boards and tabs). */
  readonly clipboard: ElementClipboardFormat
}

export const DependenciesContext = createContext<AppDependencies | null>(null)

export function useDependencies(): AppDependencies {
  const deps = useContext(DependenciesContext)
  if (!deps) throw new Error('useDependencies must be used inside <DependenciesProvider>')
  return deps
}
