import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ProjectId } from '@/domain/project/Project'
import { useDependencies } from '../app/dependencies'
import { queryKeys } from './queryKeys'

export function useProjectList() {
  const { listProjects } = useDependencies()
  return useQuery({ queryKey: queryKeys.projects, queryFn: () => listProjects.execute() })
}

export function useProject(id: ProjectId | undefined) {
  const { openProject } = useDependencies()
  return useQuery({
    queryKey: queryKeys.project(id ?? ''),
    queryFn: () => openProject.execute(id ?? ''),
    enabled: id !== undefined,
  })
}

export function useCreateProject() {
  const { createProject } = useDependencies()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => createProject.execute({ name }),
    onSuccess: (project) => {
      queryClient.setQueryData(queryKeys.project(project.id), project)
      return queryClient.invalidateQueries({ queryKey: queryKeys.projects, exact: true })
    },
  })
}

export function useRenameProject() {
  const { renameProject } = useDependencies()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { id: ProjectId; name: string }) => renameProject.execute(input.id, input.name),
    onSuccess: (project) => {
      queryClient.setQueryData(queryKeys.project(project.id), project)
      return queryClient.invalidateQueries({ queryKey: queryKeys.projects, exact: true })
    },
  })
}

export function useDeleteProject() {
  const { deleteProject } = useDependencies()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: ProjectId) => deleteProject.execute(id),
    onSuccess: (_, id) => {
      // Drops the project and its space list from the cache.
      queryClient.removeQueries({ queryKey: queryKeys.project(id) })
      return queryClient.invalidateQueries({ queryKey: queryKeys.projects, exact: true })
    },
  })
}
