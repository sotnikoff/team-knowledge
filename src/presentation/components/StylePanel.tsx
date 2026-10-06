import type { ReactNode } from 'react'
import * as editor from '@/application/editor/editorModel'
import { findElement } from '@/application/editor/scene'
import { arrowStyleOf, type ArrowSides, type ArrowStyle } from '@/domain/element/linear'
import type { LayerMove } from '@/domain/element/order'
import {
  isLinearElement,
  TRANSPARENT,
  type Arrowhead,
  type ElementStyle,
  type FillStyle,
} from '@/domain/element/types'
import type { EditorModel } from '@/application/editor/editorModel'
import { dispatch, useEditor } from '../editor/store'
import { cx } from '../ui/cx'
import { Panel } from '../ui/Panel'
import styles from './StylePanel.module.css'
import { useI18n, type MessageKey } from '../i18n/i18n'
import { layerShortcutLabel } from '../editor/useEditorShortcuts'

// Open Color shades (as in Excalidraw): strong ones for strokes, light ones for fills.
// Stored as-is; the dark theme shows them through the board-ink filter.
const strokeColors = [
  '#1e1e1e', // black
  '#868e96', // gray
  '#e03131', // red
  '#c2255c', // pink
  '#7048e8', // violet
  '#1971c2', // blue
  '#0c8599', // cyan
  '#2f9e44', // green
  '#f08c00', // orange
  '#846358', // brown
]
const fillColors = [
  TRANSPARENT,
  '#ffffff', // white: hides what lies underneath
  '#ffc9c9', // red
  '#fcc2d7', // pink
  '#d0bfff', // violet
  '#a5d8ff', // blue
  '#99e9f2', // cyan
  '#b2f2bb', // green
  '#ffec99', // yellow
  '#ffd8a8', // orange
]
const widths: { value: number; label: MessageKey }[] = [
  { value: 1, label: 'style.thin' },
  { value: 2, label: 'style.medium' },
  { value: 4, label: 'style.thick' },
]
const roughnesses: { value: number; label: MessageKey }[] = [
  { value: 0, label: 'style.architect' },
  { value: 1, label: 'style.artist' },
  { value: 2, label: 'style.cartoonist' },
]

const fillStyles: { value: FillStyle; label: MessageKey; icon: ReactNode }[] = [
  {
    value: 'hachure',
    label: 'style.hachure',
    icon: <path d="M3 13 13 3M3 8l5-5M8 13l5-5" />,
  },
  {
    value: 'cross-hatch',
    label: 'style.crossHatch',
    icon: <path d="M3 13 13 3M3 8l5-5M8 13l5-5M3 3l10 10M3 8l5 5M8 3l5 5" />,
  },
  {
    value: 'solid',
    label: 'style.solid',
    icon: <rect x="3" y="3" width="10" height="10" rx="1" fill="currentColor" />,
  },
]

const layerMoves: { value: LayerMove; label: MessageKey; icon: string }[] = [
  { value: 'back', label: 'layers.back', icon: 'M8 3v8M4.5 7.5 8 11l3.5-3.5M3 13.5h10' },
  { value: 'backward', label: 'layers.backward', icon: 'M8 3v10M4.5 9.5 8 13l3.5-3.5' },
  { value: 'forward', label: 'layers.forward', icon: 'M8 13V3M4.5 6.5 8 3l3.5 3.5' },
  { value: 'front', label: 'layers.front', icon: 'M8 13V5M4.5 8.5 8 5l3.5 3.5M3 2.5h10' },
]

// Arrow icons: a line with heads (24×14).
const SHAFT = 'M3 7h18'
const arrowSides: { value: ArrowSides; label: MessageKey; icon: string }[] = [
  { value: 'end', label: 'arrow.end', icon: `${SHAFT}M16 3l5 4-5 4` },
  { value: 'start', label: 'arrow.start', icon: `${SHAFT}M8 3L3 7l5 4` },
  { value: 'both', label: 'arrow.both', icon: `${SHAFT}M16 3l5 4-5 4M8 3L3 7l5 4` },
  { value: 'none', label: 'arrow.none', icon: SHAFT },
]

