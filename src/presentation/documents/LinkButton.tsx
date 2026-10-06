import type { Editor } from '@tiptap/react'
import { useState, type FormEvent } from 'react'
import { useI18n } from '../i18n/i18n'

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

  return (
    <span className="relative">
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
        className={`flex h-8 min-w-8 items-center justify-center rounded-md px-1.5 ${
          props.href ? 'bg-indigo-100 text-indigo-700' : 'text-slate-700 hover:bg-slate-100'
        }`}
      >
        {linkIcon}
      </button>
      {open && (
        <form
          onSubmit={apply}
          className="absolute left-0 top-10 z-20 flex w-80 gap-2 rounded-lg border border-slate-200 bg-surface p-2 shadow-lg"
        >
          <input
            autoFocus
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
            placeholder="https://…"
            aria-label={t('format.linkUrl')}
            className="min-w-0 flex-1 rounded border border-slate-300 px-2 py-1 text-sm outline-none focus:border-indigo-500"
          />
          <button type="submit" className="rounded bg-indigo-600 px-2 text-sm text-white hover:bg-indigo-500">
            {url.trim() === '' && props.href ? t('format.linkRemove') : 'OK'}
          </button>
        </form>
      )}
    </span>
  )
}
