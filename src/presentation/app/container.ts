/**
 * Composition root — the ONLY module outside `infrastructure/` that knows
 * concrete adapters. Switching persistence (localStorage -> HTTP) happens here.
 */
import type { BoardRepository } from '@/application/ports/BoardRepository'
import type { DocumentRepository } from '@/application/ports/DocumentRepository'
import type { ProjectRepository } from '@/application/ports/ProjectRepository'
import type { SpaceRepository } from '@/application/ports/SpaceRepository'
import {
  CreateBoard,
  CreateDocument,
  CreateProject,
  CreateSpace,
  DeleteBoard,
  DeleteDocument,
  DeleteProject,
  DeleteSpace,
  ListBoards,
  ListDocuments,
  ListProjects,
  ListSpaces,
  OpenBoard,
  OpenDocument,
  OpenProject,
  OpenSpace,
  RenameBoard,
  RenameDocument,
  RenameProject,
  RenameSpace,
  SaveBoardContent,
  SaveDocumentContent,
} from '@/application/usecases'
import { LocalStorageBoardRepository } from '@/infrastructure/persistence/local/LocalStorageBoardRepository'
import { LocalStorageDocumentRepository } from '@/infrastructure/persistence/local/LocalStorageDocumentRepository'
import { LocalStorageProjectRepository } from '@/infrastructure/persistence/local/LocalStorageProjectRepository'
import { LocalStorageSpaceRepository } from '@/infrastructure/persistence/local/LocalStorageSpaceRepository'
import { purgeLegacyData } from '@/infrastructure/persistence/local/prefix'
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

interface Repositories {
  readonly projects: ProjectRepository
  readonly spaces: SpaceRepository
  readonly boards: BoardRepository
  readonly documents: DocumentRepository
}

function createRepositories(config: AppConfig): Repositories {
  switch (config.persistence) {
    case 'local': {
      purgeLegacyData(window.localStorage)
      // localStorage has no server to assign ids/timestamps of new entities, so
      // the adapter does it itself. The HTTP adapters will not need this.
      const identity = { ids: new CryptoIdGenerator(), clock: new SystemClock() }
      return {
        projects: new LocalStorageProjectRepository(window.localStorage, identity),
        spaces: new LocalStorageSpaceRepository(window.localStorage, identity),
        boards: new LocalStorageBoardRepository(window.localStorage, identity),
        documents: new LocalStorageDocumentRepository(window.localStorage, identity),
      }
    }
    case 'http':
      // const http = new FetchHttpClient(config.apiUrl)
      // return { projects: new HttpProjectRepository(http), spaces: ..., boards: ..., documents: ... }
      throw new Error('HTTP persistence is not implemented yet')
  }
}

export function createContainer(config: AppConfig = readConfig()): AppDependencies {
  const { projects, spaces, boards, documents } = createRepositories(config)
  // Ids of board elements (shapes, arrows…), created by the drawing tools.
  const ids = new CryptoIdGenerator()
  const clock = new SystemClock()
  return {
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
  }
}
