/**
 * Rasterizes a DOM subtree (a document card) into an image, using an SVG
 * `foreignObject` that carries the page's own stylesheets once — instead of
 * inlining computed styles per element, which is extremely slow with
 * Tailwind's hundreds of CSS variables.
 *
 * Limits: cross-origin stylesheets (web fonts) are not available inside the
 * image, so text falls back to system fonts.
 */

let cachedCss: string | null = null

/** Text of all same-origin stylesheets of the page. */
export function collectPageCss(): string {
  if (cachedCss !== null) return cachedCss
  const parts: string[] = []
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      for (const rule of Array.from(sheet.cssRules)) {
        // External @imports cannot load inside an image anyway.
        if (!(rule instanceof CSSImportRule)) parts.push(rule.cssText)
      }
    } catch {
      // Cross-origin stylesheet: its rules are not readable.
    }
  }
  cachedCss = parts.join('\n')
  return cachedCss
}

/** Forget cached CSS (styles may change during development). */
export function resetCssCache(): void {
  cachedCss = null
}

/**
 * `scale` sets the pixel density, so the card stays sharp at 2x/3x. `dark`
 * renders it with the dark-theme tokens, whatever theme the page is in.
 */
export async function rasterizeHtml(
  node: HTMLElement,
  width: number,
  height: number,
  scale: number,
  dark = false,
): Promise<HTMLImageElement> {
  const clone = node.cloneNode(true) as HTMLElement
  // Place the copy at the origin of the image, keeping its own size/styles.
  clone.style.position = 'static'
  clone.style.left = '0'
  clone.style.top = '0'
  clone.style.margin = '0'

  const xhtml = new XMLSerializer().serializeToString(clone)
  // Styles set on <body> (font, color) don't reach the image: there is no body.
  const body = getComputedStyle(document.body)
  const css = `${collectPageCss()}\n.export-root{font-family:${body.fontFamily};color:var(--ink);-webkit-font-smoothing:antialiased}`
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width * scale}" height="${height * scale}" viewBox="0 0 ${width} ${height}">` +
    `<foreignObject x="0" y="0" width="100%" height="100%">` +
    `<div xmlns="http://www.w3.org/1999/xhtml" class="export-root${dark ? ' dark' : ''}" style="width:${width}px;height:${height}px">` +
    `<style>${escapeForXml(css)}</style>${xhtml}</div></foreignObject></svg>`

  const image = new Image()
  image.decoding = 'async'
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  await image.decode()
  return image
}

/** CSS goes into an XML text node: only `<` and `&` are special there. */
function escapeForXml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;')
}
