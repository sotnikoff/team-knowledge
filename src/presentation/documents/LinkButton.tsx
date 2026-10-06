import type { Editor } from '@tiptap/react'
import { useCallback, useState, type FormEvent } from 'react'
import { useI18n } from '../i18n/i18n'
import { Button } from '../ui/Button'
import { cx } from '../ui/cx'
import { Input } from '../ui/Input'
import { Popover } from '../ui/Popover'
import styles from './LinkButton.module.css'
import buttonStyles from './ToolbarButton.module.css'

const linkIcon = (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1" />
  </svg>
)

/** Link button with a small URL popover (no blocking `window.prompt`). */
export function LinkButton(props: { editor: Editor; href: string | undefined }) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState('')

  const apply = (e: FormEvent) => {
    e.preventDefault()
    const chain = props.editor.chain().focus().extendMarkRange('link')
    if (url.trim() === '') chain.unsetLink().run()
    else chain.setLink({ href: url.trim() }).run()
    setOpen(false)
  }

  const close = useCallback(() => setOpen(false), [])

  return (
    <Popover
      open={open}
      onClose={close}
      align="start"
      className={styles.popover}
      trigger={
        <button
          type="button"
          title={t('format.link')}
          aria-label={t('format.link')}
          aria-pressed={Boolean(props.href)}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            setUrl(props.href ?? '')
            setOpen((o) => !o)
          }}
          className={cx(buttonStyles.button, props.href && buttonStyles.active)}
        >
          {linkIcon}
        </button>
      }
    >
      <form onSubmit={apply} className={styles.form}>
        <Input
          autoFocus
          inputSize="sm"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://…"
          aria-label={t('format.linkUrl')}
          className={styles.input}
        />
        <Button type="submit" variant="primary" size="sm">
          {url.trim() === '' && props.href ? t('format.linkRemove') : 'OK'}
        </Button>
      </form>
    </Popover>
  )
}
