/** Name given to boards and documents created with one click. */
export const NEW_ITEM_NAME = 'Без названия'

const dateFormat = new Intl.DateTimeFormat('ru', { dateStyle: 'medium', timeStyle: 'short' })

export function formatUpdated(date: Date): string {
  return `Изменено ${dateFormat.format(date)}`
}
