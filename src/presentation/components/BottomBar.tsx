import * as editor from '@/application/editor/editorModel'
import { zoomAt } from '@/application/editor/viewport'
import { dispatch, useEditor } from '../editor/store'
import { AppIcon } from './icons'
import { IconButton, Island } from './Island'
import { useI18n } from '../i18n/i18n'

function zoomBy(factor: number) {
  const anchor = { x: window.innerWidth / 2, y: window.innerHeight / 2 }
  dispatch((m) => editor.setViewport(m, zoomAt(m.viewport, m.viewport.zoom * factor, anchor)))
}

export function BottomBar() {
  const { t } = useI18n()
  const zoom = useEditor((m) => m.viewport.zoom)
  const canUndo = useEditor(editor.canUndo)
  const canRedo = useEditor(editor.canRedo)

  return (
    <div className="flex gap-2">
      <Island className="flex items-center">
        <IconButton label={t('zoom.out')} onClick={() => zoomBy(1 / 1.2)}>
          <span className="text-lg leading-none">−</span>
        </IconButton>
        <button
          type="button"
          title={t('zoom.reset')}
          onClick={() => zoomBy(1 / zoom)}
          className="h-9 w-14 rounded-md text-sm tabular-nums text-slate-700 hover:bg-slate-100"
        >
          {Math.round(zoom * 100)}%
        </button>
        <IconButton label={t('zoom.in')} onClick={() => zoomBy(1.2)}>
          <span className="text-lg leading-none">+</span>
        </IconButton>
      </Island>
      <Island className="flex">
        <IconButton label={t('history.undo')} hint="Ctrl+Z" disabled={!canUndo} onClick={() => dispatch(editor.undo)}>
          <AppIcon name="undo" />
        </IconButton>
        <IconButton label={t('history.redo')} hint="Ctrl+Shift+Z" disabled={!canRedo} onClick={() => dispatch(editor.redo)}>
          <AppIcon name="redo" />
        </IconButton>
      </Island>
    </div>
  )
}
