import { Placeholder } from '@tiptap/extensions'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { useImperativeHandle, type Ref } from 'react'
import type { RichText } from '@/domain/document/richText'
import { fromEditorContent, toEditorContent } from './richTextAdapter'
import { SelectionToolbar } from './SelectionToolbar'

/**
 * Minimal WYSIWYG editor. No permanent toolbar: markdown shortcuts (`# `,
 * `- `, `1. `, `> `, `**bold**`) and a mini toolbar on selection.
 */
export interface RichTextEditorHandle {
  focusStart(): void
}

export function RichTextEditor({
  initialContent,
  onChange,
  ref,
}: {
  initialContent: RichText
  onChange: (content: RichText) => void
  ref?: Ref<RichTextEditorHandle>
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ link: { openOnClick: false } }),
      Placeholder.configure({ placeholder: 'Начните писать… (# — заголовок, - — список)' }),
    ],
    content: toEditorContent(initialContent),
    editorProps: {
      attributes: {
        class: 'prose prose-slate max-w-none min-h-[50vh] outline-none',
      },
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
      <EditorContent editor={editor} />
      <SelectionToolbar editor={editor} />
    </>
  )
}
