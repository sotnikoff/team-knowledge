import * as editor from '@/application/editor/editorModel'
import { zoomAt } from '@/application/editor/viewport'
import { dispatch, useEditor } from '../editor/store'
import { AppIcon } from './icons'
import { IconButton } from '../ui/IconButton'
import { Panel } from '../ui/Panel'
import styles from './BottomBar.module.css'
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
    <div className={styles.bar}>
      <Panel className={styles.group}>
        <IconButton label={t('zoom.out')} onClick={() => zoomBy(1 / 1.2)}>
          <span className={styles.sign}>−</span>
        </IconButton>
        <button
          type="button"
          title={t('zoom.reset')}
          onClick={() => zoomBy(1 / zoom)}
          className={styles.zoom}
        >
          {Math.round(zoom * 100)}%
        </button>
        <IconButton label={t('zoom.in')} onClick={() => zoomBy(1.2)}>
          <span className={styles.sign}>+</span>
        </IconButton>
      </Panel>
      <Panel className={styles.group}>
        <IconButton label={t('history.undo')} hint="Ctrl+Z" disabled={!canUndo} onClick={() => dispatch(editor.undo)}>
          <AppIcon name="undo" />
        </IconButton>
        <IconButton label={t('history.redo')} hint="Ctrl+Shift+Z" disabled={!canRedo} onClick={() => dispatch(editor.redo)}>
          <AppIcon name="redo" />
        </IconButton>
      </Panel>
    </div>
  )
}
