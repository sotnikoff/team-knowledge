import { describe, expect, it } from 'vitest'
import { encodeBmp } from './bmp'

describe('encodeBmp', () => {
  // 3x2 image: top row red, green, blue; bottom row black, white, transparent.
  const rgba = new Uint8ClampedArray([
    255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255,
    0, 0, 0, 255, 255, 255, 255, 255, 0, 0, 0, 0,
  ])
  const bmp = encodeBmp(3, 2, rgba)
  const view = new DataView(bmp.buffer)

  it('writes a valid header', () => {
    expect(String.fromCharCode(bmp[0]!, bmp[1]!)).toBe('BM')
    expect(view.getUint32(2, true)).toBe(bmp.length)
    expect(view.getInt32(18, true)).toBe(3)
    expect(view.getInt32(22, true)).toBe(2)
    expect(view.getUint16(28, true)).toBe(24)
    // 3 px * 3 bytes = 9, padded to 12 per row
    expect(bmp.length).toBe(54 + 12 * 2)
  })

  it('stores rows bottom-up in BGR, compositing transparency on white', () => {
    const row = (r: number) => [...bmp.slice(54 + r * 12, 54 + r * 12 + 9)]
    expect(row(0)).toEqual([0, 0, 0, 255, 255, 255, 255, 255, 255]) // bottom row
    expect(row(1)).toEqual([0, 0, 255, 0, 255, 0, 255, 0, 0]) // top row
  })

  it('rejects mismatched pixel data', () => {
    expect(() => encodeBmp(2, 2, new Uint8ClampedArray(4))).toThrow()
  })
})
