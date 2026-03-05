import { useEffect, useState } from 'react'
import { api } from '../api/client'
import type { ChangelogEntry } from '../types'

export function ChangelogPage() {
  const [entries, setEntries] = useState<ChangelogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [offset, setOffset] = useState(0)
  const limit = 50

  const fetchChangelog = async () => {
    const data = await api.get<ChangelogEntry[]>(`/changelog?limit=${limit}&offset=${offset}`)
    setEntries(data)
    setLoading(false)
  }

  useEffect(() => { fetchChangelog() }, [offset])

  const actionColors: Record<string, string> = {
    create: 'bg-green-100 text-green-700',
    update: 'bg-blue-100 text-blue-700',
    delete: 'bg-red-100 text-red-700',
  }

  if (loading) return <div className="text-center text-gray-500 py-8">Loading...</div>

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Changelog</h2>

      {entries.length === 0 ? (
        <div className="text-center text-gray-500 py-8">No changes recorded yet</div>
      ) : (
        <>
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">When</th>
                  <th className="px-4 py-3 text-left font-medium">User</th>
                  <th className="px-4 py-3 text-left font-medium">Action</th>
                  <th className="px-4 py-3 text-left font-medium">Table</th>
                  <th className="px-4 py-3 text-left font-medium">Record</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {entries.map((e) => (
                  <tr key={e.id}>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {new Date(e.created_at).toLocaleString('en-US')}
                    </td>
                    <td className="px-4 py-3">{e.user_id ?? 'system'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${actionColors[e.action] ?? 'bg-gray-100'}`}>
                        {e.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{e.table_name}</td>
                    <td className="px-4 py-3 font-mono text-xs">{e.record_id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between mt-4">
            <button
              onClick={() => setOffset(Math.max(0, offset - limit))}
              disabled={offset === 0}
              className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 text-sm"
            >
              Previous
            </button>
            <button
              onClick={() => setOffset(offset + limit)}
              disabled={entries.length < limit}
              className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 text-sm"
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  )
}
