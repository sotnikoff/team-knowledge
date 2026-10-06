import * as editor from '@/application/editor/editorModel'
import type { ToolType } from '@/application/editor/editorModel'
import { dispatch, useEditor } from '../editor/store'
import { AppIcon } from './icons'
import { IconButton, Island } from './Island'
import { useI18n } from '../i18n/i18n'

/** Keyboard shortcuts of each tool (see `useEditorShortcuts`). */
const items: { tool: ToolType; keys: readonly string[] }[] = [
  { tool: 'hand', keys: ['H'] },
  { tool: 'select', keys: ['V', '1'] },
  { tool: 'rectangle', keys: ['R', '2'] },
  { tool: 'diamond', keys: ['D', '3'] },
  { tool: 'ellipse', keys: ['O', '4'] },
  { tool: 'arrow', keys: ['A', '5'] },
  { tool: 'line', keys: ['L', '6'] },
  { tool: 'freedraw', keys: ['P', '7'] },
  { tool: 'text', keys: ['T', '8'] },
]

export function Toolbar() {
  const { t } = useI18n()
  const current = useEditor((m) => m.tool)
  return (
    <Island className="flex gap-0.5">
      {items.map((item) => (
        <IconButton
          key={item.tool}
          label={t(`tools.${item.tool}`)}
          hint={item.keys.join(` ${t('common.or')} `)}
          active={current === item.tool}
          onClick={() => dispatch((m) => editor.setTool(m, item.tool))}
        >
          <AppIcon name={item.tool} />
        </IconButton>
      ))}
    </Island>
  )
}
