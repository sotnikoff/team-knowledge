import { useEditorState, type Editor } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import type { ReactNode } from 'react'

interface Action {
  readonly label: string
  readonly content: ReactNode
  readonly isActive: (editor: Editor) => boolean
  readonly run: (editor: Editor) => void
}

/** The whole formatting vocabulary of the minimal editor. */
const actions: readonly (Action | 'separator')[] = [
  { label: 'Жирный (Ctrl+B)', content: <b>B</b>, isActive: (e) => e.isActive('bold'), run: (e) => e.chain().focus().toggleBold().run() },
  { label: 'Курсив (Ctrl+I)', content: <i>I</i>, isActive: (e) => e.isActive('italic'), run: (e) => e.chain().focus().toggleItalic().run() },
  { label: 'Зачёркнутый', content: <s>S</s>, isActive: (e) => e.isActive('strike'), run: (e) => e.chain().focus().toggleStrike().run() },
  { label: 'Код', content: <code className="text-xs">{'</>'}</code>, isActive: (e) => e.isActive('code'), run: (e) => e.chain().focus().toggleCode().run() },
  'separator',
  { label: 'Заголовок 1', content: 'H1', isActive: (e) => e.isActive('heading', { level: 1 }), run: (e) => e.chain().focus().toggleHeading({ level: 1 }).run() },
  { label: 'Заголовок 2', content: 'H2', isActive: (e) => e.isActive('heading', { level: 2 }), run: (e) => e.chain().focus().toggleHeading({ level: 2 }).run() },
  'separator',
  { label: 'Маркированный список', content: '•', isActive: (e) => e.isActive('bulletList'), run: (e) => e.chain().focus().toggleBulletList().run() },
  { label: 'Нумерованный список', content: '1.', isActive: (e) => e.isActive('orderedList'), run: (e) => e.chain().focus().toggleOrderedList().run() },
  { label: 'Цитата', content: '❝', isActive: (e) => e.isActive('blockquote'), run: (e) => e.chain().focus().toggleBlockquote().run() },
]

/** Mini toolbar that pops up above selected text. */
export function SelectionToolbar({ editor }: { editor: Editor }) {
  // Re-render only when the active states actually change.
  const active = useEditorState({
    editor,
    selector: ({ editor: e }) => actions.map((a) => (a === 'separator' ? false : a.isActive(e))),
    equalityFn: (a, b) => b !== null && a.length === b.length && a.every((v, i) => v === b[i]),
  })

  return (
    <BubbleMenu
      editor={editor}
      className="flex items-center gap-0.5 rounded-lg border border-slate-200 bg-white p-1 shadow-lg"
    >
      {actions.map((action, i) =>
        action === 'separator' ? (
          <span key={i} className="mx-0.5 h-5 w-px bg-slate-200" />
        ) : (
          <button
            key={action.label}
            type="button"
            title={action.label}
            aria-label={action.label}
            aria-pressed={active[i]}
            // Keep the text selection while clicking.
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => action.run(editor)}
            className={`flex h-7 min-w-7 items-center justify-center rounded px-1.5 text-sm ${
              active[i] ? 'bg-indigo-100 text-indigo-700' : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            {action.content}
          </button>
        ),
      )}
    </BubbleMenu>
  )
}
