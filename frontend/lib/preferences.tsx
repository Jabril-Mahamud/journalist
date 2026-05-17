'use client'

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'

export type DisplayMode = 'default' | 'focus'
export type Density = 'cozy' | 'regular' | 'compact'

export interface Preferences {
  mode: DisplayMode
  density: Density
  accent: string
}

const DEFAULTS: Preferences = {
  mode: 'default',
  density: 'regular',
  accent: '#c14a2a',
}

const STORAGE_KEY = 'journalist_prefs'

interface PreferencesContextValue {
  prefs: Preferences
  setPrefs: (updater: Partial<Preferences> | ((prev: Preferences) => Preferences)) => void
}

const PreferencesContext = createContext<PreferencesContextValue>({
  prefs: DEFAULTS,
  setPrefs: () => {},
})

function load(): Preferences {
  if (typeof window === 'undefined') return DEFAULTS
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS
  } catch {
    return DEFAULTS
  }
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefsRaw] = useState<Preferences>(load)

  const setPrefs = useCallback(
    (updater: Partial<Preferences> | ((prev: Preferences) => Preferences)) => {
      setPrefsRaw(prev => {
        const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater }
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch {}
        return next
      })
    },
    []
  )

  useEffect(() => {
    const root = document.documentElement
    root.dataset.mode = prefs.mode
    root.dataset.density = prefs.density

    if (prefs.mode === 'focus') {
      root.style.setProperty('--accent-raw', '0 73% 55%')
    } else {
      const accent = prefs.accent
      const hex = accent.replace('#', '')
      const r = parseInt(hex.slice(0, 2), 16)
      const g = parseInt(hex.slice(2, 4), 16)
      const b = parseInt(hex.slice(4, 6), 16)
      const max = Math.max(r, g, b) / 255
      const min = Math.min(r, g, b) / 255
      const l = (max + min) / 2
      const d = max - min
      let h = 0, s = 0
      if (d > 0) {
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
        if (max === r / 255) h = ((g / 255 - b / 255) / d + (g < b ? 6 : 0)) * 60
        else if (max === g / 255) h = ((b / 255 - r / 255) / d + 2) * 60
        else h = ((r / 255 - g / 255) / d + 4) * 60
      }
      root.style.setProperty('--accent-raw', `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`)
    }
  }, [prefs])

  return (
    <PreferencesContext.Provider value={{ prefs, setPrefs }}>
      {children}
    </PreferencesContext.Provider>
  )
}

export function usePreferences() {
  return useContext(PreferencesContext)
}
