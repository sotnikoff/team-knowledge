import { describe, expect, it } from 'vitest'
import { createDocument, replaceContent } from '@/domain/document/Document'
import { InvalidDataError } from './common'
import { documentFromDto, documentToDto, parseRichText } from './documentMapper'

describe('documentMapper', () => {
  it('round-trips a document with formatted content', () => {
    const doc = replaceContent(
      createDocument({ id: 'd1', spaceId: 's1', title: 'Notes', now: new Date('2026-01-01T00:00:00Z') }),
      {
        type: 'doc',
        content: [
          { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Hi' }] },
          {
            type: 'bulletList',
            content: [
              {
                type: 'listItem',
                content: [
                  { type: 'paragraph', content: [{ type: 'text', text: 'x', marks: [{ type: 'italic' }] }] },
                ],
              },
            ],
          },
        ],
      },
      new Date('2026-01-02T00:00:00Z'),
    )
    expect(documentFromDto(JSON.parse(JSON.stringify(documentToDto(doc))))).toEqual(doc)
  })

  it('rejects malformed rich text', () => {
    expect(() => parseRichText({ type: 'paragraph' })).toThrow(InvalidDataError)
    expect(() => parseRichText({ type: 'doc', content: [{ text: 'no type' }] })).toThrow(InvalidDataError)
    expect(() => parseRichText({ type: 'doc', content: [{ type: 'text', marks: [{}] }] })).toThrow(
      InvalidDataError,
    )
  })
})
