import { useCallback, useState, type ReactNode } from 'react'
import { getModel, useEditor } from '../editor/store'
import {
  downloadBlob,
  EXPORT_FORMATS,
  exportFileName,
  exportImage,
  NothingToExportError,
  type ExportFormat,
} from '../export/exportImage'
import { useI18n } from '../i18n/i18n'
import { Button } from '../ui/Button'
import { cx } from '../ui/cx'
import { Panel } from '../ui/Panel'
import { Popover } from '../ui/Popover'
import { SegmentedControl } from '../ui/SegmentedControl'
import styles from './ExportMenu.module.css'

type Scope = 'all' | 'selection'

const SCALES = [1, 2, 3] as const

/** "Экспорт" popover: whole board or selection, PNG / JPEG / BMP. */
export function ExportMenu(props: { boardName: string }) {
  const { t } = useI18n()
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
      setError(t(e instanceof NothingToExportError ? 'export.nothing' : 'export.failed'))
    } finally {
      setBusy(false)
    }
  }

  const closeMenu = useCallback(() => setOpen(false), [])

  return (
    <Popover
      open={open}
      onClose={closeMenu}
      className={styles.menu}
      trigger={
        <Panel>
          <button
            type="button"
            title={t('export.title')}
            aria-expanded={open}
            disabled={isEmpty}
            onClick={toggle}
            className={cx(styles.trigger, open && styles.triggerOpen)}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
            </svg>
            {t('export.button')}
          </button>
        </Panel>
      }
    >
      <Field label={t('export.what')}>
        <SegmentedControl<Scope>
          label={t('export.what')}
          value={scope}
          onChange={setScope}
          options={[
            { value: 'all', label: t('export.all') },
            {
              value: 'selection',
              label: selectedCount > 0 ? t('export.selectionCount', { count: selectedCount }) : t('export.selection'),
              disabled: selectedCount === 0,
              title: selectedCount === 0 ? t('export.selectFirst') : undefined,
            },
          ]}
        />
      </Field>
      <Field label={t('export.format')}>
        <SegmentedControl<ExportFormat>
          label={t('export.format')}
          value={format}
          onChange={setFormat}
          options={EXPORT_FORMATS.map((f) => ({ value: f.id, label: f.label }))}
        />
      </Field>
      <Field label={t('export.scale')}>
        <SegmentedControl<number>
          label={t('export.scale')}
          value={scale}
          onChange={setScale}
          options={SCALES.map((s) => ({ value: s, label: `${s}×` }))}
        />
      </Field>
      {error && <p className={styles.error}>{error}</p>}
      <Button variant="primary" disabled={busy} onClick={() => void run()} className={styles.download}>
        {busy ? t('export.preparing') : t('export.download')}
      </Button>
    </Popover>
  )
}

function Field(props: { label: string; children: ReactNode }) {
  return (
    <div className={styles.field}>
      <span className={styles.label}>{props.label}</span>
      {props.children}
    </div>
  )
}
