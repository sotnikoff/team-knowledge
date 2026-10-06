import { Select } from '../ui/Select'
import { LANGUAGES, setLanguage, useI18n, type Language } from './i18n'

export function LanguageSelect() {
  const { language, t } = useI18n()
  return (
    <Select
      aria-label={t('common.language')}
      title={t('common.language')}
      value={language}
      onChange={(e) => setLanguage(e.target.value as Language)}
    >
      {LANGUAGES.map((l) => (
        <option key={l.id} value={l.id}>
          {l.label}
        </option>
      ))}
    </Select>
  )
}
