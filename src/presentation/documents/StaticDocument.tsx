import { renderToReactElement } from '@tiptap/static-renderer/pm/react'
import { createElement, useMemo, type ReactNode } from 'react'
import type { RichText } from '@/domain/document/richText'
import { documentExtensions, lowlight } from './extensions'
import { toEditorContent } from './richTextAdapter'

const extensions = documentExtensions()

interface HastText {
  type: 'text'
  value: string
}
interface HastElement {
  type: 'element'
  tagName: string
  properties?: { className?: string[] }
  children: HastNode[]
}
type HastNode = HastText | HastElement | { type: string }

/** Turns lowlight's syntax tree into React nodes. */
function hastToReact(nodes: readonly HastNode[]): ReactNode[] {
  return nodes.map((node, i) => {
    if (node.type === 'text') return (node as HastText).value
    if (node.type !== 'element') return null
    const el = node as HastElement
    return createElement(el.tagName, { key: i, className: el.properties?.className?.join(' ') }, ...hastToReact(el.children))
  })
}

function hastText(nodes: readonly HastNode[]): string {
  return nodes
    .map((node) =>
      node.type === 'text' ? (node as HastText).value : node.type === 'element' ? hastText((node as HastElement).children) : '',
    )
    .join('')
}

/**
 * Highlighted code, or the plain code when highlighting does not reproduce it
 * exactly — e.g. `highlightAuto` returns an EMPTY tree when it cannot detect a
 * language. The text itself must never get lost.
 */
function highlightCode(code: string, language: string | null): ReactNode[] {
  try {
    const tree =
      language && lowlight.registered(language) ? lowlight.highlight(language, code) : lowlight.highlightAuto(code)
    const nodes = tree.children as HastNode[]
    return hastText(nodes) === code ? hastToReact(nodes) : [code]
  } catch {
    return [code]
  }
}

/**
 * Read-only rendering of a document without an editor instance (cheap enough
 * for many cards on a board). Same schema and styles as the editor.
 */
export function StaticDocument({ content }: { content: RichText }) {
  const rendered = useMemo(
    () =>
      renderToReactElement({
        content: toEditorContent(content),
        extensions,
        options: {
          nodeMapping: {
            codeBlock: ({ node }) => (
              <pre>
                <code>{highlightCode(node.textContent, (node.attrs.language as string | null) ?? null)}</code>
              </pre>
            ),
          },
        },
      }),
    [content],
  )
  return <div className="document-prose">{rendered}</div>
}
