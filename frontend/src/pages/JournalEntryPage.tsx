import { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useSessionStore } from '../stores/useSessionStore'
import { confirm } from '../stores/useConfirmStore'
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
    if (!id || !(await confirm('Delete this journal entry?'))) return
    await deleteSession(Number(id))
    navigate('/journal')
  }

  if (loading) return <div className="text-parchment-muted py-8">Loading...</div>
  if (!currentSession) return <div className="text-parchment-muted py-8">Session not found</div>

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <button onClick={async () => {
          if (dirty && !(await confirm('You have unsaved changes. Leave anyway?'))) return
          navigate('/journal')
        }} className="p-2 hover:bg-surface rounded-lg text-parchment-muted hover:text-parchment transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="font-heading text-3xl font-bold text-parchment flex-1">Edit Session</h2>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-gold text-base font-heading font-semibold rounded-lg hover:bg-gold-bright disabled:opacity-50 text-sm transition-colors"
        >
          <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save'}
        </button>
        <button
          onClick={handleDelete}
          className="p-2 text-parchment-muted hover:text-wine hover:bg-wine/10 rounded-lg transition-colors"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      <div className="tt-card space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-heading font-semibold text-parchment-dim mb-1">Title</label>
            <input
              className="input-themed"
              value={title}
              onChange={markDirty(setTitle)}
            />
          </div>
          <div>
            <label className="block text-sm font-heading font-semibold text-parchment-dim mb-1">Game Date</label>
            <input
              className="input-themed"
              value={gameDate}
              onChange={markDirty(setGameDate)}
              placeholder="M/D"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-heading font-semibold text-parchment-dim mb-1">Content</label>
          <textarea
            className="input-themed min-h-[400px] font-mono text-sm"
            value={bodyHtml}
            onChange={markDirty(setBodyHtml)}
            placeholder="Write your session notes here... (HTML supported)"
          />
        </div>
      </div>
    </div>
  )
}
