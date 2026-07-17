import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="text-center">
      <h1 className="text-2xl font-bold">Page not found</h1>
      <Link to="/" className="mt-4 inline-block text-orange-400 hover:underline">
        Back to games
      </Link>
    </div>
  )
}
