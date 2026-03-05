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
        <h2 className="font-heading text-3xl font-bold text-parchment">Critter HP Tracker</h2>
        <div className="flex gap-2">
          {activeCritters.length > 0 && (
            <button
              onClick={async () => { if (await confirm('Dismiss all active critters?')) { try { await dismissAll() } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed to dismiss') } } }}
              className="flex items-center gap-2 px-4 py-2 bg-surface text-parchment-dim border border-border rounded-lg hover:bg-card-hover hover:text-parchment text-sm transition-colors"
            >
              <XCircle className="w-4 h-4" /> Dismiss All
            </button>
          )}
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gold text-base font-heading font-semibold rounded-lg hover:bg-gold-bright text-sm transition-colors"
          >
            <Plus className="w-4 h-4" /> Summon
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="tt-card mb-6 grid grid-cols-2 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-heading font-semibold text-parchment-dim mb-1">Name</label>
            <input
              className="input-themed"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-heading font-semibold text-parchment-dim mb-1">HP Max</label>
            <input
              type="number"
              className="input-themed"
              value={form.hp_max}
              onChange={(e) => setForm({ ...form, hp_max: Number(e.target.value) })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-heading font-semibold text-parchment-dim mb-1">AC</label>
            <input
              type="number"
              className="input-themed"
              value={form.ac}
              onChange={(e) => setForm({ ...form, ac: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className="block text-sm font-heading font-semibold text-parchment-dim mb-1">Owner</label>
            <select
              className="input-themed"
              value={form.character_id ?? ''}
              onChange={(e) => setForm({ ...form, character_id: e.target.value })}
              required
            >
              <option value="">Select...</option>
              {characters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="flex items-end gap-2">
            <button type="submit" className="px-4 py-2 bg-gold text-base font-heading font-semibold rounded-lg hover:bg-gold-bright transition-colors">Add</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-surface text-parchment-dim border border-border rounded-lg hover:bg-card-hover transition-colors">Cancel</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-center text-parchment-muted py-8">Loading...</div>
      ) : (
        <>
          {activeCritters.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {activeCritters.map((critter) => {
                const pct = critter.hp_max > 0 ? (critter.hp_current / critter.hp_max) * 100 : 0
                return (
                  <div key={critter.id} className="tt-card">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-heading font-bold text-parchment">{critter.name}</h3>
                      <div className="flex items-center gap-2 text-sm text-parchment-muted">
                        <span className="font-mono">AC {critter.ac}</span>
                        <button
                          onClick={async () => { if (await confirm('Delete this critter?')) { try { await deleteCritter(critter.id) } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed to delete') } } }}
                          className="p-1 text-parchment-muted hover:text-wine transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="text-sm text-parchment-muted mb-3">
                      Owner: {characters.find((c) => c.id === critter.character_id)?.name ?? critter.character_id}
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleHPChange(critter, -1)}
                        className="px-3 py-1 bg-wine/15 text-wine rounded font-bold hover:bg-wine/25 transition-colors"
                      >
                        -
                      </button>
                      <div className="flex-1">
                        <div className="text-center font-mono text-lg font-bold text-parchment">
                          {critter.hp_current} / {critter.hp_max}
                        </div>
                        <div className="w-full bg-surface rounded-full h-2.5 mt-1 border border-border">
                          <div
                            className={clsx(
                              'h-full rounded-full transition-all duration-300',
                              pct > 50 ? 'bg-emerald' : pct > 25 ? 'bg-amber' : 'bg-wine'
                            )}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                      <button
                        onClick={() => handleHPChange(critter, 1)}
                        className="px-3 py-1 bg-emerald/15 text-emerald rounded font-bold hover:bg-emerald/25 transition-colors"
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
              <h3 className="font-heading text-lg font-semibold text-parchment-muted mb-3">Dismissed</h3>
              <div className="space-y-2">
                {inactiveCritters.map((c) => (
                  <div key={c.id} className="flex items-center justify-between bg-surface border border-border rounded-lg px-4 py-2 text-sm text-parchment-muted">
                    <span>{c.name} ({c.hp_current}/{c.hp_max})</span>
                    <button
                      onClick={async () => { if (await confirm('Delete this critter?')) { try { await deleteCritter(c.id) } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed to delete') } } }}
                      className="p-1 hover:text-wine transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {critters.length === 0 && (
            <div className="text-center text-parchment-muted py-8">No critters summoned</div>
          )}
        </>
      )}
    </div>
  )
}
