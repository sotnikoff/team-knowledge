import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { getModel, useEditor } from '../editor/store'
import {
  ClipboardUnavailableError,
  copyImageToClipboard,
  downloadBlob,
  EXPORT_FORMATS,
  exportFileName,
  exportImage,
  NothingToExportError,
  type ExportFormat,
  type ExportTheme,
} from '../export/exportImage'
import type { DiagramElement, ElementId } from '@/domain/element/types'
import { useI18n } from '../i18n/i18n'
import { Button } from '../ui/Button'
import { cx } from '../ui/cx'
import { Panel } from '../ui/Panel'
import { Popover } from '../ui/Popover'
import { SegmentedControl } from '../ui/SegmentedControl'
import styles from './ExportMenu.module.css'
import { ExportPreview } from './ExportPreview'

type Scope = 'all' | 'selection'
type Action = 'download' | 'copy'

/** How long "Copied" stays visible before the menu closes. */
const COPIED_FEEDBACK_MS = 900

const SCALES = [1, 2, 3] as const

function elementsToExport(elements: readonly DiagramElement[], selectedIds: readonly ElementId[], scope: Scope) {
  if (scope === 'all') return elements
  const selected = new Set(selectedIds)
  return elements.filter((el) => selected.has(el.id))
}

const findCardNode = (id: string) => document.querySelector<HTMLElement>(`[data-element-id="${CSS.escape(id)}"]`)

/** "Экспорт" popover with a live preview: whole board or selection, light or dark, PNG / JPEG / BMP, or a PNG straight to the clipboard. */
export function ExportMenu(props: { boardName: string }) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [scope, setScope] = useState<Scope>('all')
  const [format, setFormat] = useState<ExportFormat>('png')
  const [scale, setScale] = useState<number>(2)
  const [theme, setTheme] = useState<ExportTheme>('light')
  const [busy, setBusy] = useState<Action | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const selectedCount = useEditor((m) => m.selectedIds.length)
  const isEmpty = useEditor((m) => m.elements.length === 0)

  const toggle = () => {
    setError(null)
    setCopied(false)
    // Default to the selection when there is one.
    if (!open) setScope(getModel().selectedIds.length > 0 ? 'selection' : 'all')
    setOpen((o) => !o)
  }

  const run = async (action: Action) => {
    const m = getModel()
    setBusy(action)
    setError(null)
    setCopied(false)
    // The clipboard only reliably takes PNG, whatever format is chosen for files.
    const image = exportImage({
      elements: elementsToExport(m.elements, m.selectedIds, scope),
      format: action === 'copy' ? 'png' : format,
      scale,
      theme,
      findCardNode,
    })
    try {
      if (action === 'copy') {
        await copyImageToClipboard(image)
        setCopied(true)
        setTimeout(() => setOpen(false), COPIED_FEEDBACK_MS)
      } else {
        downloadBlob(await image, exportFileName(props.boardName, format))
        setOpen(false)
      }
    } catch (e) {
      setError(
        t(
          e instanceof NothingToExportError
            ? 'export.nothing'
            : e instanceof ClipboardUnavailableError
              ? 'export.copyUnsupported'
              : action === 'copy'
                ? 'export.copyFailed'
                : 'export.failed',
        ),
      )
    } finally {
      setBusy(null)
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
      {open && <ScopePreview scope={scope} theme={theme} />}
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
      <Field label={t('export.theme')}>
        <SegmentedControl<ExportTheme>
          label={t('export.theme')}
          value={theme}
          onChange={setTheme}
          options={[
            { value: 'light', label: t('export.themeLight') },
            { value: 'dark', label: t('export.themeDark') },
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
      <div className={styles.actions}>
        <Button variant="primary" disabled={busy !== null} onClick={() => void run('download')}>
          {busy === 'download' ? t('export.preparing') : t('export.download')}
        </Button>
        <Button
          variant="subtle"
          disabled={busy !== null}
          onClick={() => void run('copy')}
          title={t('export.copyHint')}
          aria-live="polite"
        >
          {busy === 'copy' ? t('export.preparing') : copied ? t('export.copied') : t('export.copy')}
        </Button>
      </div>
    </Popover>
  )
}

/** Mounted only while the menu is open, so the closed menu does not re-render on every board change. */
function ScopePreview(props: { scope: Scope; theme: ExportTheme }) {
  const elements = useEditor((m) => m.elements)
  const selectedIds = useEditor((m) => m.selectedIds)
  const toExport = useMemo(() => elementsToExport(elements, selectedIds, props.scope), [elements, selectedIds, props.scope])
  return <ExportPreview elements={toExport} theme={props.theme} findCardNode={findCardNode} />
}

function Field(props: { label: string; children: ReactNode }) {
  return (
    <div className={styles.field}>
      <span className={styles.label}>{props.label}</span>
      {props.children}
    </div>
  )
}
