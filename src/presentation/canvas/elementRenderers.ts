import type { Drawable } from 'roughjs/bin/core'
import rough from 'roughjs'
import type { RoughCanvas } from 'roughjs/bin/canvas'
import { diamondPoints, labelBox } from '@/domain/element/geometry'
import { catmullRomSegments } from '@/domain/element/curve'
import { absolutePoints } from '@/domain/element/factory'
import { LINE_LABEL_FONT_SIZE, lineLabelAnchor, linePath } from '@/domain/element/linear'
import {
  type DiagramElement,
  type ElementOfType,
  isLinearElement,
  isShapeElement,
  type ElementId,
  type ElementType,
  type LinearElement,
  type ShapeElement,
} from '@/domain/element/types'
import type { Point } from '@/domain/shared/geometry'
import { drawCached, roughOptions, toPairs, type RenderContext } from './roughHelpers'
import { renderTech } from './techRenderers'
import { fontFor, LABEL_FONT_SIZE, LINE_HEIGHT, wrapText } from './text'

type ElementRenderer<E extends DiagramElement> = (el: E, r: RenderContext) => void

/**
 * One renderer per element type. The mapped type forces a renderer for every
 * `ElementType`, so adding a shape is a compile-guided, additive change.
 */
type RendererRegistry = { [K in ElementType]: ElementRenderer<ElementOfType<K>> }

/**
 * `traced` gives the direction at the tip (tangent of a curve); the head is
 * capped by half of the last segment between `points`, so short ends stay sane.
 */
function arrowHead(traced: readonly Point[], points: readonly Point[], size: number): [Point, Point, Point] | null {
  const tip = traced.at(-1)
  const from = traced.at(-2)
  const lastPoint = points.at(-2)
  if (!tip || !from || !lastPoint) return null
  const angle = Math.atan2(tip.y - from.y, tip.x - from.x)
  const length = Math.min(size, Math.hypot(tip.x - lastPoint.x, tip.y - lastPoint.y) / 2)
  const spread = Math.PI / 7
  return [
    { x: tip.x - length * Math.cos(angle - spread), y: tip.y - length * Math.sin(angle - spread) },
    tip,
    { x: tip.x - length * Math.cos(angle + spread), y: tip.y - length * Math.sin(angle + spread) },
  ]
}

/** SVG path of the exact spline used by hit-testing (`catmullRomSegments`). */
function splinePath(points: readonly Point[]): string {
  const segments = catmullRomSegments(points)
  const start = points[0]!
  return [
    `M ${start.x} ${start.y}`,
    ...segments.map((s) => `C ${s.c1.x} ${s.c1.y} ${s.c2.x} ${s.c2.y} ${s.to.x} ${s.to.y}`),
  ].join(' ')
}

function lineShape(el: LinearElement, r: RenderContext): Drawable {
  const points = absolutePoints(el)
  // Lines are never filled, whatever the fill colour of the style.
  const options = { ...roughOptions(el), fill: undefined }
  if (el.curved && points.length > 2) return r.gen.path(splinePath(points), options)
  return r.gen.linearPath(toPairs(points), options)
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
  line: (el, r) => drawCached(el, r, () => [lineShape(el, r)]),
  arrow: (el, r) =>
    drawCached(el, r, () => {
      const shaft = lineShape(el, r)
      const head = arrowHead(linePath(el), absolutePoints(el), 12 + el.style.strokeWidth * 4)
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
  // Drawn by the DOM layer (`DocumentCard`, stacked by `SceneLayers`) as a real rich-text card.
  document: () => {},
  tech: (el, r) => renderTech(el, r),
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
  const top = box.y + box.height / 2 - (lines.length * lineHeight) / 2
  ctx.save()
  ctx.font = fontFor(LABEL_FONT_SIZE)
  ctx.fillStyle = el.style.strokeColor
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  lines.forEach((line, i) => ctx.fillText(line, box.x + box.width / 2, top + (i + 0.5) * lineHeight))
  ctx.restore()
}

/** Room left around a line label where the line is interrupted. */
const LABEL_GAP = 6

/** Box of a line's label, measured with the real font (world units). */
function lineLabelRect(el: LinearElement, ctx: CanvasRenderingContext2D) {
  const anchor = lineLabelAnchor(el)
  const lines = el.label.split('\n')
  const lineHeight = LINE_LABEL_FONT_SIZE * LINE_HEIGHT
  ctx.save()
  ctx.font = fontFor(LINE_LABEL_FONT_SIZE)
  const width = Math.max(...lines.map((line) => ctx.measureText(line).width))
  ctx.restore()
  const height = lines.length * lineHeight
  return { anchor, lines, lineHeight, x: anchor.x - width / 2, y: anchor.y - height / 2, width, height }
}

/**
 * Draws a labelled line with a gap where the label is: the line is clipped
 * around the text instead of being covered by a plate, so whatever lies under
 * it (the paper, other elements) stays visible.
 */
function renderLabelledLine(el: LinearElement, r: RenderContext, showText: boolean): void {
  const box = lineLabelRect(el, r.ctx)
  const { ctx } = r
  ctx.save()
  ctx.beginPath()
  // Everything except the label box (even-odd: the inner rect becomes a hole).
  ctx.rect(box.x - 1e5, box.y - 1e5, 2e5, 2e5)
  ctx.rect(box.x - LABEL_GAP, box.y - LABEL_GAP / 2, box.width + LABEL_GAP * 2, box.height + LABEL_GAP)
  ctx.clip('evenodd')
  renderElement(el, r)
  ctx.restore()
  if (!showText) return
  ctx.save()
  ctx.font = fontFor(LINE_LABEL_FONT_SIZE)
  ctx.fillStyle = el.style.strokeColor
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  box.lines.forEach((line, i) => ctx.fillText(line, box.anchor.x, box.y + (i + 0.5) * box.lineHeight))
  ctx.restore()
}

export function renderElement(el: DiagramElement, r: RenderContext): void {
  ;(elementRenderers[el.type] as ElementRenderer<DiagramElement>)(el, r)
}

const generator = rough.generator()

/**
 * Draws elements (with shape labels) in order. Shared by the live board and by
 * image export, so both always look the same. `ctx` must already carry the
 * world -> pixels transform.
 */
export function drawElements(
  ctx: CanvasRenderingContext2D,
  rc: RoughCanvas,
  elements: readonly DiagramElement[],
  options: { editingId?: ElementId | null } = {},
): void {
  for (const el of elements) {
    const editing = el.id === options.editingId
    if (editing && el.type === 'text') continue
    if (isLinearElement(el) && el.label.trim() !== '') {
      // While the label is being edited the gap stays, the text is the textarea.
      renderLabelledLine(el, { ctx, rc, gen: generator }, !editing)
      continue
    }
    renderElement(el, { ctx, rc, gen: generator })
    if (!editing && isShapeElement(el)) renderLabel(el, ctx)
  }
}
