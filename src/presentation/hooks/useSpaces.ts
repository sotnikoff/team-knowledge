import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ProjectId } from '@/domain/project/Project'
import type { SpaceId } from '@/domain/space/Space'
import { useDependencies } from '../app/dependencies'
import { queryKeys } from './queryKeys'

export function useSpaceList(projectId: ProjectId) {
  const { listSpaces } = useDependencies()
  return useQuery({ queryKey: queryKeys.spaces(projectId), queryFn: () => listSpaces.execute(projectId) })
}

export function useSpace(id: SpaceId) {
  const { openSpace } = useDependencies()
  return useQuery({ queryKey: queryKeys.space(id), queryFn: () => openSpace.execute(id) })
}

export function useCreateSpace(projectId: ProjectId) {
  const { createSpace } = useDependencies()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => createSpace.execute({ projectId, name }),
    onSuccess: (space) => {
      queryClient.setQueryData(queryKeys.space(space.id), space)
      return queryClient.invalidateQueries({ queryKey: queryKeys.spaces(projectId), exact: true })
    },
  })
}

export function useRenameSpace() {
  const { renameSpace } = useDependencies()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { id: SpaceId; name: string }) => renameSpace.execute(input.id, input.name),
    onSuccess: (space) => {
      queryClient.setQueryData(queryKeys.space(space.id), space)
      return queryClient.invalidateQueries({ queryKey: queryKeys.spaces(space.projectId), exact: true })
    },
  })
}

export function useDeleteSpace(projectId: ProjectId) {
  const { deleteSpace } = useDependencies()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: SpaceId) => deleteSpace.execute(id),
    onSuccess: (_, id) => {
      // Drops the space and its board/document lists from the cache.
      queryClient.removeQueries({ queryKey: queryKeys.space(id) })
      return queryClient.invalidateQueries({ queryKey: queryKeys.spaces(projectId), exact: true })
    },
  })
}
