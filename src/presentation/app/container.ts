/**
 * Composition root — the ONLY module outside `infrastructure/` that knows
 * concrete adapters. Switching persistence (localStorage -> HTTP) happens here.
 */
import type { AccessTokenProvider } from '@/application/ports/AccessTokenProvider'
import type { AuthGateway } from '@/application/ports/AuthGateway'
import type { BoardRepository } from '@/application/ports/BoardRepository'
import type { DocumentRepository } from '@/application/ports/DocumentRepository'
import type { ProjectRepository } from '@/application/ports/ProjectRepository'
import type { SpaceRepository } from '@/application/ports/SpaceRepository'
import {
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
import { LocalAuthGateway } from '@/infrastructure/auth/LocalAuthGateway'
import { LocalStorageSessionStore } from '@/infrastructure/auth/LocalStorageSessionStore'
import { LocalStorageBoardRepository } from '@/infrastructure/persistence/local/LocalStorageBoardRepository'
import { LocalStorageDocumentRepository } from '@/infrastructure/persistence/local/LocalStorageDocumentRepository'
import { LocalStorageProjectRepository } from '@/infrastructure/persistence/local/LocalStorageProjectRepository'
import { LocalStorageSpaceRepository } from '@/infrastructure/persistence/local/LocalStorageSpaceRepository'
import { purgeLegacyData } from '@/infrastructure/persistence/local/prefix'
import { JsonArchiveFormat } from '@/infrastructure/archive/JsonArchiveFormat'
import { JsonElementClipboardFormat } from '@/infrastructure/clipboard/JsonElementClipboardFormat'
import { CryptoIdGenerator } from '@/infrastructure/system/CryptoIdGenerator'
import { SystemClock } from '@/infrastructure/system/SystemClock'
import type { AppDependencies } from './dependencies'

export interface AppConfig {
  readonly persistence: 'local' | 'http'
  readonly apiUrl?: string
}

export function readConfig(env: ImportMetaEnv = import.meta.env): AppConfig {
  const persistence = env.VITE_PERSISTENCE ?? 'local'
  if (persistence !== 'local' && persistence !== 'http') {
    throw new Error(`Unknown VITE_PERSISTENCE "${persistence}"`)
  }
  return { persistence, apiUrl: env.VITE_API_URL }
}

/** Everything that talks to the backend (or plays it, in local mode). */
interface Repositories {
  readonly auth: AuthGateway
  readonly projects: ProjectRepository
  readonly spaces: SpaceRepository
  readonly boards: BoardRepository
  readonly documents: DocumentRepository
}

/** `tokens` is the current access token; every adapter gets it (HTTP sends it, local ignores it). */
function createRepositories(config: AppConfig, tokens: AccessTokenProvider): Repositories {
  switch (config.persistence) {
    case 'local': {
      purgeLegacyData(window.localStorage)
      // localStorage has no server to assign ids/timestamps of new entities, so
      // the adapter does it itself. The HTTP adapters will not need this.
      const identity = { ids: new CryptoIdGenerator(), clock: new SystemClock() }
      return {
        // No mail in local mode: any 6-digit code but 000000 signs in.
        auth: new LocalAuthGateway(window.localStorage, identity, tokens),
        projects: new LocalStorageProjectRepository(window.localStorage, identity, tokens),
        spaces: new LocalStorageSpaceRepository(window.localStorage, identity, tokens),
        boards: new LocalStorageBoardRepository(window.localStorage, identity, tokens),
        documents: new LocalStorageDocumentRepository(window.localStorage, identity, tokens),
      }
    }
    case 'http':
      // const http = new FetchHttpClient(config.apiUrl, tokens) // adds `Authorization: Bearer`
      // return { auth: new HttpAuthGateway(http), projects: new HttpProjectRepository(http), spaces: ..., boards: ..., documents: ... }
      throw new Error('HTTP persistence is not implemented yet')
  }
}

export function createContainer(config: AppConfig = readConfig()): AppDependencies {
  // The session is client state: kept in this browser with any backend.
  const sessions = new LocalStorageSessionStore(window.localStorage, window)
  const { auth, projects, spaces, boards, documents } = createRepositories(config, sessions)
  // Ids of board elements (shapes, arrows…), created by the drawing tools.
  const ids = new CryptoIdGenerator()
  const clock = new SystemClock()
  return {
    sessions,
    getSession: new GetSession(sessions, clock),
    requestLoginCode: new RequestLoginCode(auth),
    verifyLoginCode: new VerifyLoginCode(auth, sessions),
    completeProfile: new CompleteProfile(auth, sessions),
    logout: new Logout(sessions),

    listProjects: new ListProjects(projects),
    createProject: new CreateProject(projects),
    openProject: new OpenProject(projects),
    renameProject: new RenameProject(projects, clock),
    deleteProject: new DeleteProject(projects),

    listSpaces: new ListSpaces(spaces),
    createSpace: new CreateSpace(spaces, projects),
    openSpace: new OpenSpace(spaces),
    renameSpace: new RenameSpace(spaces, clock),
    deleteSpace: new DeleteSpace(spaces),

    listBoards: new ListBoards(boards),
    createBoard: new CreateBoard(boards, spaces),
    openBoard: new OpenBoard(boards),
    saveBoardContent: new SaveBoardContent(boards, clock),
    renameBoard: new RenameBoard(boards, clock),
    deleteBoard: new DeleteBoard(boards),

    listDocuments: new ListDocuments(documents),
    createDocument: new CreateDocument(documents, spaces),
    openDocument: new OpenDocument(documents),
    saveDocumentContent: new SaveDocumentContent(documents, clock),
    renameDocument: new RenameDocument(documents, clock),
    deleteDocument: new DeleteDocument(documents),

    ids,
    exportArchive: new ExportArchive(projects, spaces, boards, documents),
    importArchive: new ImportArchive(projects, spaces, boards, documents),
    archiveFormat: new JsonArchiveFormat(),

    clipboard: new JsonElementClipboardFormat(),
  }
}
