import type { BoardId } from '@/domain/board/Board'

export const queryKeys = {
  boards: ['boards'] as const,
  board: (id: BoardId) => ['boards', id] as const,
}
