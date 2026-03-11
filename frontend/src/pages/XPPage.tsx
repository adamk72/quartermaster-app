import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { useInventoryStore } from '../stores/useInventoryStore'
import { Plus, Trash2 } from 'lucide-react'
import { confirm } from '../stores/useConfirmStore'
import { toast } from '../stores/useToastStore'
import { todayGameDate } from '../constants'
import type { XPEntry, XPTotal } from '../types'

export function XPPage() {
  const { characters, fetchCharacters } = useInventoryStore()
  const [entries, setEntries] = useState<XPEntry[]>([])
  const [totals, setTotals] = useState<XPTotal[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<Partial<XPEntry>>({ xp_amount: 0, game_date: todayGameDate(), description: '' })
  const [xpInput, setXpInput] = useState('')
  const [attendance, setAttendance] = useState<Record<string, boolean>>({})

  const fetchData = async () => {
    try {
      const [e, t] = await Promise.all([
        api.get<XPEntry[]>('/xp'),
        api.get<XPTotal[]>('/xp/totals'),
      ])
      setEntries(e)
      setTotals(t)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load XP data')
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchCharacters()
    fetchData()
  }, [fetchCharacters])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/xp', {
        ...form,
        xp_amount: Number(xpInput) || 0,
        attendance: characters.map((c) => ({
          character_id: c.id,
          present: attendance[c.id] ?? true,
        })),
      })
      setShowForm(false)
      setForm({ xp_amount: 0, game_date: todayGameDate(), description: '' })
      setXpInput('')
      setAttendance({})
      fetchData()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to create XP entry')
    }
  }

  const handleDelete = async (id: number) => {
    if (!(await confirm('Delete this XP entry?'))) return
    try {
      await api.del(`/xp/${id}`)
      fetchData()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete XP entry')
    }
  }

  if (loading) return <div className="text-center text-parchment-muted py-8">Loading...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-heading text-3xl font-bold text-parchment">XP Tracker</h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gold text-base font-heading font-semibold rounded-lg hover:bg-gold-bright text-sm transition-colors"
        >
          <Plus className="w-4 h-4" /> Add XP
        </button>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {totals.map((t) => (
          <div key={t.character_id} className="tt-card text-center">
            <h3 className="font-heading font-semibold text-sm text-parchment-dim">{t.character_name}</h3>
            <p className="text-2xl font-heading font-bold text-gold mt-1">{t.total_xp.toLocaleString('en-US')}</p>
            <p className="text-sm text-parchment-muted">Level {t.level}</p>
          </div>
        ))}
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="tt-card mb-6 space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-heading font-semibold text-parchment-dim mb-1">XP Amount</label>
              <input
                type="number"
                className="input-themed"
                value={xpInput}
                onChange={(e) => setXpInput(e.target.value)}
                placeholder="0"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-heading font-semibold text-parchment-dim mb-1">Game Date</label>
              <input
                className="input-themed"
                value={form.game_date ?? ''}
                onChange={(e) => setForm({ ...form, game_date: e.target.value })}
                placeholder="M/D"
              />
            </div>
            <div>
              <label className="block text-sm font-heading font-semibold text-parchment-dim mb-1">Description</label>
              <input
                className="input-themed"
                value={form.description ?? ''}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-heading font-semibold text-parchment-dim mb-2">Attendance</label>
            <div className="flex flex-wrap gap-3">
              {characters.map((c) => (
                <label key={c.id} className="flex items-center gap-2 text-sm text-parchment-dim">
                  <input
                    type="checkbox"
                    checked={attendance[c.id] ?? true}
                    onChange={(e) => setAttendance({ ...attendance, [c.id]: e.target.checked })}
                  />
                  {c.name}
                </label>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 bg-gold text-base font-heading font-semibold rounded-lg hover:bg-gold-bright transition-colors">Add</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-surface text-parchment-dim border border-border rounded-lg hover:bg-card-hover transition-colors">Cancel</button>
          </div>
        </form>
      )}

      {/* Entries */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="tt-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>XP</th>
              <th>Description</th>
              <th>Attendance</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id}>
                <td className="text-parchment-dim">{e.game_date || '--'}</td>
                <td className="font-heading font-bold text-gold">+{e.xp_amount}</td>
                <td>{e.description || <span className="text-parchment-muted">--</span>}</td>
                <td className="text-xs text-parchment-dim">
                  {e.attendance?.filter((a) => a.present).map((a) => {
                    const char = characters.find((c) => c.id === a.character_id)
                    return char?.name ?? a.character_id
                  }).join(', ') ?? 'All'}
                </td>
                <td>
                  <button onClick={() => handleDelete(e.id)} className="p-1 text-parchment-muted hover:text-wine transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
