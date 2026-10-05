/**
 * Composition root — the ONLY module outside `infrastructure/` that knows
 * concrete adapters. Switching persistence (localStorage -> HTTP) happens here.
 */
import type { BoardRepository } from '@/application/ports/BoardRepository'
import type { DocumentRepository } from '@/application/ports/DocumentRepository'
import type { SpaceRepository } from '@/application/ports/SpaceRepository'
import {
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
import { LocalStorageBoardRepository } from '@/infrastructure/persistence/local/LocalStorageBoardRepository'
import { LocalStorageDocumentRepository } from '@/infrastructure/persistence/local/LocalStorageDocumentRepository'
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
  readonly spaces: SpaceRepository
  readonly boards: BoardRepository
  readonly documents: DocumentRepository
}

function createRepositories(config: AppConfig): Repositories {
  switch (config.persistence) {
    case 'local':
      purgeLegacyData(window.localStorage)
      return {
        spaces: new LocalStorageSpaceRepository(window.localStorage),
        boards: new LocalStorageBoardRepository(window.localStorage),
        documents: new LocalStorageDocumentRepository(window.localStorage),
      }
    case 'http':
      // const http = new FetchHttpClient(config.apiUrl)
      // return { spaces: new HttpSpaceRepository(http), boards: ..., documents: ... }
      throw new Error('HTTP persistence is not implemented yet')
  }
}

export function createContainer(config: AppConfig = readConfig()): AppDependencies {
  const { spaces, boards, documents } = createRepositories(config)
  const ids = new CryptoIdGenerator()
  const clock = new SystemClock()
  return {
    listSpaces: new ListSpaces(spaces),
    createSpace: new CreateSpace(spaces, ids, clock),
    openSpace: new OpenSpace(spaces),
    renameSpace: new RenameSpace(spaces, clock),
    deleteSpace: new DeleteSpace(spaces),

    listBoards: new ListBoards(boards),
    createBoard: new CreateBoard(boards, spaces, ids, clock),
    openBoard: new OpenBoard(boards),
    saveBoardContent: new SaveBoardContent(boards, clock),
    renameBoard: new RenameBoard(boards, clock),
    deleteBoard: new DeleteBoard(boards),

    listDocuments: new ListDocuments(documents),
    createDocument: new CreateDocument(documents, spaces, ids, clock),
    openDocument: new OpenDocument(documents),
    saveDocumentContent: new SaveDocumentContent(documents, clock),
    renameDocument: new RenameDocument(documents, clock),
    deleteDocument: new DeleteDocument(documents),

    ids,
  }
}
