import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Board, BoardId } from '@/domain/board/Board'
import type { SpaceId } from '@/domain/space/Space'
import { useDependencies } from '../app/dependencies'
import { queryKeys } from './queryKeys'

export function useBoardList(spaceId: SpaceId) {
  const { listBoards } = useDependencies()
  return useQuery({ queryKey: queryKeys.boards(spaceId), queryFn: () => listBoards.execute(spaceId) })
}

export function useBoard(id: BoardId) {
  const { openBoard } = useDependencies()
  return useQuery({
    queryKey: queryKeys.board(id),
    queryFn: () => openBoard.execute(id),
    // The editor owns the content while open; autosave keeps the cache fresh.
    staleTime: Infinity,
  })
}

/** Puts a board returned by a use case into the cache and refreshes its list. */
function useBoardCache() {
  const queryClient = useQueryClient()
  return (board: Board) => {
    queryClient.setQueryData(queryKeys.board(board.id), board)
    return queryClient.invalidateQueries({ queryKey: queryKeys.boards(board.spaceId), exact: true })
  }
}

export function useCreateBoard(spaceId: SpaceId) {
  const { createBoard } = useDependencies()
  const cache = useBoardCache()
  return useMutation({
    mutationFn: (name: string) => createBoard.execute({ spaceId, name }),
    onSuccess: cache,
  })
}

export function useRenameBoard() {
  const { renameBoard } = useDependencies()
  const cache = useBoardCache()
  return useMutation({
    mutationFn: (input: { id: BoardId; name: string }) => renameBoard.execute(input.id, input.name),
    onSuccess: cache,
  })
}

export function useDeleteBoard(spaceId: SpaceId) {
  const { deleteBoard } = useDependencies()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: BoardId) => deleteBoard.execute(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: queryKeys.board(id) })
      return queryClient.invalidateQueries({ queryKey: queryKeys.boards(spaceId), exact: true })
    },
  })
}
