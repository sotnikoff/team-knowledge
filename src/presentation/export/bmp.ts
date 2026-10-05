/**
 * Encodes RGBA pixels (as from `ImageData`) into a 24-bit uncompressed BMP.
 * Browsers cannot produce BMP via `canvas.toBlob` (they silently fall back to
 * PNG), hence this tiny encoder. Transparent pixels are composited on white.
 */
export function encodeBmp(width: number, height: number, rgba: Uint8ClampedArray): Uint8Array {
  if (rgba.length !== width * height * 4) throw new Error('Pixel data does not match the size')

  const rowSize = Math.ceil((width * 3) / 4) * 4 // rows are padded to 4 bytes
  const pixelBytes = rowSize * height
  const headerSize = 14 + 40
  const out = new Uint8Array(headerSize + pixelBytes)
  const view = new DataView(out.buffer)

  // BITMAPFILEHEADER
  out[0] = 0x42 // 'B'
  out[1] = 0x4d // 'M'
  view.setUint32(2, out.length, true)
  view.setUint32(10, headerSize, true)
  // BITMAPINFOHEADER
  view.setUint32(14, 40, true)
  view.setInt32(18, width, true)
  view.setInt32(22, height, true) // positive = rows stored bottom-up
  view.setUint16(26, 1, true) // planes
  view.setUint16(28, 24, true) // bits per pixel
  view.setUint32(30, 0, true) // BI_RGB, no compression
  view.setUint32(34, pixelBytes, true)
  view.setInt32(38, 2835, true) // 72 DPI
  view.setInt32(42, 2835, true)

  for (let y = 0; y < height; y++) {
    const rowStart = headerSize + (height - 1 - y) * rowSize
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      const a = rgba[i + 3]! / 255
      const o = rowStart + x * 3
      // BMP stores BGR.
      out[o] = Math.round(rgba[i + 2]! * a + 255 * (1 - a))
      out[o + 1] = Math.round(rgba[i + 1]! * a + 255 * (1 - a))
      out[o + 2] = Math.round(rgba[i]! * a + 255 * (1 - a))
    }
  }
  return out
}
