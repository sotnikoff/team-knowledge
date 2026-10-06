import type { I18n } from './i18n/i18n'

const formats = new Map<string, Intl.DateTimeFormat>()

export function formatUpdated(date: Date, { language, t }: I18n): string {
  let format = formats.get(language)
  if (!format) {
    format = new Intl.DateTimeFormat(language, { dateStyle: 'medium', timeStyle: 'short' })
    formats.set(language, format)
  }
  return t('common.updated', { date: format.format(date) })
}
