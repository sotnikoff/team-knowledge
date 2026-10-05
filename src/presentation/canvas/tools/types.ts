import type { IdGenerator } from '@/application/ports/IdGenerator'
import type { Point } from '@/domain/shared/geometry'

export interface PointerInput {
  /** Scene coordinates. */
  readonly world: Point
  /** Canvas-relative CSS pixels. */
  readonly screen: Point
  readonly shiftKey: boolean
  /** Held to draw/drag a line end without snapping to shapes. */
  readonly altKey: boolean
}

export interface ToolContext {
  readonly ids: IdGenerator
  readonly randomSeed: () => number
}

/** One pointer gesture, from pointerdown to pointerup. */
export interface ToolSession {
  move(input: PointerInput): void
  end(input: PointerInput): void
}

/**
 * A tool turns pointer gestures into editor transitions. Tools are looked up in
 * the `tools` registry, so a new tool never requires editing the canvas.
 */
export interface Tool {
  readonly cursor: string
  begin(input: PointerInput, ctx: ToolContext): ToolSession | null
}
