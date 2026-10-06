import type { Drawable, Options } from 'roughjs/bin/core'
import type { TechKind } from '@/domain/element/tech'
import type { TechElement } from '@/domain/element/types'
import { drawCached, roughOptions, type RenderContext } from './roughHelpers'
import { fontFor } from './text'

/**
 * Hand-drawn glyphs of the architecture components. Each kind builds its
 * roughjs drawables inside the element bounds; the label is drawn separately
 * by `renderLabel` into `labelBox` (see `domain/element/tech.ts`).
 * The mapped type makes the compiler ask for a drawing for every kind.
 */
interface Frame {
  readonly x: number
  readonly y: number
  readonly w: number
  readonly h: number
  /** Point at fractions of the bounds. */
  readonly at: (fx: number, fy: number) => [number, number]
  /** Main outline: uses the element's fill. */
  readonly body: Options
  /** Details: never filled. */
  readonly detail: Options
}

type TechDrawing = (f: Frame, r: RenderContext) => Drawable[]

/** Vertical cylinder: database, cache. */
function cylinder(f: Frame, r: RenderContext, extraDisks: number): Drawable[] {
  const { x, y, w, h } = f
  const ry = Math.min(h * 0.12, w * 0.18)
  const body = r.gen.path(
    `M ${x} ${y + ry} L ${x} ${y + h - ry} A ${w / 2} ${ry} 0 0 0 ${x + w} ${y + h - ry} L ${x + w} ${y + ry}`,
    f.body,
  )
  const top = r.gen.ellipse(x + w / 2, y + ry, w, ry * 2, f.body)
  const disks = Array.from({ length: extraDisks }, (_, i) => {
    const dy = y + ry + (h - 2 * ry) * (0.22 * (i + 1))
    return r.gen.path(`M ${x} ${dy} A ${w / 2} ${ry} 0 0 0 ${x + w} ${dy}`, f.detail)
  })
  return [body, top, ...disks]
}

