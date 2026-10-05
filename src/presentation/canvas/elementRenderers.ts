import type { Drawable, Options } from 'roughjs/bin/core'
import type { RoughGenerator } from 'roughjs/bin/generator'
import type { RoughCanvas } from 'roughjs/bin/canvas'
import { diamondPoints, labelBox } from '@/domain/element/geometry'
import { absolutePoints } from '@/domain/element/factory'
import {
  TRANSPARENT,
  type DiagramElement,
  type ElementOfType,
  type ElementType,
  type ShapeElement,
} from '@/domain/element/types'
import type { Point } from '@/domain/shared/geometry'
import { fontFor, LABEL_FONT_SIZE, LINE_HEIGHT, wrapText } from './text'

interface RenderContext {
  readonly ctx: CanvasRenderingContext2D
  readonly rc: RoughCanvas
  readonly gen: RoughGenerator
}

type ElementRenderer<E extends DiagramElement> = (el: E, r: RenderContext) => void

/**
 * One renderer per element type. The mapped type forces a renderer for every
 * `ElementType`, so adding a shape is a compile-guided, additive change.
 */
type RendererRegistry = { [K in ElementType]: ElementRenderer<ElementOfType<K>> }

const toPairs = (points: readonly Point[]): [number, number][] => points.map((p) => [p.x, p.y])

function roughOptions(el: DiagramElement): Options {
  const { strokeColor, fillColor, strokeWidth, roughness } = el.style
  return {
    seed: el.seed,
    stroke: strokeColor,
    strokeWidth,
    roughness,
    fill: fillColor === TRANSPARENT ? undefined : fillColor,
    fillStyle: 'hachure',
    hachureGap: strokeWidth * 4,
    preserveVertices: true,
  }
}

// Elements are immutable, so the object itself is a perfect cache key.
const drawableCache = new WeakMap<DiagramElement, Drawable[]>()

function drawCached(el: DiagramElement, r: RenderContext, build: () => Drawable[]) {
  let drawables = drawableCache.get(el)
  if (!drawables) {
    drawables = build()
    drawableCache.set(el, drawables)
  }
  for (const d of drawables) r.rc.draw(d)
}

function arrowHead(points: readonly Point[], size: number): [Point, Point, Point] | null {
  const tip = points.at(-1)
  const from = points.at(-2)
  if (!tip || !from) return null
  const angle = Math.atan2(tip.y - from.y, tip.x - from.x)
  const length = Math.min(size, Math.hypot(tip.x - from.x, tip.y - from.y) / 2)
  const spread = Math.PI / 7
  return [
    { x: tip.x - length * Math.cos(angle - spread), y: tip.y - length * Math.sin(angle - spread) },
    tip,
    { x: tip.x - length * Math.cos(angle + spread), y: tip.y - length * Math.sin(angle + spread) },
  ]
}

export const elementRenderers: RendererRegistry = {
  rectangle: (el, r) =>
    drawCached(el, r, () => [r.gen.rectangle(el.x, el.y, el.width, el.height, roughOptions(el))]),
  ellipse: (el, r) =>
    drawCached(el, r, () => [
      r.gen.ellipse(el.x + el.width / 2, el.y + el.height / 2, el.width, el.height, roughOptions(el)),
    ]),
  diamond: (el, r) =>
    drawCached(el, r, () => [r.gen.polygon(toPairs(diamondPoints(el)), roughOptions(el))]),
  line: (el, r) =>
    drawCached(el, r, () => [r.gen.linearPath(toPairs(absolutePoints(el)), roughOptions(el))]),
  arrow: (el, r) =>
    drawCached(el, r, () => {
      const points = absolutePoints(el)
      const shaft = r.gen.linearPath(toPairs(points), roughOptions(el))
      const head = arrowHead(points, 12 + el.style.strokeWidth * 4)
      return head ? [shaft, r.gen.linearPath(toPairs(head), roughOptions(el))] : [shaft]
    }),
  freedraw: (el, { ctx }) => {
    const points = absolutePoints(el)
    const first = points[0]
    if (!first) return
    ctx.save()
    ctx.strokeStyle = el.style.strokeColor
    ctx.lineWidth = el.style.strokeWidth
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(first.x, first.y)
    for (let i = 1; i < points.length - 1; i++) {
      const p = points[i]!
      const next = points[i + 1]!
      ctx.quadraticCurveTo(p.x, p.y, (p.x + next.x) / 2, (p.y + next.y) / 2)
    }
    const last = points.at(-1)!
    ctx.lineTo(last.x, last.y)
    ctx.stroke()
    ctx.restore()
  },
  text: (el, { ctx }) => {
    ctx.save()
    ctx.font = fontFor(el.fontSize)
    ctx.fillStyle = el.style.strokeColor
    ctx.textBaseline = 'top'
    el.text.split('\n').forEach((line, i) => {
      ctx.fillText(line, el.x, el.y + i * el.fontSize * LINE_HEIGHT)
    })
    ctx.restore()
  },
}

/** Draws a shape's label centered inside it, wrapped to its label box. */
export function renderLabel(el: ShapeElement, ctx: CanvasRenderingContext2D): void {
  if (el.label.trim() === '') return
  const box = labelBox(el)
  const lines = wrapText(el.label, LABEL_FONT_SIZE, box.width)
  const lineHeight = LABEL_FONT_SIZE * LINE_HEIGHT
  const top = el.y + el.height / 2 - (lines.length * lineHeight) / 2
  ctx.save()
  ctx.font = fontFor(LABEL_FONT_SIZE)
  ctx.fillStyle = el.style.strokeColor
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  lines.forEach((line, i) => ctx.fillText(line, el.x + el.width / 2, top + (i + 0.5) * lineHeight))
  ctx.restore()
}

export function renderElement(el: DiagramElement, r: RenderContext): void {
  ;(elementRenderers[el.type] as ElementRenderer<DiagramElement>)(el, r)
}