const arrowheads: { value: Arrowhead; label: MessageKey; icon: ReactNode }[] = [
  { value: 'arrow', label: 'arrowhead.arrow', icon: <path d="M3 7h18M15 3l6 4-6 4" /> },
  {
    value: 'triangle',
    label: 'arrowhead.triangle',
    icon: <path d="M3 7h12M15 3l6 4-6 4z" fill="currentColor" />,
  },
  {
    value: 'dot',
    label: 'arrowhead.dot',
    icon: (
      <>
        <path d="M3 7h13" />
        <circle cx="18" cy="7" r="3" fill="currentColor" />
      </>
    ),
  },
  {
    value: 'diamond',
    label: 'arrowhead.diamond',
    icon: <path d="M3 7h9M12 7l4.5-3.5L21 7l-4.5 3.5z" fill="currentColor" />,
  },
  { value: 'bar', label: 'arrowhead.bar', icon: <path d="M3 7h18M21 2v10" /> },
]

/**
 * Arrow settings to show: those of the first selected line/arrow, or the
 * defaults while the arrow tool is armed; null = no arrow section.
 */
function shownArrowStyle(m: EditorModel): ArrowStyle | null {
  const line = m.elements.find((el) => m.selectedIds.includes(el.id) && isLinearElement(el))
  if (line && isLinearElement(line)) return arrowStyleOf(line, m.arrowStyle.head)
  return m.selectedIds.length === 0 && m.tool === 'arrow' ? m.arrowStyle : null
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className={styles.section}>
      <span className={styles.title}>{title}</span>
      <div className={styles.row}>{children}</div>
    </div>
  )
}

function Swatch({ color, active, onClick }: { color: string; active: boolean; onClick: () => void }) {
  const { t } = useI18n()
  const transparent = color === TRANSPARENT
  return (
    <button
      type="button"
      title={transparent ? t('style.noFill') : color}
      aria-label={transparent ? t('style.noFill') : color}
      aria-pressed={active}
      onClick={onClick}
      className={cx(styles.swatch, active && styles.selected)}
    >
      <span
        className={cx('board-ink', styles.swatchColor, transparent && styles.transparent)}
        style={transparent ? undefined : { background: color }}
      />
    </button>
  )
}

function OptionButton(props: {
  label: string
  hint?: string
  active: boolean
  /** Narrower button, so five fit in a row. */
  compact?: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      title={props.hint ? `${props.label} (${props.hint})` : props.label}
      aria-label={props.label}
      aria-pressed={props.active}
      onClick={props.onClick}
      className={cx(styles.option, props.compact && styles.compact, props.active && styles.selected)}
    >
      {props.children}
    </button>
  )
}

