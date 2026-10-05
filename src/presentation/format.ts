const dateFormat = new Intl.DateTimeFormat('ru', { dateStyle: 'medium', timeStyle: 'short' })

export function formatUpdated(date: Date): string {
  return `Изменено ${dateFormat.format(date)}`
}
