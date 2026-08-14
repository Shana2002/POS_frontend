import { useState } from 'react'
import { applyTheme, getStoredTheme, type ThemeMode } from '../app/theme'

export function ThemeControl() {
  const [mode, setMode] = useState<ThemeMode>(getStoredTheme)
  const change = (next: ThemeMode) => { setMode(next); applyTheme(next) }
  return <label className="theme-control">Theme<select aria-label="Theme" value={mode} onChange={(event) => change(event.target.value as ThemeMode)}><option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option></select></label>
}
