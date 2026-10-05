import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { BoardId } from '@/domain/board/Board'
import { useDependencies } from '../app/dependencies'
import { queryKeys } from './queryKeys'

export function useBoardList() {
  const { listBoards } = useDependencies()
  return useQuery({ queryKey: queryKeys.boards, queryFn: () => listBoards.execute() })
}

export function useCreateBoard() {
  const { createBoard } = useDependencies()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => createBoard.execute({ name }),
    onSuccess: (board) => {
      queryClient.setQueryData(queryKeys.board(board.id), board)
      return queryClient.invalidateQueries({ queryKey: queryKeys.boards, exact: true })
    },
  })
}

export function useRenameBoard() {
  const { renameBoard } = useDependencies()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { id: BoardId; name: string }) => renameBoard.execute(input.id, input.name),
    onSuccess: (board) => {
      queryClient.setQueryData(queryKeys.board(board.id), board)
      return queryClient.invalidateQueries({ queryKey: queryKeys.boards, exact: true })
    },
  })
}

export function useDeleteBoard() {
  const { deleteBoard } = useDependencies()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: BoardId) => deleteBoard.execute(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: queryKeys.board(id) })
      return queryClient.invalidateQueries({ queryKey: queryKeys.boards, exact: true })
    },
  })
}
