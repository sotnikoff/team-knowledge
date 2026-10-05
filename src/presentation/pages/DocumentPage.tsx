import { useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { useParams } from 'react-router'
import type { Document } from '@/domain/document/Document'
import type { RichText } from '@/domain/document/richText'
import { NAME_MAX_LENGTH } from '@/domain/shared/name'
import { useDependencies } from '../app/dependencies'
import { LoadError, Loading } from '../components/PageState'
import { SaveStatus } from '../components/SaveStatus'
import { RichTextEditor, type RichTextEditorHandle } from '../documents/RichTextEditor'
import { errorMessage } from '../errors'
import { useAutosave } from '../hooks/useAutosave'
import { useDocument, useRenameDocument } from '../hooks/useDocuments'
import { queryKeys } from '../hooks/queryKeys'

export function DocumentPage() {
  const { documentId = '' } = useParams()
  const { data: doc, error, isPending, refetch } = useDocument(documentId)
  const [generation, setGeneration] = useState(0)

  if (isPending) return <Loading>Загрузка документа…</Loading>
  if (error) return <LoadError error={error} onRetry={() => void refetch()} />

  const reload = async () => {
    await refetch()
    setGeneration((g) => g + 1)
  }

  return <DocumentEditor key={`${doc.id}:${generation}`} doc={doc} onReload={() => void reload()} />
}

/** `doc` is the freshest cached copy; its first value seeds the editor. */
function DocumentEditor(props: { doc: Document; onReload: () => void }) {
  const { saveDocumentContent } = useDependencies()
  const queryClient = useQueryClient()
  const [initial] = useState(props.doc)
  const [content, setContent] = useState<RichText>(initial.content)
  const editor = useRef<RichTextEditorHandle>(null)

  const { status, retry } = useAutosave<Document, RichText>({
    initial,
    initialContent: initial.content,
    content,
    latest: props.doc,
    save: (base, next) => saveDocumentContent.execute(base, next),
    onSaved: (saved) => {
      queryClient.setQueryData(queryKeys.document(saved.id), saved)
      void queryClient.invalidateQueries({ queryKey: queryKeys.documents(saved.spaceId), exact: true })
    },
  })

  return (
    <div className="mx-auto max-w-3xl px-8 pb-24 pt-6">
      <div className="mb-4 flex justify-end">
        <SaveStatus status={status} onRetry={retry} onReload={props.onReload} />
      </div>
      {/* Remounts when the title changes elsewhere (e.g. renamed in the sidebar). */}
      <TitleInput key={props.doc.title} doc={props.doc} onEnter={() => editor.current?.focusStart()} />
      <RichTextEditor
        initialContent={initial.content}
        onChange={setContent}
        ref={editor}
      />
    </div>
  )
}

/** The title is renamed on blur/Enter, independently of content autosave. */
function TitleInput(props: { doc: Document; onEnter: () => void }) {
  const rename = useRenameDocument()
  const [title, setTitle] = useState(props.doc.title)

  const commit = () => {
    if (title.trim() === props.doc.title) return setTitle(props.doc.title)
    rename.mutate({ id: props.doc.id, title })
  }

  return (
    <div className="mb-6">
      <input
        value={title}
        maxLength={NAME_MAX_LENGTH}
        aria-label="Название документа"
        placeholder="Без названия"
        onChange={(e) => setTitle(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            commit()
            props.onEnter()
          }
        }}
        className="w-full border-0 bg-transparent text-4xl font-bold text-slate-900 outline-none placeholder:text-slate-300"
      />
      {rename.error && <p className="text-sm text-red-600">{errorMessage(rename.error)}</p>}
    </div>
  )
}
