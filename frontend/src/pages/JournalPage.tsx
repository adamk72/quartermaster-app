import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useSessionStore } from '../stores/useSessionStore'
import { Plus, Calendar } from 'lucide-react'
import type { Session } from '../types'

export function JournalPage() {
  const navigate = useNavigate()
  const { sessions, loading, fetchSessions, createSession } = useSessionStore()
  const [showNew, setShowNew] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDate, setNewDate] = useState('')

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    const session = await createSession({
      title: newTitle,
      game_date: newDate,
      body_json: '{}',
      body_html: '',
    })
    setShowNew(false)
    setNewTitle('')
    setNewDate('')
    navigate(`/journal/${session.id}`)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Session Journal</h2>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
        >
          <Plus className="w-4 h-4" /> New Entry
        </button>
      </div>

      {showNew && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl shadow-sm border p-4 mb-6 flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Session title"
              required
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Game Date</label>
            <input
              className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              placeholder="M/D"
            />
          </div>
          <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Create</button>
          <button type="button" onClick={() => setShowNew(false)} className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
        </form>
      )}

      {loading ? (
        <div className="text-center text-gray-500 py-8">Loading...</div>
      ) : sessions.length === 0 ? (
        <div className="text-center text-gray-500 py-8">No journal entries yet</div>
      ) : (
        <div className="space-y-3">
          {sessions.map((s: Session) => (
            <Link
              key={s.id}
              to={`/journal/${s.id}`}
              className="block bg-white rounded-xl shadow-sm border p-4 hover:border-blue-300 transition-colors"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">{s.title || 'Untitled Session'}</h3>
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <Calendar className="w-4 h-4" />
                  {s.game_date || 'No date'}
                </div>
              </div>
              {s.xp_gained > 0 && (
                <p className="text-sm text-yellow-600 mt-1">+{s.xp_gained} XP</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
