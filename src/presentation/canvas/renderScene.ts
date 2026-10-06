import rough from 'roughjs'
import type { RoughCanvas } from 'roughjs/bin/canvas'
import type { EditorModel } from '@/application/editor/editorModel'
import { findElement, selectionBounds } from '@/application/editor/scene'
import { anchorPoint } from '@/domain/element/binding'
import { absolutePoints } from '@/domain/element/factory'
import { elementBounds, handlePosition, RESIZE_HANDLES } from '@/domain/element/geometry'
import { ANCHORS, isLinearElement, type DiagramElement } from '@/domain/element/types'
import type { Bounds } from '@/domain/shared/geometry'
import { drawElements } from './elementRenderers'
import { HANDLE_SIZE, visibleMidpoints } from './selection'

export interface Surface {
  readonly width: number
  readonly height: number
  readonly pixelRatio: number
}

const SELECTION_COLOR = '#6965db'

/** Clears a layer canvas and applies the viewport transform; returns the context ready to draw in world units. */
function beginFrame(canvas: HTMLCanvasElement, model: EditorModel, surface: Surface): CanvasRenderingContext2D | null {
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const { zoom, scrollX, scrollY } = model.viewport
  // Transparent: what lies underneath (document cards, lower layers) shows through.
  ctx.setTransform(surface.pixelRatio, 0, 0, surface.pixelRatio, 0, 0)
  ctx.clearRect(0, 0, surface.width, surface.height)
  ctx.scale(zoom, zoom)
  ctx.translate(scrollX, scrollY)
  return ctx
}

/** One drawing layer: the elements between two document cards (see `splitAtDocuments`). */
export function renderDrawing(
  canvas: HTMLCanvasElement,
  rc: RoughCanvas,
  elements: readonly DiagramElement[],
  model: EditorModel,
  surface: Surface,
) {
  const ctx = beginFrame(canvas, model, surface)
  if (ctx) drawElements(ctx, rc, elements, { editingId: model.editingTextId })
}

/** The topmost layer: selection, binding hints and the marquee, above every element and card. */
export function renderOverlay(canvas: HTMLCanvasElement, model: EditorModel, surface: Surface) {
  const ctx = beginFrame(canvas, model, surface)
  if (!ctx) return
  drawSelection(ctx, model)
  drawBindingHint(ctx, model)
  if (model.marquee) drawMarquee(ctx, model.marquee, model.viewport.zoom)
}

export function createRoughCanvas(canvas: HTMLCanvasElement): RoughCanvas {
  return rough.canvas(canvas)
}

function drawSelection(ctx: CanvasRenderingContext2D, model: EditorModel) {
  if (model.selectedIds.length === 0 || model.editingTextId) return
  const zoom = model.viewport.zoom
  const padding = 4 / zoom
  ctx.save()
  ctx.strokeStyle = SELECTION_COLOR
  ctx.lineWidth = 1 / zoom

  // A single line/arrow is edited by its points (ends + bends) and by the
  // midpoints of its segments, which pull out new bends.
  const single = model.selectedIds.length === 1 ? findElement(model.elements, model.selectedIds[0]!) : null
  if (single && isLinearElement(single)) {
    ctx.fillStyle = SELECTION_COLOR
    ctx.globalAlpha = 0.45
    for (const { point } of visibleMidpoints(single, zoom)) drawDot(ctx, point.x, point.y, 3.5 / zoom, false)
    ctx.globalAlpha = 1
    ctx.fillStyle = '#ffffff'
    for (const p of absolutePoints(single)) drawDot(ctx, p.x, p.y, HANDLE_SIZE / 2 / zoom, true)
    ctx.restore()
    return
  }

  if (model.selectedIds.length > 1) {
    ctx.setLineDash([4 / zoom, 4 / zoom])
    const selected = new Set(model.selectedIds)
    for (const el of model.elements) {
      if (selected.has(el.id)) strokeBounds(ctx, elementBounds(el), padding)
    }
    ctx.setLineDash([])
  }

  const bounds = selectionBounds(model.elements, model.selectedIds)
  if (bounds) {
    strokeBounds(ctx, bounds, padding)
    if (model.selectedIds.length === 1) drawHandles(ctx, bounds, zoom)
  }
  ctx.restore()
}

/** Outlines the shape a line end is about to bind to and shows its anchors. */
function drawBindingHint(ctx: CanvasRenderingContext2D, model: EditorModel) {
  const hint = model.bindingHint
  const target = hint && findElement(model.elements, hint.elementId)
  if (!hint || !target) return
  const zoom = model.viewport.zoom
  ctx.save()
  ctx.strokeStyle = SELECTION_COLOR
  ctx.globalAlpha = 0.6
  ctx.lineWidth = 2 / zoom
  strokeBounds(ctx, elementBounds(target), 6 / zoom)
  ctx.globalAlpha = 1
  ctx.lineWidth = 1.5 / zoom
  for (const anchor of ANCHORS) {
    const p = anchorPoint(target, anchor)
    const active = hint.active?.anchor === anchor
    ctx.fillStyle = active ? SELECTION_COLOR : '#ffffff'
    drawDot(ctx, p.x, p.y, (active ? 6 : 4.5) / zoom, true)
  }
  ctx.restore()
}

function drawDot(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, stroke: boolean) {
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.fill()
  if (stroke) ctx.stroke()
}

function drawHandles(ctx: CanvasRenderingContext2D, bounds: Bounds, zoom: number) {
  const size = HANDLE_SIZE / zoom
  ctx.fillStyle = '#ffffff'
  for (const handle of RESIZE_HANDLES) {
    const p = handlePosition(bounds, handle)
    ctx.beginPath()
    ctx.rect(p.x - size / 2, p.y - size / 2, size, size)
    ctx.fill()
    ctx.stroke()
  }
}

function drawMarquee(ctx: CanvasRenderingContext2D, b: Bounds, zoom: number) {
  ctx.save()
  ctx.fillStyle = 'rgba(105, 101, 219, 0.08)'
  ctx.strokeStyle = SELECTION_COLOR
  ctx.lineWidth = 1 / zoom
  ctx.fillRect(b.x, b.y, b.width, b.height)
  ctx.strokeRect(b.x, b.y, b.width, b.height)
  ctx.restore()
}

function strokeBounds(ctx: CanvasRenderingContext2D, b: Bounds, padding: number) {
  ctx.strokeRect(b.x - padding, b.y - padding, b.width + padding * 2, b.height + padding * 2)
}
