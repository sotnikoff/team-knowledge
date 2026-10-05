import type { Editor } from '@tiptap/react'
import type { ReactNode } from 'react'
import { Svg } from './Svg'

/** One formatting command, shared by the toolbar and the selection menu. */
export interface FormatAction {
  readonly label: string
  readonly icon: ReactNode
  readonly isActive?: (editor: Editor) => boolean
  readonly isDisabled?: (editor: Editor) => boolean
  readonly run: (editor: Editor) => void
}

export const formatActions = {
  undo: {
    label: 'Отменить (Ctrl+Z)',
    icon: <Svg><path d="M9 14L4 9l5-5M4 9h10a6 6 0 010 12h-3" /></Svg>,
    isDisabled: (e) => !e.can().undo(),
    run: (e) => e.chain().focus().undo().run(),
  },
  redo: {
    label: 'Повторить (Ctrl+Shift+Z)',
    icon: <Svg><path d="M15 14l5-5-5-5M20 9H10a6 6 0 000 12h3" /></Svg>,
    isDisabled: (e) => !e.can().redo(),
    run: (e) => e.chain().focus().redo().run(),
  },
  bold: {
    label: 'Жирный (Ctrl+B)',
    icon: <b className="font-bold">Ж</b>,
    isActive: (e) => e.isActive('bold'),
    run: (e) => e.chain().focus().toggleBold().run(),
  },
  italic: {
    label: 'Курсив (Ctrl+I)',
    icon: <i className="font-serif">К</i>,
    isActive: (e) => e.isActive('italic'),
    run: (e) => e.chain().focus().toggleItalic().run(),
  },
  underline: {
    label: 'Подчёркнутый (Ctrl+U)',
    icon: <u>П</u>,
    isActive: (e) => e.isActive('underline'),
    run: (e) => e.chain().focus().toggleUnderline().run(),
  },
  strike: {
    label: 'Зачёркнутый',
    icon: <s>З</s>,
    isActive: (e) => e.isActive('strike'),
    run: (e) => e.chain().focus().toggleStrike().run(),
  },
  code: {
    label: 'Код в строке (Ctrl+E)',
    icon: <Svg><path d="M8 7l-5 5 5 5M16 7l5 5-5 5" /></Svg>,
    isActive: (e) => e.isActive('code'),
    run: (e) => e.chain().focus().toggleCode().run(),
  },
  bulletList: {
    label: 'Маркированный список',
    icon: <Svg><path d="M9 6h11M9 12h11M9 18h11" /><circle cx="4.5" cy="6" r="1" /><circle cx="4.5" cy="12" r="1" /><circle cx="4.5" cy="18" r="1" /></Svg>,
    isActive: (e) => e.isActive('bulletList'),
    run: (e) => e.chain().focus().toggleBulletList().run(),
  },
  orderedList: {
    label: 'Нумерованный список',
    icon: <Svg><path d="M10 6h10M10 12h10M10 18h10M4 4.5h1.5V9M4 9h3M4 14.5c.5-.7 2.5-.7 2.8.3.3 1-2.8 2.2-2.8 3.7h3" /></Svg>,
    isActive: (e) => e.isActive('orderedList'),
    run: (e) => e.chain().focus().toggleOrderedList().run(),
  },
  taskList: {
    label: 'Чек-лист',
    icon: <Svg><rect x="3" y="4" width="6" height="6" rx="1" /><path d="M4.5 7l1 1 2-2M12 7h9M3 14h6v6H3zM12 17h9" /></Svg>,
    isActive: (e) => e.isActive('taskList'),
    run: (e) => e.chain().focus().toggleTaskList().run(),
  },
  blockquote: {
    label: 'Цитата',
    icon: <Svg><path d="M7 7H4v5h3v-1c0 2-1 3-3 4M17 7h-3v5h3v-1c0 2-1 3-3 4" /></Svg>,
    isActive: (e) => e.isActive('blockquote'),
    run: (e) => e.chain().focus().toggleBlockquote().run(),
  },
  codeBlock: {
    label: 'Блок кода (```)',
    icon: <Svg><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 10l-2 2 2 2M15 10l2 2-2 2" /></Svg>,
    isActive: (e) => e.isActive('codeBlock'),
    run: (e) => e.chain().focus().toggleCodeBlock().run(),
  },
  horizontalRule: {
    label: 'Разделитель',
    icon: <Svg><path d="M3 12h18" /></Svg>,
    run: (e) => e.chain().focus().setHorizontalRule().run(),
  },
  clear: {
    label: 'Очистить форматирование',
    icon: <Svg><path d="M4 7V5h12v2M10 5l-3 14M14 14l6 6M20 14l-6 6" /></Svg>,
    run: (e) => e.chain().focus().unsetAllMarks().clearNodes().run(),
  },
} satisfies Record<string, FormatAction>

export type FormatActionId = keyof typeof formatActions

/** Block types offered by the "paragraph style" picker. */
export const blockTypes = [
  { id: 'paragraph', label: 'Обычный текст', isActive: (e: Editor) => e.isActive('paragraph'), run: (e: Editor) => e.chain().focus().setParagraph().run() },
  { id: 'h1', label: 'Заголовок 1', isActive: (e: Editor) => e.isActive('heading', { level: 1 }), run: (e: Editor) => e.chain().focus().setHeading({ level: 1 }).run() },
  { id: 'h2', label: 'Заголовок 2', isActive: (e: Editor) => e.isActive('heading', { level: 2 }), run: (e: Editor) => e.chain().focus().setHeading({ level: 2 }).run() },
  { id: 'h3', label: 'Заголовок 3', isActive: (e: Editor) => e.isActive('heading', { level: 3 }), run: (e: Editor) => e.chain().focus().setHeading({ level: 3 }).run() },
] as const
