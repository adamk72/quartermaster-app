import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { useInventoryStore } from '../stores/useInventoryStore'
import { Plus, Trash2, Minus, Settings } from 'lucide-react'
import { confirm } from '../stores/useConfirmStore'
import { toast } from '../stores/useToastStore'
import clsx from 'clsx'
import type { ConsumableType, ConsumableBalance, ConsumableLedgerEntry } from '../types'

export function ConsumablesPage() {
  const { characters, fetchCharacters } = useInventoryStore()
  const [balances, setBalances] = useState<ConsumableBalance[]>([])
  const [types, setTypes] = useState<ConsumableType[]>([])
  const [ledger, setLedger] = useState<ConsumableLedgerEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [showTypeForm, setShowTypeForm] = useState(false)
  const [addForm, setAddForm] = useState({ consumable_type_id: '', quantity: 0, game_date: '', description: '' })
  const [typeForm, setTypeForm] = useState<Partial<ConsumableType>>({ id: '', name: '', unit: 'units', per_person_per_day: 1 })
  const [ledgerFilter, setLedgerFilter] = useState('')

  const fetchData = async () => {
    try {
      const [b, t, l] = await Promise.all([
        api.get<ConsumableBalance[]>('/consumables/balances'),
        api.get<ConsumableType[]>('/consumables/types'),
        api.get<ConsumableLedgerEntry[]>('/consumables/ledger'),
      ])
      setBalances(b)
      setTypes(t)
      setLedger(l)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load consumables')
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchCharacters()
    fetchData()
  }, [fetchCharacters])

  const handleConsumeDay = async () => {
    const headCount = characters.length || 6
    if (!(await confirm(`Deduct 1 day of consumables for ${headCount} people?`))) return
    try {
      await api.post('/consumables/consume-day', { head_count: headCount, game_date: '' })
      fetchData()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to consume day')
    }
  }

  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/consumables/ledger', {
        ...addForm,
        direction: 'in',
      })
      setShowAdd(false)
      setAddForm({ consumable_type_id: '', quantity: 0, game_date: '', description: '' })
      fetchData()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to add stock')
    }
  }

  const handleCreateType = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/consumables/types', typeForm)
      setShowTypeForm(false)
      setTypeForm({ id: '', name: '', unit: 'units', per_person_per_day: 1 })
      fetchData()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to create consumable type')
    }
  }

  const handleDeleteEntry = async (id: number) => {
    if (!(await confirm('Delete this entry?'))) return
    try {
      await api.del(`/consumables/ledger/${id}`)
      fetchData()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete entry')
    }
  }

  if (loading) return <div className="text-center text-parchment-muted py-8">Loading...</div>

  const filteredLedger = ledgerFilter
    ? ledger.filter((e) => e.consumable_type_id === ledgerFilter)
    : ledger

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-heading text-3xl font-bold text-parchment">Consumables</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowTypeForm(true)}
            className="flex items-center gap-2 px-3 py-2 bg-surface text-parchment-dim border border-border rounded-lg hover:bg-card-hover hover:text-parchment text-sm transition-colors"
            title="Add consumable type"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald text-parchment font-heading font-semibold rounded-lg hover:bg-emerald-dim text-sm transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Stock
          </button>
          <button
            onClick={handleConsumeDay}
            className="flex items-center gap-2 px-4 py-2 bg-amber text-base font-heading font-semibold rounded-lg hover:brightness-110 text-sm transition-colors"
          >
            <Minus className="w-4 h-4" /> Consume Day
          </button>
        </div>
      </div>

      {/* Balance cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {balances.map((b) => {
          const urgent = b.days_remaining >= 0 && b.days_remaining < 3
          const warning = b.days_remaining >= 3 && b.days_remaining < 7
          return (
            <div key={b.consumable_type_id} className={clsx(
              'tt-card',
              urgent && 'border-wine/40 bg-wine/5',
              warning && 'border-amber/40 bg-amber/5',
            )}>
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-heading font-bold text-lg text-parchment">{b.name}</h3>
                <span className="text-sm text-parchment-muted">{b.unit}</span>
              </div>
              <div className="text-3xl font-heading font-bold text-parchment mt-2">
                {b.balance % 1 === 0 ? b.balance : b.balance.toFixed(1)}
              </div>
              <div className={clsx(
                'text-sm mt-1',
                urgent ? 'text-wine font-semibold' :
                warning ? 'text-amber' :
                'text-parchment-muted',
              )}>
                {b.days_remaining >= 0
                  ? `${b.days_remaining % 1 === 0 ? b.days_remaining : b.days_remaining.toFixed(1)} days remaining`
                  : 'No daily consumption rate'}
              </div>
              <div className="text-xs text-parchment-muted mt-1">
                {b.per_person_per_day} {b.unit}/person/day
              </div>
            </div>
          )
        })}
        {balances.length === 0 && (
          <div className="col-span-full text-center text-parchment-muted py-4">
            No consumable types configured. Click the gear icon to add some.
          </div>
        )}
      </div>

      {/* Add type form */}
      {showTypeForm && (
        <form onSubmit={handleCreateType} className="tt-card mb-6 grid grid-cols-2 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-heading font-semibold text-parchment-dim mb-1">ID (slug)</label>
            <input
              className="input-themed"
              value={typeForm.id ?? ''}
              onChange={(e) => setTypeForm({ ...typeForm, id: e.target.value })}
              placeholder="torches"
              required
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-heading font-semibold text-parchment-dim mb-1">Name</label>
            <input
              className="input-themed"
              value={typeForm.name ?? ''}
              onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })}
              placeholder="Torches"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-heading font-semibold text-parchment-dim mb-1">Unit</label>
            <input
              className="input-themed"
              value={typeForm.unit ?? 'units'}
              onChange={(e) => setTypeForm({ ...typeForm, unit: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-heading font-semibold text-parchment-dim mb-1">Per Person/Day</label>
            <input
              type="number"
              step="0.1"
              className="input-themed"
              value={typeForm.per_person_per_day ?? 1}
              onChange={(e) => setTypeForm({ ...typeForm, per_person_per_day: Number(e.target.value) })}
            />
          </div>
          <div className="flex items-end gap-2">
            <button type="submit" className="px-4 py-2 bg-gold text-base font-heading font-semibold rounded-lg hover:bg-gold-bright transition-colors">Add</button>
            <button type="button" onClick={() => setShowTypeForm(false)} className="px-4 py-2 bg-surface text-parchment-dim border border-border rounded-lg hover:bg-card-hover transition-colors">Cancel</button>
          </div>
        </form>
      )}

      {/* Add stock form */}
      {showAdd && (
        <form onSubmit={handleAddStock} className="tt-card mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-heading font-semibold text-parchment-dim mb-1">Type</label>
            <select
              className="input-themed"
              value={addForm.consumable_type_id}
              onChange={(e) => setAddForm({ ...addForm, consumable_type_id: e.target.value })}
              required
            >
              <option value="">Select...</option>
              {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-heading font-semibold text-parchment-dim mb-1">Quantity</label>
            <input
              type="number"
              step="0.1"
              className="input-themed"
              value={addForm.quantity || ''}
              onChange={(e) => setAddForm({ ...addForm, quantity: Number(e.target.value) })}
              required
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-heading font-semibold text-parchment-dim mb-1">Description</label>
            <input
              className="input-themed"
              value={addForm.description}
              onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
              placeholder="Purchased in town"
            />
          </div>
          <div className="flex items-end gap-2">
            <button type="submit" className="px-4 py-2 bg-emerald text-parchment font-heading font-semibold rounded-lg hover:bg-emerald-dim transition-colors">Add</button>
            <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 bg-surface text-parchment-dim border border-border rounded-lg hover:bg-card-hover transition-colors">Cancel</button>
          </div>
        </form>
      )}

      {/* Ledger */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface">
          <h3 className="font-heading font-bold text-parchment">Ledger</h3>
          <select
            className="input-themed !w-auto"
            value={ledgerFilter}
            onChange={(e) => setLedgerFilter(e.target.value)}
          >
            <option value="">All types</option>
            {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        {filteredLedger.length === 0 ? (
          <div className="p-8 text-center text-parchment-muted">No entries yet</div>
        ) : (
          <table className="tt-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Qty</th>
                <th>Direction</th>
                <th>Description</th>
                <th>Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredLedger.map((e) => (
                <tr key={e.id}>
                  <td>{types.find((t) => t.id === e.consumable_type_id)?.name ?? e.consumable_type_id}</td>
                  <td className={clsx('font-mono font-bold', e.direction === 'in' ? 'text-emerald' : 'text-wine')}>
                    {e.direction === 'in' ? '+' : '-'}{e.quantity}
                  </td>
                  <td>
                    <span className={clsx(
                      'px-2 py-0.5 rounded text-xs font-medium',
                      e.direction === 'in' ? 'bg-emerald/15 text-emerald' : 'bg-wine/15 text-wine',
                    )}>
                      {e.direction}
                    </span>
                  </td>
                  <td>{e.description || <span className="text-parchment-muted">--</span>}</td>
                  <td className="text-parchment-dim">{e.game_date || <span className="text-parchment-muted">--</span>}</td>
                  <td>
                    <button onClick={() => handleDeleteEntry(e.id)} className="p-1 text-parchment-muted hover:text-wine transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
