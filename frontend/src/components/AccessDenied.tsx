import { Link } from 'react-router-dom'

export const AccessDenied = () => {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Access denied</h2>
      <p className="mt-2 text-sm text-slate-500">
        You do not have permission to view this page.
      </p>
      <Link
        to="/"
        className="mt-4 inline-flex rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white"
      >
        Back to home
      </Link>
    </div>
  )
}