export function StylePanel() {
  const { t } = useI18n()
  const tool = useEditor((m) => m.tool)
  const hasSelection = useEditor((m) => m.selectedIds.length > 0)
  // Show the first selected element's style, or the style for new elements.
  const style = useEditor((m) => findElement(m.elements, m.selectedIds[0] ?? null)?.style ?? m.style)

  // Document cards have no drawing style, so there is nothing to show for them.
  const onlyDocuments = useEditor(
    (m) => m.selectedIds.length > 0 && m.elements.every((el) => !m.selectedIds.includes(el.id) || el.type === 'document'),
  )

  // `undefined` = no line/arrow selected; otherwise the shape of the first one.
  const curved = useEditor((m) => {
    const line = m.elements.find((el) => m.selectedIds.includes(el.id) && isLinearElement(el))
    return line && isLinearElement(line) ? line.curved : undefined
  })

  // Primitives only: a selector returning a fresh object would re-render forever.
  const arrowSidesShown = useEditor((m) => shownArrowStyle(m)?.sides)
  const arrowheadShown = useEditor((m) => shownArrowStyle(m)?.head)

  if (!hasSelection && (tool === 'select' || tool === 'hand')) return null

  const apply = (patch: Partial<ElementStyle>) => dispatch((m) => editor.applyStyle(m, patch))

  // Order is the only thing a document card can change here.
  const layers = hasSelection && (
    <Section title={t('style.layers')}>
      {layerMoves.map((l) => (
        <OptionButton
          key={l.value}
          label={t(l.label)}
          hint={layerShortcutLabel(l.value)}
          active={false}
          onClick={() => dispatch((m) => editor.reorderSelected(m, l.value))}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d={l.icon} />
          </svg>
        </OptionButton>
      ))}
    </Section>
  )

  if (onlyDocuments) {
    return (
      <Panel padding="none" className={styles.panel}>
        {layers}
      </Panel>
    )
  }

  return (
    <Panel padding="none" className={styles.panel}>
      <Section title={t('style.stroke')}>
        {strokeColors.map((c) => (
          <Swatch key={c} color={c} active={style.strokeColor === c} onClick={() => apply({ strokeColor: c })} />
        ))}
      </Section>
      <Section title={t('style.fill')}>
        {fillColors.map((c) => (
          <Swatch key={c} color={c} active={style.fillColor === c} onClick={() => apply({ fillColor: c })} />
        ))}
      </Section>
      {style.fillColor !== TRANSPARENT && (
        <Section title={t('style.fillStyle')}>
          {fillStyles.map((f) => (
            <OptionButton
              key={f.value}
              label={t(f.label)}
              active={style.fillStyle === f.value}
              onClick={() => apply({ fillStyle: f.value })}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
                {f.icon}
              </svg>
            </OptionButton>
          ))}
        </Section>
      )}
      <Section title={t('style.width')}>
        {widths.map((w) => (
          <OptionButton
            key={w.value}
            label={t(w.label)}
            active={style.strokeWidth === w.value}
            onClick={() => apply({ strokeWidth: w.value })}
          >
            <span className={styles.widthSample} style={{ height: w.value + 0.5 }} />
          </OptionButton>
        ))}
      </Section>
      <Section title={t('style.sloppiness')}>
        {roughnesses.map((r) => (
          <OptionButton
            key={r.value}
            label={t(r.label)}
            active={style.roughness === r.value}
            onClick={() => apply({ roughness: r.value })}
          >
            <svg width="22" height="12" viewBox="0 0 22 12" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d={['M1 6h20', 'M1 7c5-3 8 2 12-1s6 0 8-1', 'M1 8c3-6 5 4 8-2s4 5 7-1 4 1 5-1'][r.value]} />
            </svg>
          </OptionButton>
        ))}
      </Section>
      {curved !== undefined && (
        <Section title={t('style.line')}>
          <OptionButton label={t('style.curved')} active={curved} onClick={() => dispatch((m) => editor.setLinesCurved(m, true))}>
            <svg width="22" height="14" viewBox="0 0 22 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M1 12C6 12 6 2 11 2s5 10 10 10" />
            </svg>
          </OptionButton>
          <OptionButton label={t('style.sharp')} active={!curved} onClick={() => dispatch((m) => editor.setLinesCurved(m, false))}>
            <svg width="22" height="14" viewBox="0 0 22 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round">
              <path d="M1 12L11 2l10 10" />
            </svg>
          </OptionButton>
        </Section>
      )}
      {arrowSidesShown !== undefined && (
        <Section title={t('style.arrow')}>
          {arrowSides.map((a) => (
            <OptionButton
              key={a.value}
              label={t(a.label)}
              active={arrowSidesShown === a.value}
              onClick={() => dispatch((m) => editor.setArrowStyle(m, { sides: a.value }))}
            >
              <svg width="24" height="14" viewBox="0 0 24 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d={a.icon} />
              </svg>
            </OptionButton>
          ))}
        </Section>
      )}
      {arrowSidesShown !== undefined && arrowSidesShown !== 'none' && (
        <Section title={t('style.arrowhead')}>
          {arrowheads.map((h) => (
            <OptionButton
              key={h.value}
              label={t(h.label)}
              compact
              active={arrowheadShown === h.value}
              onClick={() => dispatch((m) => editor.setArrowStyle(m, { head: h.value }))}
            >
              <svg width="24" height="14" viewBox="0 0 24 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                {h.icon}
              </svg>
            </OptionButton>
          ))}
        </Section>
      )}
      {layers}
    </Panel>
  )
}
