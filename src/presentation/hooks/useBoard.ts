import { useQuery } from '@tanstack/react-query'
import type { BoardId } from '@/domain/board/Board'
import { useDependencies } from '../app/dependencies'
import { queryKeys } from './queryKeys'

export function useBoard(id: BoardId) {
  const { openBoard } = useDependencies()
  return useQuery({
    queryKey: queryKeys.board(id),
    queryFn: () => openBoard.execute(id),
    // The editor owns the content while open; autosave keeps the cache fresh.
    staleTime: Infinity,
  })
}
