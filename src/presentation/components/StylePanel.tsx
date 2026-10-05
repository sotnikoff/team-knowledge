import type { ReactNode } from 'react'
import * as editor from '@/application/editor/editorModel'
import { findElement } from '@/application/editor/scene'
import { isLinearElement, TRANSPARENT, type ElementStyle } from '@/domain/element/types'
import { dispatch, useEditor } from '../editor/store'
import { Island } from './Island'

const strokeColors = ['#1e1e1e', '#e03131', '#2f9e44', '#1971c2', '#f08c00']
const fillColors = [TRANSPARENT, '#ffc9c9', '#b2f2bb', '#a5d8ff', '#ffec99']
const widths = [
  { value: 1, label: 'Тонкая' },
  { value: 2, label: 'Средняя' },
  { value: 4, label: 'Толстая' },
]
const roughnesses = [
  { value: 0, label: 'Ровно' },
  { value: 1, label: 'Небрежно' },
  { value: 2, label: 'Очень небрежно' },
]

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-slate-500">{title}</span>
      <div className="flex gap-1">{children}</div>
    </div>
  )
}

function Swatch({ color, active, onClick }: { color: string; active: boolean; onClick: () => void }) {
  const transparent = color === TRANSPARENT
  return (
    <button
      type="button"
      title={transparent ? 'Без заливки' : color}
      aria-label={transparent ? 'Без заливки' : color}
      aria-pressed={active}
      onClick={onClick}
      className={`board-ink h-7 w-7 rounded-md border ${active ? 'ring-2 ring-indigo-500 ring-offset-1' : 'border-slate-300'}`}
      style={{
        background: transparent
          ? 'repeating-conic-gradient(#e2e8f0 0% 25%, #fff 0% 50%) 50% / 10px 10px'
          : color,
      }}
    />
  )
}

function OptionButton(props: { label: string; active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      title={props.label}
      aria-label={props.label}
      aria-pressed={props.active}
      onClick={props.onClick}
      className={`flex h-7 w-9 items-center justify-center rounded-md border ${
        props.active ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:bg-slate-50'
      }`}
    >
      {props.children}
    </button>
  )
}

export function StylePanel() {
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

  if (!hasSelection && (tool === 'select' || tool === 'hand')) return null
  if (onlyDocuments) return null

  const apply = (patch: Partial<ElementStyle>) => dispatch((m) => editor.applyStyle(m, patch))

  return (
    <Island className="flex w-52 flex-col gap-3 p-3">
      <Section title="Обводка">
        {strokeColors.map((c) => (
          <Swatch key={c} color={c} active={style.strokeColor === c} onClick={() => apply({ strokeColor: c })} />
        ))}
      </Section>
      <Section title="Заливка">
        {fillColors.map((c) => (
          <Swatch key={c} color={c} active={style.fillColor === c} onClick={() => apply({ fillColor: c })} />
        ))}
      </Section>
      <Section title="Толщина">
        {widths.map((w) => (
          <OptionButton
            key={w.value}
            label={w.label}
            active={style.strokeWidth === w.value}
            onClick={() => apply({ strokeWidth: w.value })}
          >
            <span className="w-5 rounded-full bg-slate-800" style={{ height: w.value + 0.5 }} />
          </OptionButton>
        ))}
      </Section>
      <Section title="Стиль линий">
        {roughnesses.map((r) => (
          <OptionButton
            key={r.value}
            label={r.label}
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
        <Section title="Линия">
          <OptionButton label="Плавная" active={curved} onClick={() => dispatch((m) => editor.setLinesCurved(m, true))}>
            <svg width="22" height="14" viewBox="0 0 22 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M1 12C6 12 6 2 11 2s5 10 10 10" />
            </svg>
          </OptionButton>
          <OptionButton label="Ломаная" active={!curved} onClick={() => dispatch((m) => editor.setLinesCurved(m, false))}>
            <svg width="22" height="14" viewBox="0 0 22 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round">
              <path d="M1 12L11 2l10 10" />
            </svg>
          </OptionButton>
        </Section>
      )}
    </Island>
  )
}
