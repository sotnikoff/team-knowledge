import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { RichText } from '@/domain/document/richText'
import { StaticDocument } from './StaticDocument'

const docWithCode = (text: string, language: string | null): RichText => ({
  type: 'doc',
  content: [{ type: 'codeBlock', attrs: { language }, content: [{ type: 'text', text }] }],
})

const textOf = (html: string) => html.replace(/<[^>]+>/g, '').replace(/&#x27;/g, "'").replace(/&gt;/g, '>')

describe('StaticDocument code blocks', () => {
  it('highlights code in a known language without losing text', () => {
    const code = "const total = items.reduce((s, x) => s + x, 0)\nexport const ok = 'yes'"
    const html = renderToStaticMarkup(createElement(StaticDocument, { content: docWithCode(code, 'typescript') }))
    expect(html).toContain('hljs-keyword')
    expect(textOf(html)).toBe(code)
  })

  it('keeps the text when auto-detection finds no language', () => {
    // highlightAuto returns an empty tree for text like this.
    const code = 'просто заметка\nбез языка программирования'
    const html = renderToStaticMarkup(createElement(StaticDocument, { content: docWithCode(code, null) }))
    expect(textOf(html)).toBe(code)
  })
})
