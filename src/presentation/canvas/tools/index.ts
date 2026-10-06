import type { ToolType } from '@/application/editor/editorModel'
import { freedrawTool } from './freedrawTool'
import { handTool } from './handTool'
import { linearTool } from './linearTool'
import { selectTool } from './selectTool'
import { shapeTool } from './shapeTool'
import { techTool } from './techTool'
import { textTool } from './textTool'
import type { Tool } from './types'

export const tools: Record<ToolType, Tool> = {
  select: selectTool,
  hand: handTool,
  tech: techTool,
  rectangle: shapeTool('rectangle'),
  diamond: shapeTool('diamond'),
  ellipse: shapeTool('ellipse'),
  arrow: linearTool('arrow'),
  line: linearTool('line'),
  freedraw: freedrawTool,
  text: textTool,
}

export type { PointerInput, Tool, ToolContext, ToolSession } from './types'
