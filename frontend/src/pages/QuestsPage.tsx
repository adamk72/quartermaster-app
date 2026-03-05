import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { Plus, Trash2, Pencil } from 'lucide-react'
import { confirm } from '../stores/useConfirmStore'
import { toast } from '../stores/useToastStore'
import clsx from 'clsx'
import type { Quest } from '../types'
import { QUEST_STATUSES } from '../constants'

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

  const statusColors: Record<string, string> = {
    active: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
    on_hold: 'bg-yellow-100 text-yellow-700',
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Quests</h2>
        <button
          onClick={() => { setEditQuest(null); setForm({ title: '', status: 'active', description: '' }); setShowForm(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
        >
          <Plus className="w-4 h-4" /> Add Quest
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        <button onClick={() => setFilter('')} className={clsx('px-3 py-1 rounded-full text-sm', !filter ? 'bg-gray-900 text-white' : 'bg-gray-100')}>
          All
        </button>
        {QUEST_STATUSES.map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={clsx('px-3 py-1 rounded-full text-sm capitalize', filter === s ? 'bg-gray-900 text-white' : 'bg-gray-100')}>
            {s.replace('_', ' ')}
          </button>
        ))}
      </div>

      {showForm && (
        <form onSubmit={handleSave} className="bg-white rounded-xl shadow-sm border p-4 mb-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                value={form.title ?? ''}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                className="w-full px-3 py-2 border rounded-lg"
                value={form.status ?? 'active'}
                onChange={(e) => setForm({ ...form, status: e.target.value as Quest['status'] })}
              >
                {QUEST_STATUSES.map((s) => <option key={s} value={s} className="capitalize">{s.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date Added</label>
              <input
                className="w-full px-3 py-2 border rounded-lg"
                value={form.game_date_added ?? ''}
                onChange={(e) => setForm({ ...form, game_date_added: e.target.value })}
                placeholder="M/D"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                className="w-full px-3 py-2 border rounded-lg min-h-[80px]"
                value={form.description ?? ''}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              {editQuest ? 'Update' : 'Add'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-100 rounded-lg">Cancel</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-center text-gray-500 py-8">Loading...</div>
      ) : quests.length === 0 ? (
        <div className="text-center text-gray-500 py-8">No quests found</div>
      ) : (
        <div className="space-y-3">
          {quests.map((q) => (
            <div key={q.id} className="bg-white rounded-xl shadow-sm border p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold">{q.title}</h3>
                  <span className={clsx('px-2 py-0.5 rounded text-xs font-medium capitalize', statusColors[q.status] ?? 'bg-gray-100')}>
                    {q.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => { setEditQuest(q); setForm(q); setShowForm(true) }}
                    className="p-1 text-gray-400 hover:text-blue-600"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(q.id)}
                    className="p-1 text-gray-400 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {q.description && <p className="text-sm text-gray-600 mt-2">{q.description}</p>}
              {q.game_date_added && <p className="text-xs text-gray-400 mt-1">Added: {q.game_date_added}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
