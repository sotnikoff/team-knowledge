import { useState, type ReactNode } from 'react'
import { getModel, useEditor } from '../editor/store'
import {
  downloadBlob,
  EXPORT_FORMATS,
  exportFileName,
  exportImage,
  type ExportFormat,
} from '../export/exportImage'
import { Island } from './Island'

type Scope = 'all' | 'selection'

const SCALES = [1, 2, 3] as const

/** "Экспорт" popover: whole board or selection, PNG / JPEG / BMP. */
export function ExportMenu(props: { boardName: string }) {
  const [open, setOpen] = useState(false)
  const [scope, setScope] = useState<Scope>('all')
  const [format, setFormat] = useState<ExportFormat>('png')
  const [scale, setScale] = useState<number>(2)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const selectedCount = useEditor((m) => m.selectedIds.length)
  const isEmpty = useEditor((m) => m.elements.length === 0)

  const toggle = () => {
    setError(null)
    // Default to the selection when there is one.
    if (!open) setScope(getModel().selectedIds.length > 0 ? 'selection' : 'all')
    setOpen((o) => !o)
  }

  const run = async () => {
    const m = getModel()
    const selected = new Set(m.selectedIds)
    const elements = scope === 'selection' ? m.elements.filter((el) => selected.has(el.id)) : m.elements
    setBusy(true)
    setError(null)
    try {
      const blob = await exportImage({
        elements,
        format,
        scale,
        findCardNode: (id) => document.querySelector<HTMLElement>(`[data-element-id="${CSS.escape(id)}"]`),
      })
      downloadBlob(blob, exportFileName(props.boardName, format))
      setOpen(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось экспортировать')
    } finally {
      setBusy(false)
    }
  }

  const segment = (active: boolean) =>
    `flex-1 rounded-md px-2 py-1 text-sm disabled:opacity-40 ${
      active ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
    }`

  return (
    <div className="relative">
      <Island className="flex">
        <button
          type="button"
          title="Экспорт в картинку"
          aria-expanded={open}
          disabled={isEmpty}
          onClick={toggle}
          className={`flex h-9 items-center gap-1.5 rounded-md px-2.5 text-sm disabled:opacity-40 ${
            open ? 'bg-indigo-100 text-indigo-700' : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
          </svg>
          Экспорт
        </button>
      </Island>
      {open && (
        <Island className="absolute right-0 top-12 z-20 flex w-72 flex-col gap-3 p-3">
          <Field label="Что экспортировать">
            <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
              <button type="button" className={segment(scope === 'all')} aria-pressed={scope === 'all'} onClick={() => setScope('all')}>
                Весь холст
              </button>
              <button
                type="button"
                className={segment(scope === 'selection')}
                aria-pressed={scope === 'selection'}
                disabled={selectedCount === 0}
                title={selectedCount === 0 ? 'Сначала выделите элементы' : undefined}
                onClick={() => setScope('selection')}
              >
                Выделенное{selectedCount > 0 ? ` (${selectedCount})` : ''}
              </button>
            </div>
          </Field>
          <Field label="Формат">
            <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
              {EXPORT_FORMATS.map((f) => (
                <button key={f.id} type="button" className={segment(format === f.id)} aria-pressed={format === f.id} onClick={() => setFormat(f.id)}>
                  {f.label}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Масштаб">
            <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
              {SCALES.map((s) => (
                <button key={s} type="button" className={segment(scale === s)} aria-pressed={scale === s} onClick={() => setScale(s)}>
                  {s}×
                </button>
              ))}
            </div>
          </Field>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="button"
            disabled={busy}
            onClick={() => void run()}
            className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {busy ? 'Готовлю…' : 'Скачать'}
          </button>
        </Island>
      )}
    </div>
  )
}

function Field(props: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-slate-500">{props.label}</span>
      {props.children}
    </div>
  )
}
