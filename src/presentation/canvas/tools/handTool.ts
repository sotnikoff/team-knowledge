import * as editor from '@/application/editor/editorModel'
import { panBy } from '@/application/editor/viewport'
import { dispatch } from '../../editor/store'
import type { Tool, ToolSession } from './types'

export function startPan(start: { x: number; y: number }): ToolSession {
  let last = start
  return {
    move: ({ screen }) => {
      const dx = screen.x - last.x
      const dy = screen.y - last.y
      last = screen
      dispatch((m) => editor.setViewport(m, panBy(m.viewport, dx, dy)))
    },
    end: () => {},
  }
}

export const handTool: Tool = {
  cursor: 'grab',
  begin: ({ screen }) => startPan(screen),
}
