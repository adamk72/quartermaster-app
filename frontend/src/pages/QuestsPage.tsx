import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { Plus, Trash2, Pencil } from 'lucide-react'
import { confirm } from '../stores/useConfirmStore'
import { toast } from '../stores/useToastStore'
import clsx from 'clsx'
import type { Quest } from '../types'
import { QUEST_STATUSES, QUEST_STATUS_COLORS } from '../constants'

export function QuestsPage() {
  const [quests, setQuests] = useState<Quest[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editQuest, setEditQuest] = useState<Quest | null>(null)
  const [form, setForm] = useState<Partial<Quest>>({ title: '', status: 'active', description: '' })

  const fetchQuests = async () => {
    try {
      const qs = filter ? `?status=${filter}` : ''
      const data = await api.get<Quest[]>(`/quests${qs}`)
      setQuests(data)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to fetch quests')
    }
    setLoading(false)
  }

  useEffect(() => { fetchQuests() }, [filter])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editQuest) {
        await api.put(`/quests/${editQuest.id}`, form)
      } else {
        await api.post('/quests', form)
      }
      setShowForm(false)
      setEditQuest(null)
      setForm({ title: '', status: 'active', description: '' })
      fetchQuests()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save quest')
    }
  }

  const handleDelete = async (id: number) => {
    if (!(await confirm('Delete this quest?'))) return
    try {
      await api.del(`/quests/${id}`)
      fetchQuests()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete quest')
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-heading text-3xl font-bold text-parchment">Quests</h2>
        <button
          onClick={() => { setEditQuest(null); setForm({ title: '', status: 'active', description: '' }); setShowForm(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-gold text-base font-heading font-semibold rounded-lg hover:bg-gold-bright text-sm transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Quest
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        <button onClick={() => setFilter('')} className={clsx('px-3 py-1.5 rounded-full text-sm transition-colors', !filter ? 'bg-gold text-base font-medium' : 'bg-surface text-parchment-dim border border-border hover:bg-card')}>
          All
        </button>
        {QUEST_STATUSES.map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={clsx('px-3 py-1.5 rounded-full text-sm capitalize transition-colors', filter === s ? 'bg-gold text-base font-medium' : 'bg-surface text-parchment-dim border border-border hover:bg-card')}>
            {s.replace('_', ' ')}
          </button>
        ))}
      </div>

      {showForm && (
        <form onSubmit={handleSave} className="tt-card mb-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-heading font-semibold text-parchment-dim mb-1">Title</label>
              <input
                className="input-themed"
                value={form.title ?? ''}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-heading font-semibold text-parchment-dim mb-1">Status</label>
              <select
                className="input-themed"
                value={form.status ?? 'active'}
                onChange={(e) => setForm({ ...form, status: e.target.value as Quest['status'] })}
              >
                {QUEST_STATUSES.map((s) => <option key={s} value={s} className="capitalize">{s.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-heading font-semibold text-parchment-dim mb-1">Date Added</label>
              <input
                className="input-themed"
                value={form.game_date_added ?? ''}
                onChange={(e) => setForm({ ...form, game_date_added: e.target.value })}
                placeholder="M/D"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-heading font-semibold text-parchment-dim mb-1">Description</label>
              <textarea
                className="input-themed min-h-[80px]"
                value={form.description ?? ''}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 bg-gold text-base font-heading font-semibold rounded-lg hover:bg-gold-bright transition-colors">
              {editQuest ? 'Update' : 'Add'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-surface text-parchment-dim border border-border rounded-lg hover:bg-card-hover transition-colors">Cancel</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-center text-parchment-muted py-8">Loading...</div>
      ) : quests.length === 0 ? (
        <div className="text-center text-parchment-muted py-8">No quests found</div>
      ) : (
        <div className="space-y-3">
          {quests.map((q) => (
            <div key={q.id} className="tt-card hover:border-border-light transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h3 className="font-heading font-bold text-parchment">{q.title}</h3>
                  <span className={clsx('px-2 py-0.5 rounded text-xs font-medium capitalize', QUEST_STATUS_COLORS[q.status] ?? 'bg-surface text-parchment-dim')}>
                    {q.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => { setEditQuest(q); setForm(q); setShowForm(true) }}
                    className="p-1 text-parchment-muted hover:text-sky transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(q.id)}
                    className="p-1 text-parchment-muted hover:text-wine transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {q.description && <p className="text-sm text-parchment-dim mt-2">{q.description}</p>}
              {q.game_date_added && <p className="text-xs text-parchment-muted mt-1">Added: {q.game_date_added}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
