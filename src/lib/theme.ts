import { readStorage, THEME_KEY, writeStorage } from './storage'

// 'system'이면 OS 설정(prefers-color-scheme)을 따른다.
export type ThemePreference = 'system' | 'light' | 'dark'

export function getThemePreference(): ThemePreference {
  const saved = readStorage(THEME_KEY)
  return saved === 'light' || saved === 'dark' ? saved : 'system'
}

export function applyTheme(pref: ThemePreference) {
  const root = document.documentElement
  if (pref === 'system') {
    root.removeAttribute('data-theme')
  } else {
    root.setAttribute('data-theme', pref)
  }
}

export function setThemePreference(pref: ThemePreference) {
  writeStorage(THEME_KEY, pref)
  applyTheme(pref)
}
