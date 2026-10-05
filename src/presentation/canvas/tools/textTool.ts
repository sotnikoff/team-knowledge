import * as editor from '@/application/editor/editorModel'
import { shapeAt } from '@/application/editor/scene'
import { createText } from '@/domain/element/factory'
import type { Point } from '@/domain/shared/geometry'
import { dispatch, getModel } from '../../editor/store'
import { startEditing } from '../../editor/textEditing'
import { DEFAULT_FONT_SIZE } from '../text'
import type { Tool, ToolContext } from './types'

/** Creates an empty text element and opens the inline editor for it. */
export function startTextAt(world: Point, ctx: ToolContext): void {
  const id = ctx.ids.next()
  dispatch(
    editor.beginInteraction,
    (m) =>
      editor.updateLive(m, [
        ...m.elements,
        createText({
          id,
          seed: ctx.randomSeed(),
          style: m.style,
          x: world.x,
          y: world.y - (DEFAULT_FONT_SIZE * 1.25) / 2,
          fontSize: DEFAULT_FONT_SIZE,
        }),
      ]),
    (m) => editor.select(m, [id]),
    (m) => editor.setEditingText(m, id),
  )
}

export const textTool: Tool = {
  cursor: 'text',
  begin: ({ world }, ctx) => {
    // Clicking inside a shape writes its label instead of a loose text.
    const shape = shapeAt(getModel().elements, world)
    if (shape) startEditing(shape.id)
    else startTextAt(world, ctx)
    return null
  },
}
