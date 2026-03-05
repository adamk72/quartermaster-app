import { useEffect, useState } from 'react'
import { useCritterStore } from '../stores/useCritterStore'
import { useInventoryStore } from '../stores/useInventoryStore'
import { Plus, Trash2, XCircle } from 'lucide-react'
import { confirm } from '../stores/useConfirmStore'
import { toast } from '../stores/useToastStore'
import clsx from 'clsx'
import type { Critter } from '../types'

export function CrittersPage() {
  const { critters, loading, fetchCritters, createCritter, updateCritter, deleteCritter, dismissAll } = useCritterStore()
  const { characters, fetchCharacters } = useInventoryStore()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<Partial<Critter>>({ name: '', hp_max: 0, hp_current: 0, ac: 10 })

  useEffect(() => {
    fetchCritters()
    fetchCharacters()
  }, [fetchCritters, fetchCharacters])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createCritter({ ...form, hp_current: form.hp_max })
      setShowForm(false)
      setForm({ name: '', hp_max: 0, hp_current: 0, ac: 10 })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to create critter')
    }
  }

  const handleHPChange = (critter: Critter, delta: number) => {
    const newHP = Math.max(0, Math.min(critter.hp_max, critter.hp_current + delta))
    updateCritter(critter.id, { ...critter, hp_current: newHP })
  }

  const activeCritters = critters.filter((c) => c.active)
  const inactiveCritters = critters.filter((c) => !c.active)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Critter HP Tracker</h2>
        <div className="flex gap-2">
          {activeCritters.length > 0 && (
            <button
              onClick={async () => { if (await confirm('Dismiss all active critters?')) { try { await dismissAll() } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed to dismiss') } } }}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
            >
              <XCircle className="w-4 h-4" /> Dismiss All
            </button>
          )}
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            <Plus className="w-4 h-4" /> Summon
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl shadow-sm border p-4 mb-6 grid grid-cols-2 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">HP Max</label>
            <input
              type="number"
              className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              value={form.hp_max}
              onChange={(e) => setForm({ ...form, hp_max: Number(e.target.value) })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">AC</label>
            <input
              type="number"
              className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              value={form.ac}
              onChange={(e) => setForm({ ...form, ac: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Owner</label>
            <select
              className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              value={form.character_id ?? ''}
              onChange={(e) => setForm({ ...form, character_id: e.target.value })}
              required
            >
              <option value="">Select...</option>
              {characters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="flex items-end gap-2">
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Add</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-100 rounded-lg">Cancel</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-center text-gray-500 py-8">Loading...</div>
      ) : (
        <>
          {activeCritters.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {activeCritters.map((critter) => {
                const pct = critter.hp_max > 0 ? (critter.hp_current / critter.hp_max) * 100 : 0
                return (
                  <div key={critter.id} className="bg-white rounded-xl shadow-sm border p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">{critter.name}</h3>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span>AC {critter.ac}</span>
                        <button
                          onClick={async () => { if (await confirm('Delete this critter?')) { try { await deleteCritter(critter.id) } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed to delete') } } }}
                          className="p-1 text-gray-400 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="text-sm text-gray-500 mb-2">
                      Owner: {characters.find((c) => c.id === critter.character_id)?.name ?? critter.character_id}
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleHPChange(critter, -1)}
                        className="px-3 py-1 bg-red-100 text-red-700 rounded font-bold hover:bg-red-200"
                      >
                        -
                      </button>
                      <div className="flex-1">
                        <div className="text-center font-mono text-lg font-bold">
                          {critter.hp_current} / {critter.hp_max}
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                          <div
                            className={clsx(
                              'h-2 rounded-full transition-all',
                              pct > 50 ? 'bg-green-500' : pct > 25 ? 'bg-yellow-500' : 'bg-red-500'
                            )}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                      <button
                        onClick={() => handleHPChange(critter, 1)}
                        className="px-3 py-1 bg-green-100 text-green-700 rounded font-bold hover:bg-green-200"
                      >
                        +
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {inactiveCritters.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-500 mb-3">Dismissed</h3>
              <div className="space-y-2">
                {inactiveCritters.map((c) => (
                  <div key={c.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2 text-sm text-gray-500">
                    <span>{c.name} ({c.hp_current}/{c.hp_max})</span>
                    <button
                      onClick={async () => { if (await confirm('Delete this critter?')) { try { await deleteCritter(c.id) } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed to delete') } } }}
                      className="p-1 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {critters.length === 0 && (
            <div className="text-center text-gray-500 py-8">No critters summoned</div>
          )}
        </>
      )}
    </div>
  )
}
