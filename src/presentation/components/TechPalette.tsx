import { useCallback, useState } from 'react'
import * as editor from '@/application/editor/editorModel'
import { TECH_KINDS } from '@/domain/element/tech'
import { dispatch, useEditor } from '../editor/store'
import { toolHint } from '../editor/useEditorShortcuts'
import { useI18n } from '../i18n/i18n'
import { cx } from '../ui/cx'
import { IconButton } from '../ui/IconButton'
import { Popover } from '../ui/Popover'
import { TechIcon } from './techIcons'
import styles from './TechPalette.module.css'

/** Toolbar button with the catalogue of architecture components. */
export function TechPalette() {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const close = useCallback(() => setOpen(false), [])
  const active = useEditor((m) => m.tool === 'tech')
  const current = useEditor((m) => m.techKind)

  return (
    <Popover
      open={open}
      onClose={close}
      align="start"
      className={styles.palette}
      trigger={
        <IconButton
          label={t('tools.tech')}
          {...toolHint('tech', t('common.or'))}
          active={active || open}
          onClick={() => setOpen((o) => !o)}
        >
          <span className={styles.triggerIcon}><TechIcon kind={current} /></span>
        </IconButton>
      }
    >
      <p className={styles.title}>{t('tools.tech')}</p>
      <div className={styles.grid}>
        {TECH_KINDS.map((kind) => (
          <button
            key={kind}
            type="button"
            className={cx(styles.item, active && current === kind && styles.selected)}
            onClick={() => {
              dispatch((m) => editor.chooseTechKind(m, kind))
              setOpen(false)
            }}
          >
            <TechIcon kind={kind} />
            <span className={styles.name}>{t(`tech.${kind}`)}</span>
          </button>
        ))}
      </div>
    </Popover>
  )
}
