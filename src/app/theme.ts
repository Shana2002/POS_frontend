export type ThemeMode = 'light' | 'dark' | 'system'
const THEME_KEY = 'oxiaura-theme'

export function getStoredTheme(): ThemeMode {
  const value = localStorage.getItem(THEME_KEY)
  return value === 'light' || value === 'dark' ? value : 'system'
}

export function resolveTheme(mode: ThemeMode): 'light' | 'dark' {
  return mode === 'system' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : mode
}

export function applyTheme(mode: ThemeMode): void {
  document.documentElement.dataset.theme = resolveTheme(mode)
  localStorage.setItem(THEME_KEY, mode)
}
