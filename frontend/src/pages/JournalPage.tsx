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
        <h2 className="font-heading text-3xl font-bold text-parchment">Session Journal</h2>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gold text-base font-heading font-semibold rounded-lg hover:bg-gold-bright text-sm transition-colors"
        >
          <Plus className="w-4 h-4" /> New Entry
        </button>
      </div>

      {showNew && (
        <form onSubmit={handleCreate} className="tt-card mb-6 flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-heading font-semibold text-parchment-dim mb-1">Title</label>
            <input
              className="input-themed"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Session title"
              required
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-heading font-semibold text-parchment-dim mb-1">Game Date</label>
            <input
              className="input-themed"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              placeholder="M/D"
            />
          </div>
          <button type="submit" className="px-4 py-2 bg-gold text-base font-heading font-semibold rounded-lg hover:bg-gold-bright transition-colors">Create</button>
          <button type="button" onClick={() => setShowNew(false)} className="px-4 py-2 bg-surface text-parchment-dim border border-border rounded-lg hover:bg-card-hover transition-colors">Cancel</button>
        </form>
      )}

      {loading ? (
        <div className="text-center text-parchment-muted py-8">Loading...</div>
      ) : sessions.length === 0 ? (
        <div className="text-center text-parchment-muted py-8">No journal entries yet</div>
      ) : (
        <div className="space-y-3">
          {sessions.map((s: Session) => (
            <Link
              key={s.id}
              to={`/journal/${s.id}`}
              className="block tt-card hover:border-gold/30 transition-all duration-150"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-heading font-bold text-parchment">{s.title || 'Untitled Session'}</h3>
                <div className="flex items-center gap-1 text-sm text-parchment-muted">
                  <Calendar className="w-4 h-4" />
                  {s.game_date || 'No date'}
                </div>
              </div>
              {s.xp_gained > 0 && (
                <p className="text-sm text-gold mt-1">+{s.xp_gained} XP</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
