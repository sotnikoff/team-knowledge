import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Document, DocumentId } from '@/domain/document/Document'
import type { SpaceId } from '@/domain/space/Space'
import { useDependencies } from '../app/dependencies'
import { queryKeys } from './queryKeys'

export function useDocumentList(spaceId: SpaceId) {
  const { listDocuments } = useDependencies()
  return useQuery({ queryKey: queryKeys.documents(spaceId), queryFn: () => listDocuments.execute(spaceId) })
}

export function useDocument(id: DocumentId) {
  const { openDocument } = useDependencies()
  return useQuery({
    queryKey: queryKeys.document(id),
    queryFn: () => openDocument.execute(id),
    // The editor owns the content while open; autosave keeps the cache fresh.
    staleTime: Infinity,
  })
}

/** Puts a document returned by a use case into the cache and refreshes its list. */
function useDocumentCache() {
  const queryClient = useQueryClient()
  return (doc: Document) => {
    queryClient.setQueryData(queryKeys.document(doc.id), doc)
    return queryClient.invalidateQueries({ queryKey: queryKeys.documents(doc.spaceId), exact: true })
  }
}

export function useCreateDocument(spaceId: SpaceId) {
  const { createDocument } = useDependencies()
  const cache = useDocumentCache()
  return useMutation({
    mutationFn: (title: string) => createDocument.execute({ spaceId, title }),
    onSuccess: cache,
  })
}

export function useRenameDocument() {
  const { renameDocument } = useDependencies()
  const cache = useDocumentCache()
  return useMutation({
    mutationFn: (input: { id: DocumentId; title: string }) => renameDocument.execute(input.id, input.title),
    onSuccess: cache,
  })
}

export function useDeleteDocument(spaceId: SpaceId) {
  const { deleteDocument } = useDependencies()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: DocumentId) => deleteDocument.execute(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: queryKeys.document(id) })
      return queryClient.invalidateQueries({ queryKey: queryKeys.documents(spaceId), exact: true })
    },
  })
}
