import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { CHANGELOG_PAGE_SIZE } from '../constants'
import clsx from 'clsx'
import type { ChangelogEntry } from '../types'

export function ChangelogPage() {
  const [entries, setEntries] = useState<ChangelogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [offset, setOffset] = useState(0)
  const limit = CHANGELOG_PAGE_SIZE

  const fetchChangelog = async () => {
    const data = await api.get<ChangelogEntry[]>(`/changelog?limit=${limit}&offset=${offset}`)
    setEntries(data)
    setLoading(false)
  }

  useEffect(() => { fetchChangelog() }, [offset])

  const actionColors: Record<string, string> = {
    create: 'bg-emerald/15 text-emerald',
    update: 'bg-sky/15 text-sky',
    delete: 'bg-wine/15 text-wine',
  }

  if (loading) return <div className="text-center text-parchment-muted py-8">Loading...</div>

  return (
    <div>
      <h2 className="font-heading text-3xl font-bold text-parchment mb-6">Changelog</h2>

      {entries.length === 0 ? (
        <div className="text-center text-parchment-muted py-8">No changes recorded yet</div>
      ) : (
        <>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <table className="tt-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>Table</th>
                  <th>Record</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id}>
                    <td className="text-xs text-parchment-muted">
                      {new Date(e.created_at).toLocaleString('en-US')}
                    </td>
                    <td className="text-parchment-dim">{e.user_id ?? 'system'}</td>
                    <td>
                      <span className={clsx('px-2 py-0.5 rounded text-xs font-medium', actionColors[e.action] ?? 'bg-surface text-parchment-dim')}>
                        {e.action}
                      </span>
                    </td>
                    <td className="font-mono text-xs text-parchment-dim">{e.table_name}</td>
                    <td className="font-mono text-xs text-parchment-dim">{e.record_id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between mt-4">
            <button
              onClick={() => setOffset(Math.max(0, offset - limit))}
              disabled={offset === 0}
              className="px-4 py-2 bg-surface text-parchment-dim border border-border rounded-lg hover:bg-card-hover hover:text-parchment disabled:opacity-40 text-sm transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => setOffset(offset + limit)}
              disabled={entries.length < limit}
              className="px-4 py-2 bg-surface text-parchment-dim border border-border rounded-lg hover:bg-card-hover hover:text-parchment disabled:opacity-40 text-sm transition-colors"
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  )
}
