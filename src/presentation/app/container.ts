/**
 * Composition root — the ONLY module outside `infrastructure/` that knows
 * concrete adapters. Switching persistence (localStorage -> HTTP) happens here.
 */
import type { BoardRepository } from '@/application/ports/BoardRepository'
import {
  CreateBoard,
  DeleteBoard,
  ListBoards,
  OpenBoard,
  RenameBoard,
  SaveBoardContent,
} from '@/application/usecases'
import { LocalStorageBoardRepository } from '@/infrastructure/persistence/local/LocalStorageBoardRepository'
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

function createBoardRepository(config: AppConfig): BoardRepository {
  switch (config.persistence) {
    case 'local':
      return new LocalStorageBoardRepository(window.localStorage)
    case 'http':
      // return new HttpBoardRepository(new FetchHttpClient(config.apiUrl))
      throw new Error('HTTP persistence is not implemented yet')
  }
}

export function createContainer(config: AppConfig = readConfig()): AppDependencies {
  const boards = createBoardRepository(config)
  const ids = new CryptoIdGenerator()
  const clock = new SystemClock()
  return {
    listBoards: new ListBoards(boards),
    createBoard: new CreateBoard(boards, ids, clock),
    openBoard: new OpenBoard(boards),
    saveBoardContent: new SaveBoardContent(boards, clock),
    renameBoard: new RenameBoard(boards, clock),
    deleteBoard: new DeleteBoard(boards),
    ids,
  }
}
