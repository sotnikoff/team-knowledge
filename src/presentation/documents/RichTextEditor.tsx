import { EditorContent, useEditor } from '@tiptap/react'
import { useImperativeHandle, type ReactNode, type Ref } from 'react'
import type { RichText } from '@/domain/document/richText'
import { EditorToolbar } from './EditorToolbar'
import { documentExtensions } from './extensions'
import { fromEditorContent, toEditorContent } from './richTextAdapter'
import { SelectionToolbar } from './SelectionToolbar'
import styles from './RichTextEditor.module.css'
import { useI18n } from '../i18n/i18n'

export interface RichTextEditorHandle {
  focusStart(): void
}

/**
 * Document editor: sticky toolbar on top, optional `header` (the title) and
 * the text. Markdown shortcuts work as well (`# `, `- `, `[] `, `> `, ```).
 */
export function RichTextEditor({
  initialContent,
  onChange,
  header,
  toolbarEnd,
  ref,
}: {
  initialContent: RichText
  onChange: (content: RichText) => void
  header?: ReactNode
  toolbarEnd?: ReactNode
  ref?: Ref<RichTextEditorHandle>
}) {
  const { t } = useI18n()
  const editor = useEditor({
    extensions: documentExtensions({ placeholder: t('document.placeholder') }),
    content: toEditorContent(initialContent),
    editorProps: {
      attributes: { class: `document-prose ${styles.content}` },
    },
    onUpdate: ({ editor: e }) => onChange(fromEditorContent(e.getJSON())),
  })

  // Focus synchronously: `commands.focus` defers to requestAnimationFrame, which
  // loses the race with the title input keeping focus after Enter.
  useImperativeHandle(
    ref,
    () => ({
      focusStart: () => {
        editor.commands.setTextSelection(1)
        editor.view.focus()
      },
    }),
    [editor],
  )

  return (
    <>
      <EditorToolbar editor={editor} end={toolbarEnd} />
      <div className={styles.page}>
        <div className={styles.sheet}>
          {header}
          <EditorContent editor={editor} />
        </div>
      </div>
      <SelectionToolbar editor={editor} />
    </>
  )
}
