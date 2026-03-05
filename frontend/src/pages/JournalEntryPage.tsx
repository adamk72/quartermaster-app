import { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useSessionStore } from '../stores/useSessionStore'
import { ArrowLeft, Save, Trash2 } from 'lucide-react'

export function JournalEntryPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { currentSession, loading, fetchSession, updateSession, deleteSession } = useSessionStore()
  const [title, setTitle] = useState('')
  const [gameDate, setGameDate] = useState('')
  const [bodyHtml, setBodyHtml] = useState('')
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    if (id) fetchSession(Number(id))
  }, [id, fetchSession])

  useEffect(() => {
    if (currentSession) {
      setTitle(currentSession.title)
      setGameDate(currentSession.game_date)
      setBodyHtml(currentSession.body_html)
      setDirty(false)
    }
  }, [currentSession])

  useEffect(() => {
    if (!dirty) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

  const markDirty = useCallback(<T,>(setter: React.Dispatch<React.SetStateAction<T>>) => {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setter(e.target.value as T)
      setDirty(true)
    }
  }, [])

  const handleSave = async () => {
    if (!id) return
    setSaving(true)
    await updateSession(Number(id), {
      title,
      game_date: gameDate,
      body_html: bodyHtml,
      body_json: '{}',
    })
    setSaving(false)
    setDirty(false)
  }

  const handleDelete = async () => {
    if (!id || !confirm('Delete this journal entry?')) return
    await deleteSession(Number(id))
    navigate('/journal')
  }

  if (loading) return <div className="text-gray-500 py-8">Loading...</div>
  if (!currentSession) return <div className="text-gray-500 py-8">Session not found</div>

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => {
          if (dirty && !confirm('You have unsaved changes. Leave anyway?')) return
          navigate('/journal')
        }} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-2xl font-bold text-gray-900 flex-1">Edit Session</h2>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
        >
          <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save'}
        </button>
        <button
          onClick={handleDelete}
          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              value={title}
              onChange={markDirty(setTitle)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Game Date</label>
            <input
              className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              value={gameDate}
              onChange={markDirty(setGameDate)}
              placeholder="M/D"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
          <textarea
            className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 min-h-[400px] font-mono text-sm"
            value={bodyHtml}
            onChange={markDirty(setBodyHtml)}
            placeholder="Write your session notes here... (HTML supported)"
          />
        </div>
      </div>
    </div>
  )
}
