import { createContext, useContext } from 'react'
import type { IdGenerator } from '@/application/ports/IdGenerator'
import type {
  CreateBoard,
  DeleteBoard,
  ListBoards,
  OpenBoard,
  RenameBoard,
  SaveBoardContent,
} from '@/application/usecases'

/**
 * Everything the UI is allowed to depend on: use cases and narrow ports.
 * Components never see a repository or an adapter (Interface Segregation +
 * Dependency Inversion).
 */
export interface AppDependencies {
  readonly listBoards: ListBoards
  readonly createBoard: CreateBoard
  readonly openBoard: OpenBoard
  readonly saveBoardContent: SaveBoardContent
  readonly renameBoard: RenameBoard
  readonly deleteBoard: DeleteBoard
  readonly ids: IdGenerator
}

export const DependenciesContext = createContext<AppDependencies | null>(null)

export function useDependencies(): AppDependencies {
  const deps = useContext(DependenciesContext)
  if (!deps) throw new Error('useDependencies must be used inside <DependenciesProvider>')
  return deps
}
