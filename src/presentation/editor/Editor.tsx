import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { screenToWorld } from '@/application/editor/viewport'
import type { Board } from '@/domain/board/Board'
import type { DiagramElement } from '@/domain/element/types'
import { useDependencies } from '../app/dependencies'
import { Canvas } from '../canvas/Canvas'
import { BottomBar } from '../components/BottomBar'
import { ExportMenu } from '../components/ExportMenu'
import { InsertDocumentMenu } from '../components/InsertDocumentMenu'
import { SaveStatus } from '../components/SaveStatus'
import { StylePanel } from '../components/StylePanel'
import { Toolbar } from '../components/Toolbar'
import { useAutosave } from '../hooks/useAutosave'
import { queryKeys } from '../hooks/queryKeys'
import { getModel, resetEditor, useEditor, useEditorSession } from './store'
import { useEditorShortcuts } from './useEditorShortcuts'
import { useBoardClipboard } from './useBoardClipboard'
import { BoardTitle } from './BoardTitle'
import styles from './Editor.module.css'

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
  useBoardClipboard()

  const root = useRef<HTMLDivElement>(null)
  const viewCenter = () => {
    const rect = root.current?.getBoundingClientRect()
    return screenToWorld(getModel().viewport, { x: (rect?.width ?? 0) / 2, y: (rect?.height ?? 0) / 2 })
  }

  return (
    <div ref={root} className={styles.board}>
      <Canvas onOpenDocument={openDocument} />
      <div className={styles.topBar}>
        <BoardTitle board={props.board} />
        <Toolbar />
        <div className={styles.actions}>
          <InsertDocumentMenu spaceId={initial.spaceId} viewCenter={viewCenter} />
          <ExportMenu boardName={props.board.name} />
          <span className={styles.status}>
            <SaveStatus status={status} onRetry={retry} onReload={props.onReload} />
          </span>
        </div>
      </div>
      <div className={styles.stylePanel}>
        <StylePanel />
      </div>
      <div className={styles.bottom}>
        <BottomBar />
      </div>
    </div>
  )
}
