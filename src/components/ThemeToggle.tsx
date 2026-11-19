import { useState } from 'react'
import { getThemePreference, setThemePreference, type ThemePreference } from '../lib/theme'

const NEXT: Record<ThemePreference, ThemePreference> = { system: 'light', light: 'dark', dark: 'system' }
const LABEL: Record<ThemePreference, { icon: string; text: string }> = {
  system: { icon: '🖥️', text: '시스템 설정' },
  light: { icon: '☀️', text: '라이트 모드' },
  dark: { icon: '🌙', text: '다크 모드' },
}

export default function ThemeToggle() {
  const [pref, setPref] = useState<ThemePreference>(getThemePreference)

  function handleClick() {
    const next = NEXT[pref]
    setThemePreference(next)
    setPref(next)
  }

  const { icon, text } = LABEL[pref]
  return (
    <button
      type="button"
      className="btn btn-ghost theme-toggle"
      onClick={handleClick}
      title={`테마: ${text} (눌러서 변경)`}
      aria-label={`테마: ${text}, 눌러서 변경`}
    >
      {icon}
    </button>
  )
}
