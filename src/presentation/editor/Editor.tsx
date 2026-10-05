import { useState } from 'react'
import { Link } from 'react-router'
import type { Board } from '@/domain/board/Board'
import { Canvas } from '../canvas/Canvas'
import { BottomBar } from '../components/BottomBar'
import { AppIcon } from '../components/icons'
import { Island } from '../components/Island'
import { SaveStatus } from '../components/SaveStatus'
import { StylePanel } from '../components/StylePanel'
import { Toolbar } from '../components/Toolbar'
import { useAutosave } from '../hooks/useAutosave'
import { resetEditor, useEditor } from './store'
import { useEditorShortcuts } from './useEditorShortcuts'

export function Editor(props: { board: Board; onReload: () => void }) {
  // Load the board into the store before the first render, so nothing (e.g.
  // autosave) ever observes the previous board's content.
  useState(() => resetEditor(props.board.elements))

  const elements = useEditor((m) => m.elements)
  const { status, retry } = useAutosave(props.board, elements)
  useEditorShortcuts()

  return (
    <div className="fixed inset-0 select-none bg-white">
      <Canvas />
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
        <Island className="pointer-events-auto flex items-center gap-1">
          <Link
            to="/"
            title="К списку досок"
            className="flex h-9 w-9 items-center justify-center rounded-md text-slate-700 hover:bg-slate-100"
          >
            <AppIcon name="back" />
          </Link>
          <span className="max-w-48 truncate pr-2 font-medium text-slate-800">{props.board.name}</span>
        </Island>
        <div className="pointer-events-auto">
          <Toolbar />
        </div>
        <Island className="pointer-events-auto flex h-11 items-center">
          <SaveStatus status={status} onRetry={retry} onReload={props.onReload} />
        </Island>
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
