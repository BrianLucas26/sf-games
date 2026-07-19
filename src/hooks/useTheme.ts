import { useCallback, useEffect, useState } from 'react'

export type Theme = 'dark' | 'light'

const STORAGE_KEY = 'theme'

function readCurrentTheme(): Theme {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'
}

// The initial value is already applied to <html data-theme> synchronously by
// the inline script in index.html (before React mounts, to avoid a flash of
// the wrong theme) -- this hook just mirrors that into React state and keeps
// both the DOM attribute and localStorage in sync when toggled.
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(readCurrentTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  const toggleTheme = useCallback(() => {
    setThemeState((t) => (t === 'dark' ? 'light' : 'dark'))
  }, [])

  return { theme, toggleTheme }
}