const drawings: { readonly [K in TechKind]: TechDrawing } = {
  service: (f, r) =>
    [r.gen.polygon([f.at(0.25, 0), f.at(0.75, 0), f.at(1, 0.5), f.at(0.75, 1), f.at(0.25, 1), f.at(0, 0.5)], f.body)],

  database: (f, r) => cylinder(f, r, 1),

  cache: (f, r) => {
    // A cylinder with a lightning bolt: fast, in-memory.
    const bolt = r.gen.polygon(
      [f.at(0.86, 0.36), f.at(0.77, 0.56), f.at(0.84, 0.56), f.at(0.78, 0.76), f.at(0.92, 0.5), f.at(0.85, 0.5), f.at(0.9, 0.36)],
      f.detail,
    )
    return [...cylinder(f, r, 0), bolt]
  },

  queue: (f, r) => {
    // Horizontal pipe with message slots.
    const { x, y, w, h } = f
    const rx = Math.min(w * 0.08, h * 0.3)
    const body = r.gen.path(
      `M ${x + rx} ${y} L ${x + w - rx} ${y} A ${rx} ${h / 2} 0 0 1 ${x + w - rx} ${y + h} L ${x + rx} ${y + h} A ${rx} ${h / 2} 0 0 1 ${x + rx} ${y} Z`,
      f.body,
    )
    const cap = r.gen.ellipse(x + w - rx, y + h / 2, rx * 2, h, f.detail)
    const slots = [0.18, 0.3].map((fx) => r.gen.line(...f.at(fx, 0.12), ...f.at(fx, 0.88), f.detail))
    return [body, cap, ...slots]
  },

  storage: (f, r) => {
    // Bucket: a rim and a tapering body.
    const { x, y, w, h } = f
    const ry = Math.min(h * 0.12, w * 0.16)
    const bottomRy = ry * 0.6
    const body = r.gen.path(
      `M ${x} ${y + ry} L ${x + w * 0.12} ${y + h - bottomRy} A ${w * 0.38} ${bottomRy} 0 0 0 ${x + w * 0.88} ${y + h - bottomRy} L ${x + w} ${y + ry}`,
      f.body,
    )
    return [body, r.gen.ellipse(x + w / 2, y + ry, w, ry * 2, f.body)]
  },

  function: (f, r) => {
    const { x, y, w, h } = f
    const size = Math.min(w * 0.62, h * 0.52)
    const left = x + (w - size) / 2
    const top = y + h * 0.04
    const c = size * 0.18
    const square = r.gen.path(
      `M ${left + c} ${top} H ${left + size - c} Q ${left + size} ${top} ${left + size} ${top + c} V ${top + size - c} Q ${left + size} ${top + size} ${left + size - c} ${top + size} H ${left + c} Q ${left} ${top + size} ${left} ${top + size - c} V ${top + c} Q ${left} ${top} ${left + c} ${top} Z`,
      f.body,
    )
    return [square]
  },

  server: (f, r) => {
    const outline = r.gen.rectangle(f.x, f.y, f.w, f.h, f.body)
    const bays = [0.22, 0.44].map((fy) => r.gen.line(...f.at(0, fy), ...f.at(1, fy), f.detail))
    const leds = [0.11, 0.33].map((fy) => r.gen.circle(...f.at(0.84, fy), Math.min(f.w, f.h) * 0.07, f.detail))
    const vents = [0.11, 0.33].map((fy) => r.gen.line(...f.at(0.1, fy), ...f.at(0.5, fy), f.detail))
    return [outline, ...bays, ...leds, ...vents]
  },

  gateway: (f, r) => {
    // Two pillars and a beam, with traffic passing through.
    const pillar = (fx: number) => r.gen.rectangle(...f.at(fx, 0.16), f.w * 0.12, f.h * 0.84, f.body)
    const beam = r.gen.rectangle(f.x, f.y, f.w, f.h * 0.16, f.body)
    const arrow = r.gen.linearPath([f.at(0.24, 0.3), f.at(0.76, 0.3)], f.detail)
    const head = r.gen.linearPath([f.at(0.69, 0.23), f.at(0.76, 0.3), f.at(0.69, 0.37)], f.detail)
    return [beam, pillar(0), pillar(0.88), arrow, head]
  },

  loadBalancer: (f, r) => {
    const { w, h } = f
    const [cx, cy] = f.at(0.5, 0.3)
    const radius = Math.min(w, h * 0.6) * 0.28
    const circle = r.gen.circle(cx, cy, radius * 2, f.body)
    const inbound = r.gen.line(cx - radius * 0.75, cy, cx - radius * 0.05, cy, f.detail)
    const fan = [-0.55, 0, 0.55].map((dy) =>
      r.gen.line(cx - radius * 0.05, cy, cx + radius * 0.7, cy + dy * radius, f.detail),
    )
    return [circle, inbound, ...fan]
  },

  external: (f, r) => {
    const p = (fx: number, fy: number) => f.at(fx, fy).join(' ')
    const cloud = r.gen.path(
      `M ${p(0.2, 0.86)} C ${p(0.02, 0.86)} ${p(0.02, 0.5)} ${p(0.2, 0.5)} C ${p(0.2, 0.16)} ${p(0.52, 0.1)} ${p(0.56, 0.34)} C ${p(0.64, 0.14)} ${p(0.94, 0.2)} ${p(0.86, 0.5)} C ${p(1, 0.54)} ${p(0.98, 0.86)} ${p(0.8, 0.86)} Z`,
      f.body,
    )
    return [cloud]
  },

  web: (f, r) => {
    const outline = r.gen.rectangle(f.x, f.y, f.w, f.h, f.body)
    const bar = r.gen.line(...f.at(0, 0.18), ...f.at(1, 0.18), f.detail)
    const dot = Math.min(f.w, f.h) * 0.05
    const dots = [0.06, 0.11, 0.16].map((fx) => r.gen.circle(...f.at(fx, 0.09), dot, f.detail))
    return [outline, bar, ...dots]
  },

  mobile: (f, r) => {
    const { x, y, w, h } = f
    const ph = h * 0.6
    const pw = Math.min(ph * 0.56, w * 0.7)
    const left = x + (w - pw) / 2
    const top = y + h * 0.02
    const phone = r.gen.rectangle(left, top, pw, ph, f.body)
    const speaker = r.gen.line(left + pw * 0.38, top + ph * 0.07, left + pw * 0.62, top + ph * 0.07, f.detail)
    const button = r.gen.circle(left + pw / 2, top + ph * 0.9, pw * 0.12, f.detail)
    return [phone, speaker, button]
  },

  user: (f, r) => {
    const { w, h } = f
    const s = Math.min(w, h * 0.62)
    const [cx, headY] = f.at(0.5, 0.13)
    const head = r.gen.circle(cx, headY, s * 0.24, f.body)
    const neck = headY + s * 0.12
    const hip = f.y + h * 0.43
    const torso = r.gen.line(cx, neck, cx, hip, f.detail)
    const arms = r.gen.line(cx - s * 0.26, neck + s * 0.14, cx + s * 0.26, neck + s * 0.14, f.detail)
    const legs = r.gen.linearPath(
      [
        [cx - s * 0.2, f.y + h * 0.6],
        [cx, hip],
        [cx + s * 0.2, f.y + h * 0.6],
      ],
      f.detail,
    )
    return [head, torso, arms, legs]
  },
}

/** Glyphs drawn as text on top of the rough drawing. */
function drawOverlay(el: TechElement, ctx: CanvasRenderingContext2D): void {
  if (el.kind !== 'function') return
  const size = Math.min(el.width * 0.62, el.height * 0.52)
  ctx.save()
  ctx.font = fontFor(size * 0.62)
  ctx.fillStyle = el.style.strokeColor
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('λ', el.x + el.width / 2, el.y + el.height * 0.04 + size / 2)
  ctx.restore()
}

export function renderTech(el: TechElement, r: RenderContext): void {
  if (el.width < 2 || el.height < 2) return
  const body = roughOptions(el)
  const frame: Frame = {
    x: el.x,
    y: el.y,
    w: el.width,
    h: el.height,
    at: (fx, fy) => [el.x + el.width * fx, el.y + el.height * fy],
    body,
    detail: { ...body, fill: undefined },
  }
  drawCached(el, r, () => drawings[el.kind](frame, r))
  drawOverlay(el, r.ctx)
}
