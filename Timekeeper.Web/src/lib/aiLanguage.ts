export const AI_LANGUAGE_KEY = 'timekeeper_ai_language'

export const AI_LANGUAGES = [
  { value: 'English',    label: 'English' },
  { value: 'German',     label: 'Deutsch (German)' },
  { value: 'French',     label: 'Français (French)' },
  { value: 'Spanish',    label: 'Español (Spanish)' },
  { value: 'Italian',    label: 'Italiano (Italian)' },
  { value: 'Dutch',      label: 'Nederlands (Dutch)' },
  { value: 'Hungarian',  label: 'Magyar (Hungarian)' },
  { value: 'Polish',     label: 'Polski (Polish)' },
  { value: 'Czech',      label: 'Čeština (Czech)' },
  { value: 'Romanian',   label: 'Română (Romanian)' },
  { value: 'Portuguese', label: 'Português (Portuguese)' },
]

export function getAiLanguage(): string {
  return localStorage.getItem(AI_LANGUAGE_KEY) ?? 'English'
}

export function setAiLanguage(language: string): void {
  localStorage.setItem(AI_LANGUAGE_KEY, language)
}
