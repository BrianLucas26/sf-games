import { Link, Outlet } from 'react-router-dom'

export default function Layout() {
  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-[13px] font-semibold text-accent-ink">
              SF
            </span>
            <span className="font-display text-[15px] font-medium tracking-tight text-ink">
              Games
            </span>
          </Link>
          <nav className="text-sm text-muted">
            <a
              href="https://github.com/"
              target="_blank"
              rel="noreferrer"
              className="transition-colors hover:text-ink"
            >
              GitHub
            </a>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
        <Outlet />
      </main>

      <footer className="border-t border-border py-6 text-center text-xs text-faint">
        City-wide games around San Francisco.
      </footer>
    </div>
  )
}
