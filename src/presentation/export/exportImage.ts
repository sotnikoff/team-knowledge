import rough from 'roughjs'
import { elementBounds } from '@/domain/element/geometry'
import type { DiagramElement, DocumentElement } from '@/domain/element/types'
import { unionBounds } from '@/domain/shared/geometry'
import { drawElements } from '../canvas/elementRenderers'
import { encodeBmp } from './bmp'
import { rasterizeHtml, resetCssCache } from './rasterizeHtml'

export type ExportFormat = 'png' | 'jpeg' | 'bmp'

export const EXPORT_FORMATS: readonly { id: ExportFormat; label: string; extension: string }[] = [
  { id: 'png', label: 'PNG', extension: 'png' },
  { id: 'jpeg', label: 'JPEG', extension: 'jpg' },
  { id: 'bmp', label: 'BMP', extension: 'bmp' },
]

export interface ExportOptions {
  readonly elements: readonly DiagramElement[]
  readonly format: ExportFormat
  /** Pixels per world unit (2 = retina-quality). */
  readonly scale: number
  /** The rendered DOM card of a document element (drawn by `DocumentLayer`). */
  readonly findCardNode: (elementId: string) => HTMLElement | null
}

/** Empty space around the exported content, in world units. */
const PADDING = 32
/** Browsers refuse canvases larger than this on a side. */
const MAX_SIDE = 16_384
const BACKGROUND = '#ffffff'

/**
 * Renders the given elements to an image the way they look on the board:
 * document cards underneath, drawings on top, white background.
 */
/** Nothing selected/drawn; the UI shows its own localized message. */
export class NothingToExportError extends Error {
  constructor() {
    super('Nothing to export')
    this.name = 'NothingToExportError'
  }
}

export async function exportImage(options: ExportOptions): Promise<Blob> {
  const content = unionBounds(options.elements.map(elementBounds))
  if (!content) throw new NothingToExportError()

  const area = {
    x: content.x - PADDING,
    y: content.y - PADDING,
    width: content.width + PADDING * 2,
    height: content.height + PADDING * 2,
  }
  const scale = Math.min(options.scale, MAX_SIDE / area.width, MAX_SIDE / area.height)

  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(area.width * scale)
  canvas.height = Math.ceil(area.height * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas is not available')

  ctx.fillStyle = BACKGROUND
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.setTransform(scale, 0, 0, scale, -area.x * scale, -area.y * scale)

  resetCssCache()
  const cards = options.elements.filter((el): el is DocumentElement => el.type === 'document')
  for (const card of cards) await drawCard(ctx, card, options.findCardNode(card.id), scale)
  drawElements(ctx, rough.canvas(canvas), options.elements)

  return encode(canvas, options.format)
}

async function drawCard(
  ctx: CanvasRenderingContext2D,
  card: DocumentElement,
  node: HTMLElement | null,
  scale: number,
): Promise<void> {
  if (node) {
    try {
      const image = await rasterizeHtml(node, card.width, card.height, scale)
      ctx.drawImage(image, card.x, card.y, card.width, card.height)
      return
    } catch {
      // Fall through to a plain placeholder rather than failing the export.
    }
  }
  ctx.fillStyle = BACKGROUND
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
