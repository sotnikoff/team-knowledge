import type { RoughCanvas } from 'roughjs/bin/canvas'
import type { Drawable, Options } from 'roughjs/bin/core'
import type { RoughGenerator } from 'roughjs/bin/generator'
import { TRANSPARENT, type DiagramElement } from '@/domain/element/types'
import type { Point } from '@/domain/shared/geometry'

/** Shared plumbing of the canvas renderers. */
export interface RenderContext {
  readonly ctx: CanvasRenderingContext2D
  readonly rc: RoughCanvas
  readonly gen: RoughGenerator
}

export const toPairs = (points: readonly Point[]): [number, number][] => points.map((p) => [p.x, p.y])

export function roughOptions(el: DiagramElement): Options {
  const { strokeColor, fillColor, fillStyle, strokeWidth, roughness } = el.style
  return {
    seed: el.seed,
    stroke: strokeColor,
    strokeWidth,
    roughness,
    fill: fillColor === TRANSPARENT ? undefined : fillColor,
    fillStyle,
    hachureGap: strokeWidth * 4,
    preserveVertices: true,
  }
}

// Elements are immutable, so the object itself is a perfect cache key.
const drawableCache = new WeakMap<DiagramElement, Drawable[]>()

export function drawCached(el: DiagramElement, r: RenderContext, build: () => Drawable[]): void {
  let drawables = drawableCache.get(el)
  if (!drawables) {
    drawables = build()
    drawableCache.set(el, drawables)
  }
  for (const d of drawables) r.rc.draw(d)
}
