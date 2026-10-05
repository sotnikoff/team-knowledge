import * as editor from '@/application/editor/editorModel'
import type { ToolType } from '@/application/editor/editorModel'
import { dispatch, useEditor } from '../editor/store'
import { AppIcon } from './icons'
import { IconButton, Island } from './Island'

const items: { tool: ToolType; label: string; hint: string }[] = [
  { tool: 'hand', label: 'Рука', hint: 'H' },
  { tool: 'select', label: 'Выделение', hint: 'V или 1' },
  { tool: 'rectangle', label: 'Прямоугольник', hint: 'R или 2' },
  { tool: 'diamond', label: 'Ромб', hint: 'D или 3' },
  { tool: 'ellipse', label: 'Эллипс', hint: 'O или 4' },
  { tool: 'arrow', label: 'Стрелка', hint: 'A или 5' },
  { tool: 'line', label: 'Линия', hint: 'L или 6' },
  { tool: 'freedraw', label: 'Карандаш', hint: 'P или 7' },
  { tool: 'text', label: 'Текст', hint: 'T или 8' },
]

export function Toolbar() {
  const current = useEditor((m) => m.tool)
  return (
    <Island className="flex gap-0.5">
      {items.map((item) => (
        <IconButton
          key={item.tool}
          label={item.label}
          hint={item.hint}
          active={current === item.tool}
          onClick={() => dispatch((m) => editor.setTool(m, item.tool))}
        >
          <AppIcon name={item.tool} />
        </IconButton>
      ))}
    </Island>
  )
}
