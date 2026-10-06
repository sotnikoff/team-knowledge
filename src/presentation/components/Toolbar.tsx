import * as editor from '@/application/editor/editorModel'
import type { ToolType } from '@/application/editor/editorModel'
import { dispatch, useEditor } from '../editor/store'
import { TOOLBAR_ORDER, toolHint } from '../editor/useEditorShortcuts'
import { AppIcon } from './icons'
import { IconButton } from '../ui/IconButton'
import { Panel } from '../ui/Panel'
import { TechPalette } from './TechPalette'
import styles from './Toolbar.module.css'
import { useI18n } from '../i18n/i18n'

// The component palette closes the toolbar; it has its own button.
const items = TOOLBAR_ORDER.filter((tool): tool is Exclude<ToolType, 'tech'> => tool !== 'tech')

export function Toolbar() {
  const { t } = useI18n()
  const current = useEditor((m) => m.tool)
  return (
    <Panel className={styles.toolbar}>
      {items.map((tool) => (
        <IconButton
          key={tool}
          label={t(`tools.${tool}`)}
          {...toolHint(tool, t('common.or'))}
          active={current === tool}
          onClick={() => dispatch((m) => editor.setTool(m, tool))}
        >
          <AppIcon name={tool} />
        </IconButton>
      ))}
      <span className={styles.separator} />
      <TechPalette />
    </Panel>
  )
}
