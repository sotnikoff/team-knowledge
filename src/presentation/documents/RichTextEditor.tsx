import { EditorContent, useEditor } from '@tiptap/react'
import { useImperativeHandle, type ReactNode, type Ref } from 'react'
import type { RichText } from '@/domain/document/richText'
import { EditorToolbar } from './EditorToolbar'
import { documentExtensions } from './extensions'
import { fromEditorContent, toEditorContent } from './richTextAdapter'
import { SelectionToolbar } from './SelectionToolbar'

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
  const editor = useEditor({
    extensions: documentExtensions({ placeholder: 'Начните писать… или выберите стиль на панели сверху' }),
    content: toEditorContent(initialContent),
    editorProps: {
      attributes: { class: 'document-prose min-h-[50vh] outline-none' },
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
      <div className="mx-auto max-w-3xl px-8 pb-24 pt-8">
        {header}
        <EditorContent editor={editor} />
      </div>
      <SelectionToolbar editor={editor} />
    </>
  )
}
