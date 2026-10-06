import type { BoardId } from '@/domain/board/Board'
import type { DocumentId } from '@/domain/document/Document'
import type { ProjectId } from '@/domain/project/Project'
import type { SpaceId } from '@/domain/space/Space'

export const queryKeys = {
  projects: ['projects'] as const,
  project: (id: ProjectId) => ['projects', id] as const,
  spaces: (projectId: ProjectId) => ['projects', projectId, 'spaces'] as const,
  space: (id: SpaceId) => ['spaces', id] as const,
  boards: (spaceId: SpaceId) => ['spaces', spaceId, 'boards'] as const,
  board: (id: BoardId) => ['boards', id] as const,
  documents: (spaceId: SpaceId) => ['spaces', spaceId, 'documents'] as const,
  document: (id: DocumentId) => ['documents', id] as const,
}
