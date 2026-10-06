import rough from 'roughjs'
import { splitAtDocuments } from '@/application/editor/scene'
import { elementBounds } from '@/domain/element/geometry'
import type { DiagramElement, DocumentElement } from '@/domain/element/types'
import { unionBounds, type Bounds } from '@/domain/shared/geometry'
import { drawElements } from '../canvas/elementRenderers'
import { encodeBmp } from './bmp'
import { rasterizeHtml, resetCssCache } from './rasterizeHtml'

export type ExportFormat = 'png' | 'jpeg' | 'bmp'

export const EXPORT_FORMATS: readonly { id: ExportFormat; label: string; extension: string }[] = [
  { id: 'png', label: 'PNG', extension: 'png' },
  { id: 'jpeg', label: 'JPEG', extension: 'jpg' },
  { id: 'bmp', label: 'BMP', extension: 'bmp' },
]

export type ExportTheme = 'light' | 'dark'

export interface ExportOptions {
  readonly elements: readonly DiagramElement[]
  readonly format: ExportFormat
  /** Pixels per world unit (2 = retina-quality). */
  readonly scale: number
  /** Light: white background. Dark: the board as in the dark theme, on its night paper. */
  readonly theme: ExportTheme
  /** The rendered DOM card of a document element (drawn by `DocumentCard`). */
  readonly findCardNode: (elementId: string) => HTMLElement | null
}

/** Empty space around the exported content, in world units. */
const PADDING = 32
/** Browsers refuse canvases larger than this on a side. */
const MAX_SIDE = 16_384
const LIGHT_BACKGROUND = '#ffffff'
/** Same as `.dark .board-ink` in styles/board.css: stored light colours shown on dark paper. */
const DARK_INK_FILTER = 'invert(93%) hue-rotate(180deg)'

/** Nothing selected/drawn; the UI shows its own localized message. */
export class NothingToExportError extends Error {
  constructor() {
    super('Nothing to export')
    this.name = 'NothingToExportError'
  }
}

/** The exported area in world units: the content plus padding, or null if there is nothing. */
export function exportArea(elements: readonly DiagramElement[]): Bounds | null {
  const content = unionBounds(elements.map(elementBounds))
  if (!content) return null
  return {
    x: content.x - PADDING,
    y: content.y - PADDING,
    width: content.width + PADDING * 2,
    height: content.height + PADDING * 2,
  }
}

/**
 * Renders the given elements to an image the way they look on the board
 * (same stacking order of drawings and document cards), in the chosen theme.
 */
export async function exportImage(options: ExportOptions): Promise<Blob> {
  return encode(await renderExport(options), options.format)
}

/** Draws the export onto a new canvas (also used, at a small scale, for the preview). */
export async function renderExport(options: Omit<ExportOptions, 'format'>): Promise<HTMLCanvasElement> {
  const area = exportArea(options.elements)
  if (!area) throw new NothingToExportError()
  const scale = Math.min(options.scale, MAX_SIDE / area.width, MAX_SIDE / area.height)
  const dark = options.theme === 'dark'

  const canvas = createCanvas(Math.ceil(area.width * scale), Math.ceil(area.height * scale))
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas is not available')

  ctx.fillStyle = dark ? darkPaperColor() : LIGHT_BACKGROUND
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  const toWorld = (c: CanvasRenderingContext2D) => c.setTransform(scale, 0, 0, scale, -area.x * scale, -area.y * scale)
  toWorld(ctx)

  // In the dark theme drawings go through the same filter as on the board, so
  // each layer is drawn on its own transparent canvas and composited filtered.
  const layer = dark ? createCanvas(canvas.width, canvas.height) : canvas
  const layerCtx = layer.getContext('2d')
  if (!layerCtx) throw new Error('Canvas is not available')
  const rc = rough.canvas(layer)
  const drawLayer = (elements: readonly DiagramElement[]) => {
    if (!dark) return drawElements(ctx, rc, elements)
    layerCtx.setTransform(1, 0, 0, 1, 0, 0)
    layerCtx.clearRect(0, 0, layer.width, layer.height)
    toWorld(layerCtx)
    drawElements(layerCtx, rc, elements)
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.filter = DARK_INK_FILTER
    ctx.drawImage(layer, 0, 0)
    ctx.restore()
  }

  resetCssCache()
  // Same stacking as on the board: drawings and cards interleaved in element order.
  const { documents, drawings } = splitAtDocuments(options.elements)
  for (const [i, card] of documents.entries()) {
    drawLayer(drawings[i] ?? [])
    await drawCard(ctx, card, options.findCardNode(card.id), scale, options.theme)
  }
  drawLayer(drawings[documents.length] ?? [])
  return canvas
}

function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas
}

/** `--paper` of the dark theme, read from the design tokens (styles/tokens.css). */
function darkPaperColor(): string {
  const probe = document.createElement('div')
  probe.className = 'dark'
  probe.hidden = true
  document.body.append(probe)
  const color = getComputedStyle(probe).getPropertyValue('--paper').trim()
  probe.remove()
  return color || '#070f1c'
}

async function drawCard(
  ctx: CanvasRenderingContext2D,
  card: DocumentElement,
  node: HTMLElement | null,
  scale: number,
  theme: ExportTheme,
): Promise<void> {
  if (node) {
    try {
      const image = await rasterizeHtml(node, card.width, card.height, scale, theme === 'dark')
      ctx.drawImage(image, card.x, card.y, card.width, card.height)
      return
    } catch {
      // Fall through to a plain placeholder rather than failing the export.
    }
  }
  ctx.fillStyle = theme === 'dark' ? darkPaperColor() : LIGHT_BACKGROUND
  ctx.strokeStyle = '#e2e8f0'
  ctx.fillRect(card.x, card.y, card.width, card.height)
  ctx.strokeRect(card.x, card.y, card.width, card.height)
}

function encode(canvas: HTMLCanvasElement, format: ExportFormat): Promise<Blob> {
  if (format === 'bmp') {
    const pixels = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height)
    const bytes = encodeBmp(canvas.width, canvas.height, pixels.data)
    return Promise.resolve(new Blob([bytes.buffer as ArrayBuffer], { type: 'image/bmp' }))
  }
  const type = format === 'png' ? 'image/png' : 'image/jpeg'
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Encoding failed'))), type, 0.92),
  )
}

export class ClipboardUnavailableError extends Error {
  constructor() {
    super('Copying images to the clipboard is not supported')
    this.name = 'ClipboardUnavailableError'
  }
}

/**
 * Puts a PNG on the clipboard. The clipboard item is created right away with the
 * still-pending image, so the browser (Safari especially) still counts the call
 * as part of the click that started it.
 */
export async function copyImageToClipboard(png: Promise<Blob>): Promise<void> {
  if (typeof ClipboardItem === 'undefined' || !navigator.clipboard?.write) {
    png.catch(() => {})
    throw new ClipboardUnavailableError()
  }
  const write = navigator.clipboard.write([new ClipboardItem({ 'image/png': png })])
  // Report the export's own error (e.g. nothing to export) in preference to the clipboard's.
  await Promise.all([png, write])
}

/** Saves a blob as a file via a temporary link. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** File name from a board name: keeps letters, digits, spaces and dashes. */
export function exportFileName(boardName: string, format: ExportFormat): string {
  const base = boardName.replace(/[^\p{L}\p{N} _-]+/gu, '').trim() || 'board'
  const extension = EXPORT_FORMATS.find((f) => f.id === format)!.extension
  return `${base}.${extension}`
}
