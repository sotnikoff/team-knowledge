import { describe, expect, it } from 'vitest'
import { de } from './de'
import { en } from './en'
import { translate } from './i18n'
import { ru } from './ru'

describe('i18n', () => {
  it('interpolates placeholders', () => {
    expect(translate('en', 'export.selectionCount', { count: 3 })).toBe('Selection (3)')
    expect(translate('ru', 'common.updated', { date: '5 окт.' })).toBe('Изменено 5 окт.')
  })

  it('keeps the same placeholders in every language', () => {
    const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()
    for (const key of Object.keys(ru) as (keyof typeof ru)[]) {
      expect(placeholders(en[key]), key).toEqual(placeholders(ru[key]))
      expect(placeholders(de[key]), key).toEqual(placeholders(ru[key]))
    }
  })

  it('has no empty translations', () => {
    for (const messages of [ru, en, de]) {
      expect(Object.values(messages).filter((text) => text.trim() === '')).toEqual([])
    }
  })
})
