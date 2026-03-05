import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { useInventoryStore } from '../stores/useInventoryStore'
import { Plus, Trash2 } from 'lucide-react'
import { confirm } from '../stores/useConfirmStore'
import { toast } from '../stores/useToastStore'
import type { WatchSchedule, WatchSlot } from '../types'

export function WatchPage() {
  const { characters, fetchCharacters } = useInventoryStore()
  const [schedules, setSchedules] = useState<WatchSchedule[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [slots, setSlots] = useState<Partial<WatchSlot>[]>([])

  const fetchSchedules = async () => {
    try {
      const data = await api.get<WatchSchedule[]>('/watch/schedules')
      setSchedules(data)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load schedules')
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchCharacters()
    fetchSchedules()
  }, [fetchCharacters])

  const addSlot = () => {
    setSlots([...slots, { watch_number: (slots.length > 0 ? Math.max(...slots.map((s) => s.watch_number ?? 0)) : 0) + 1, character_id: '', sort_order: slots.length }])
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/watch/schedules', { name, active: true, slots })
      setShowForm(false)
      setName('')
      setSlots([])
      fetchSchedules()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to create schedule')
    }
  }

  const handleDelete = async (id: number) => {
    if (!(await confirm('Delete this schedule?'))) return
    try {
      await api.del(`/watch/schedules/${id}`)
      fetchSchedules()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete schedule')
    }
  }

  if (loading) return <div className="text-center text-parchment-muted py-8">Loading...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-heading text-3xl font-bold text-parchment">Watch Schedules</h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gold text-base font-heading font-semibold rounded-lg hover:bg-gold-bright text-sm transition-colors"
        >
          <Plus className="w-4 h-4" /> New Schedule
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="tt-card mb-6 space-y-4">
          <div>
            <label className="block text-sm font-heading font-semibold text-parchment-dim mb-1">Schedule Name</label>
            <input
              className="input-themed"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-heading font-semibold text-parchment-dim">Slots</label>
              <button type="button" onClick={addSlot} className="text-sm text-gold hover:text-gold-bright transition-colors">+ Add Slot</button>
            </div>
            {slots.map((slot, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input
                  type="number"
                  className="input-themed !w-20"
                  value={slot.watch_number ?? ''}
                  onChange={(e) => { const s = [...slots]; s[i] = { ...slot, watch_number: Number(e.target.value) }; setSlots(s) }}
                  placeholder="Watch #"
                />
                <select
                  className="input-themed"
                  value={slot.character_id ?? ''}
                  onChange={(e) => { const s = [...slots]; s[i] = { ...slot, character_id: e.target.value }; setSlots(s) }}
                >
                  <option value="">Select character...</option>
                  {characters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <button
                  type="button"
                  onClick={() => setSlots(slots.filter((_, j) => j !== i))}
                  className="p-2 text-parchment-muted hover:text-wine transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 bg-gold text-base font-heading font-semibold rounded-lg hover:bg-gold-bright transition-colors">Create</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-surface text-parchment-dim border border-border rounded-lg hover:bg-card-hover transition-colors">Cancel</button>
          </div>
        </form>
      )}

      {schedules.length === 0 ? (
        <div className="text-center text-parchment-muted py-8">No watch schedules</div>
      ) : (
        <div className="space-y-4">
          {schedules.map((schedule) => {
            const watchNumbers = [...new Set(schedule.slots?.map((s) => s.watch_number) ?? [])].sort((a, b) => a - b)
            return (
              <div key={schedule.id} className="tt-card">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-heading font-bold text-parchment">{schedule.name}</h3>
                  <button onClick={() => handleDelete(schedule.id)} className="p-1 text-parchment-muted hover:text-wine transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {watchNumbers.map((wn) => (
                    <div key={wn} className="bg-surface border border-border rounded-lg p-3">
                      <h4 className="text-sm font-heading font-semibold text-parchment-muted mb-2">Watch {wn}</h4>
                      <div className="space-y-1">
                        {schedule.slots?.filter((s) => s.watch_number === wn).map((slot) => (
                          <div key={slot.id} className="text-sm text-parchment-dim">
                            {characters.find((c) => c.id === slot.character_id)?.name ?? slot.character_id}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
