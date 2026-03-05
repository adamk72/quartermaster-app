import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { useInventoryStore } from '../stores/useInventoryStore'
import { Plus, Trash2 } from 'lucide-react'
import { confirm } from '../stores/useConfirmStore'
import { toast } from '../stores/useToastStore'
import type { XPEntry } from '../types'

interface XPTotal {
  character_id: string
  character_name: string
  total_xp: number
  level: number
}

export function XPPage() {
  const { characters, fetchCharacters } = useInventoryStore()
  const [entries, setEntries] = useState<XPEntry[]>([])
  const [totals, setTotals] = useState<XPTotal[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<Partial<XPEntry>>({ xp_amount: 0, game_date: '', description: '' })
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
        attendance: characters.map((c) => ({
          character_id: c.id,
          present: attendance[c.id] ?? true,
        })),
      })
      setShowForm(false)
      setForm({ xp_amount: 0, game_date: '', description: '' })
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

  if (loading) return <div className="text-center text-gray-500 py-8">Loading...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">XP Tracker</h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
        >
          <Plus className="w-4 h-4" /> Add XP
        </button>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {totals.map((t) => (
          <div key={t.character_id} className="bg-white rounded-xl shadow-sm border p-4 text-center">
            <h3 className="font-semibold text-sm">{t.character_name}</h3>
            <p className="text-2xl font-bold text-yellow-600 mt-1">{t.total_xp.toLocaleString('en-US')}</p>
            <p className="text-sm text-gray-500">Level {t.level}</p>
          </div>
        ))}
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl shadow-sm border p-4 mb-6 space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">XP Amount</label>
              <input
                type="number"
                className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                value={form.xp_amount}
                onChange={(e) => setForm({ ...form, xp_amount: Number(e.target.value) })}
                required
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Game Date</label>
              <input
                className="w-full px-3 py-2 border rounded-lg"
                value={form.game_date ?? ''}
                onChange={(e) => setForm({ ...form, game_date: e.target.value })}
                placeholder="M/D"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input
                className="w-full px-3 py-2 border rounded-lg"
                value={form.description ?? ''}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Attendance</label>
            <div className="flex flex-wrap gap-3">
              {characters.map((c) => (
                <label key={c.id} className="flex items-center gap-2 text-sm">
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
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Add</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-100 rounded-lg">Cancel</button>
          </div>
        </form>
      )}

      {/* Entries */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Date</th>
              <th className="px-4 py-3 text-left font-medium">XP</th>
              <th className="px-4 py-3 text-left font-medium">Description</th>
              <th className="px-4 py-3 text-left font-medium">Attendance</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {entries.map((e) => (
              <tr key={e.id}>
                <td className="px-4 py-3">{e.game_date || '--'}</td>
                <td className="px-4 py-3 font-bold text-yellow-600">+{e.xp_amount}</td>
                <td className="px-4 py-3">{e.description || '--'}</td>
                <td className="px-4 py-3 text-xs">
                  {e.attendance?.filter((a) => a.present).map((a) => {
                    const char = characters.find((c) => c.id === a.character_id)
                    return char?.name ?? a.character_id
                  }).join(', ') ?? 'All'}
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => handleDelete(e.id)} className="p-1 text-gray-400 hover:text-red-600">
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
