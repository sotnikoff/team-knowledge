export const FONT_FAMILY = '"Caveat", "Comic Sans MS", cursive'
export const LINE_HEIGHT = 1.25
export const DEFAULT_FONT_SIZE = 28

let measureCtx: CanvasRenderingContext2D | null = null

export function fontFor(size: number): string {
  return `${size}px ${FONT_FAMILY}`
}

export function measureText(text: string, fontSize: number): { width: number; height: number } {
  measureCtx ??= document.createElement('canvas').getContext('2d')
  const lines = text.split('\n')
  if (!measureCtx) return { width: 0, height: lines.length * fontSize * LINE_HEIGHT }
  measureCtx.font = fontFor(fontSize)
  const width = Math.max(...lines.map((line) => measureCtx!.measureText(line).width))
  return { width, height: lines.length * fontSize * LINE_HEIGHT }
}

export const LABEL_FONT_SIZE = 24

/** Splits text into lines that fit `maxWidth` (explicit newlines are kept). */
export function wrapText(text: string, fontSize: number, maxWidth: number): string[] {
  measureCtx ??= document.createElement('canvas').getContext('2d')
  const ctx = measureCtx
  if (!ctx) return text.split('\n')
  ctx.font = fontFor(fontSize)
  const lines: string[] = []
  for (const paragraph of text.split('\n')) {
    let line = ''
    for (const word of paragraph.split(' ')) {
      const candidate = line ? `${line} ${word}` : word
      if (line && ctx.measureText(candidate).width > maxWidth) {
        lines.push(line)
        line = word
      } else {
        line = candidate
      }
    }
    lines.push(line)
  }
  return lines
}
