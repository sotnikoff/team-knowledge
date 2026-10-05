import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { screenToWorld } from '@/application/editor/viewport'
import type { Board } from '@/domain/board/Board'
import type { DiagramElement } from '@/domain/element/types'
import { useDependencies } from '../app/dependencies'
import { Canvas } from '../canvas/Canvas'
import { BottomBar } from '../components/BottomBar'
import { InsertDocumentMenu } from '../components/InsertDocumentMenu'
import { Island } from '../components/Island'
import { SaveStatus } from '../components/SaveStatus'
import { StylePanel } from '../components/StylePanel'
import { Toolbar } from '../components/Toolbar'
import { useAutosave } from '../hooks/useAutosave'
import { queryKeys } from '../hooks/queryKeys'
import { getModel, resetEditor, useEditor, useEditorSession } from './store'
import { useEditorShortcuts } from './useEditorShortcuts'

interface EditorProps {
  /** The freshest cached copy of the board; its first value seeds the editor. */
  readonly board: Board
  readonly onReload: () => void
}

/**
 * Loads the board into the editor store before anything reads it, so nothing
 * (autosave above all) ever observes the previous board's content. The store
 * is reset in an effect — not during render — to keep other subscribers safe.
 */
export function Editor(props: EditorProps) {
  const [initial] = useState(props.board)
  const [session] = useState(() => ({}))
  const loaded = useEditorSession() === session

  useLayoutEffect(() => resetEditor(initial.elements, session), [initial, session])

  return loaded ? <LoadedEditor {...props} initial={initial} /> : null
}

function LoadedEditor({ initial, ...props }: EditorProps & { initial: Board }) {
  const { saveBoardContent } = useDependencies()
  const queryClient = useQueryClient()

  const elements = useEditor((m) => m.elements)
  const { status, retry } = useAutosave<Board, readonly DiagramElement[]>({
    initial,
    initialContent: initial.elements,
    content: elements,
    latest: props.board,
    save: (base, content) => saveBoardContent.execute(base, content),
    onSaved: (saved) => {
      queryClient.setQueryData(queryKeys.board(saved.id), saved)
      void queryClient.invalidateQueries({ queryKey: queryKeys.boards(saved.spaceId), exact: true })
    },
  })
  const navigate = useNavigate()
  const openDocument = useCallback(
    (documentId: string) => void navigate(`/spaces/${initial.spaceId}/docs/${documentId}`),
    [navigate, initial.spaceId],
  )
  useEditorShortcuts({ onOpenDocument: openDocument })

  const root = useRef<HTMLDivElement>(null)
  const viewCenter = () => {
    const rect = root.current?.getBoundingClientRect()
    return screenToWorld(getModel().viewport, { x: (rect?.width ?? 0) / 2, y: (rect?.height ?? 0) / 2 })
  }

  return (
    <div ref={root} className="absolute inset-0 select-none overflow-hidden bg-white">
      <Canvas onOpenDocument={openDocument} />
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
        <Island className="pointer-events-auto flex h-11 items-center px-3">
          <span className="max-w-48 truncate font-medium text-slate-800">{props.board.name}</span>
        </Island>
        <div className="pointer-events-auto">
          <Toolbar />
        </div>
        <div className="pointer-events-auto flex items-start gap-2">
          <InsertDocumentMenu spaceId={initial.spaceId} viewCenter={viewCenter} />
          <Island className="flex h-11 items-center">
            <SaveStatus status={status} onRetry={retry} onReload={props.onReload} />
          </Island>
        </div>
      </div>
      <div className="pointer-events-auto absolute left-3 top-20">
        <StylePanel />
      </div>
      <div className="pointer-events-auto absolute bottom-3 left-3">
        <BottomBar />
      </div>
    </div>
  )
}
