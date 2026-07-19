import { useTheme } from '@/hooks/useTheme'

// A lit (accent-filled) bulb in light mode, an unlit outline in dark mode --
// the icon itself reflects which mode you're switching *into* vs currently in.
export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const isLight = theme === 'light'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
      title={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-hover hover:text-ink"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M12 3a6.5 6.5 0 0 0-3.8 11.8c.5.36.8.9.8 1.5V17a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-.7c0-.6.3-1.14.8-1.5A6.5 6.5 0 0 0 12 3Z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
          fill={isLight ? 'var(--color-accent)' : 'none'}
          fillOpacity={isLight ? 0.85 : 0}
        />
        <path d="M10 21h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    </button>
  )
}
