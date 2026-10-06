import { useSyncExternalStore } from 'react'
import { de } from './de'
import { en } from './en'
import { ru, type MessageKey, type Messages } from './ru'

export type Language = 'ru' | 'en' | 'de'
export type { MessageKey }

export const LANGUAGES: readonly { id: Language; label: string }[] = [
  { id: 'ru', label: 'Русский' },
  { id: 'en', label: 'English' },
  { id: 'de', label: 'Deutsch' },
]

const dictionaries: Record<Language, Messages> = { ru, en, de }

export type Translate = (key: MessageKey, params?: Readonly<Record<string, string | number>>) => string

export function translate(language: Language, ...[key, params]: Parameters<Translate>): string {
  const text = dictionaries[language][key]
  return params ? text.replace(/\{(\w+)\}/g, (whole, name: string) => String(params[name] ?? whole)) : text
}

/** UI preference of this browser (like the theme), outside the persistence ports. */
const STORAGE_KEY = 'team-knowledge:language'

const isLanguage = (value: unknown): value is Language => value === 'ru' || value === 'en' || value === 'de'

/** First supported language of the browser, English otherwise. */
function detect(): Language {
  for (const tag of navigator.languages ?? [navigator.language]) {
    const base = tag.slice(0, 2).toLowerCase()
    if (isLanguage(base)) return base
  }
  return 'en'
}

let current: Language = 'en'
const listeners = new Set<() => void>()

function apply(language: Language): void {
  current = language
  document.documentElement.lang = language
  document.title = translate(language, 'app.title')
  listeners.forEach((listener) => listener())
}

/** Call once before the first render. */
export function initLanguage(): void {
  let stored: unknown = null
  try {
    stored = localStorage.getItem(STORAGE_KEY)
  } catch {
    // Storage blocked: fall back to the browser language.
  }
  apply(isLanguage(stored) ? stored : detect())
}

export function setLanguage(language: Language): void {
  try {
    localStorage.setItem(STORAGE_KEY, language)
  } catch {
    // The choice just won't survive a reload.
  }
  apply(language)
}

export interface I18n {
  readonly language: Language
  readonly t: Translate
}

const cache = new Map<Language, I18n>()
function i18nFor(language: Language): I18n {
  let value = cache.get(language)
  if (!value) {
    value = { language, t: (key, params) => translate(language, key, params) }
    cache.set(language, value)
  }
  return value
}

/**
 * Current language and its `t`. Only components that call it re-render on a
 * language change, so editor state is never lost.
 */
export function useI18n(): I18n {
  const language = useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => current,
  )
  return i18nFor(language)
}
