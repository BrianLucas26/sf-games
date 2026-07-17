import { Link, Outlet } from 'react-router-dom'

export default function Layout() {
  return (
    <div className="flex min-h-screen flex-col bg-gray-950 text-gray-100">
      <header className="border-b border-gray-800">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link to="/" className="text-lg font-semibold tracking-tight">
            SF Games
          </Link>
          <nav className="text-sm text-gray-400">
            <a
              href="https://github.com/"
              target="_blank"
              rel="noreferrer"
              className="hover:text-gray-200"
            >
              GitHub
            </a>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        <Outlet />
      </main>

      <footer className="border-t border-gray-800 py-6 text-center text-xs text-gray-500">
        City-wide games around San Francisco.
      </footer>
    </div>
  )
}
