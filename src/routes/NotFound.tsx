import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="py-16 text-center">
      <h1 className="text-2xl font-semibold text-ink">Page not found</h1>
      <Link to="/" className="mt-4 inline-block text-sm text-accent hover:text-accent-hover">
        Back to games
      </Link>
    </div>
  )
}
