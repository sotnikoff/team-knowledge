import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Imported, ImportTarget } from '@/application/usecases'
import type { ArchiveKind } from '@/domain/archive/Archive'
import { useDependencies } from '../app/dependencies'
import { downloadBlob, pickTextFile, safeFileName } from '../files'
import { queryKeys } from './queryKeys'

/** Downloads a project, space, board or document (with everything inside) as `<name>.json`. */
export function useExportArchive() {
  const { exportArchive, archiveFormat } = useDependencies()
  return useMutation({
    mutationFn: async (input: { kind: ArchiveKind; id: string; name: string }) => {
      const archive = await exportArchive.execute({ kind: input.kind, id: input.id })
      const blob = new Blob([archiveFormat.serialize(archive)], { type: 'application/json' })
      downloadBlob(blob, safeFileName(input.name, input.kind, 'json'))
    },
  })
}

/**
 * Asks for a `.json` file and imports it as a copy into `target`. Resolves to
 * null if the user closed the file dialog.
 */
export function useImportArchive() {
  const { importArchive, archiveFormat } = useDependencies()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (target: ImportTarget): Promise<Imported | null> => {
      const text = await pickTextFile('application/json,.json')
      if (text === null) return null
      return importArchive.execute(archiveFormat.parse(text), target)
    },
    onSuccess: (imported, target) => {
      if (!imported) return
      const list = (() => {
        switch (target.kind) {
          case 'project':
            return queryKeys.projects
          case 'space':
            return queryKeys.spaces(target.projectId)
          case 'board':
            return queryKeys.boards(target.spaceId)
          case 'document':
            return queryKeys.documents(target.spaceId)
        }
      })()
      return queryClient.invalidateQueries({ queryKey: list, exact: true })
    },
  })
}
