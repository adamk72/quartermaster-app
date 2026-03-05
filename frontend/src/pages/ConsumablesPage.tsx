import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { useInventoryStore } from '../stores/useInventoryStore'
import { Plus, Trash2, Minus, Settings } from 'lucide-react'
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
    const [b, t, l] = await Promise.all([
      api.get<ConsumableBalance[]>('/consumables/balances'),
      api.get<ConsumableType[]>('/consumables/types'),
      api.get<ConsumableLedgerEntry[]>('/consumables/ledger'),
    ])
    setBalances(b)
    setTypes(t)
    setLedger(l)
    setLoading(false)
  }

  useEffect(() => {
    fetchCharacters()
    fetchData()
  }, [fetchCharacters])

  const handleConsumeDay = async () => {
    const headCount = characters.length || 6
    if (!confirm(`Deduct 1 day of consumables for ${headCount} people?`)) return
    await api.post('/consumables/consume-day', { head_count: headCount, game_date: '' })
    fetchData()
  }

  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault()
    await api.post('/consumables/ledger', {
      ...addForm,
      direction: 'in',
    })
    setShowAdd(false)
    setAddForm({ consumable_type_id: '', quantity: 0, game_date: '', description: '' })
    fetchData()
  }

  const handleCreateType = async (e: React.FormEvent) => {
    e.preventDefault()
    await api.post('/consumables/types', typeForm)
    setShowTypeForm(false)
    setTypeForm({ id: '', name: '', unit: 'units', per_person_per_day: 1 })
    fetchData()
  }

  const handleDeleteEntry = async (id: number) => {
    if (!confirm('Delete this entry?')) return
    await api.del(`/consumables/ledger/${id}`)
    fetchData()
  }

  if (loading) return <div className="text-center text-gray-500 py-8">Loading...</div>

  const filteredLedger = ledgerFilter
    ? ledger.filter((e) => e.consumable_type_id === ledgerFilter)
    : ledger

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Consumables</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowTypeForm(true)}
            className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
            title="Add consumable type"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
          >
            <Plus className="w-4 h-4" /> Add Stock
          </button>
          <button
            onClick={handleConsumeDay}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm"
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
              'bg-white rounded-xl shadow-sm border p-5',
              urgent && 'border-red-300 bg-red-50',
              warning && 'border-yellow-300 bg-yellow-50',
            )}>
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-semibold text-lg">{b.name}</h3>
                <span className="text-sm text-gray-500">{b.unit}</span>
              </div>
              <div className="text-3xl font-bold mt-2">
                {b.balance % 1 === 0 ? b.balance : b.balance.toFixed(1)}
              </div>
              <div className={clsx(
                'text-sm mt-1',
                urgent ? 'text-red-700 font-semibold' :
                warning ? 'text-yellow-700' :
                'text-gray-500',
              )}>
                {b.days_remaining >= 0
                  ? `${b.days_remaining % 1 === 0 ? b.days_remaining : b.days_remaining.toFixed(1)} days remaining`
                  : 'No daily consumption rate'}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {b.per_person_per_day} {b.unit}/person/day
              </div>
            </div>
          )
        })}
        {balances.length === 0 && (
          <div className="col-span-full text-center text-gray-500 py-4">
            No consumable types configured. Click the gear icon to add some.
          </div>
        )}
      </div>

      {/* Add type form */}
      {showTypeForm && (
        <form onSubmit={handleCreateType} className="bg-white rounded-xl shadow-sm border p-4 mb-6 grid grid-cols-2 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ID (slug)</label>
            <input
              className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              value={typeForm.id ?? ''}
              onChange={(e) => setTypeForm({ ...typeForm, id: e.target.value })}
              placeholder="torches"
              required
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              value={typeForm.name ?? ''}
              onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })}
              placeholder="Torches"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
            <input
              className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              value={typeForm.unit ?? 'units'}
              onChange={(e) => setTypeForm({ ...typeForm, unit: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Per Person/Day</label>
            <input
              type="number"
              step="0.1"
              className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              value={typeForm.per_person_per_day ?? 1}
              onChange={(e) => setTypeForm({ ...typeForm, per_person_per_day: Number(e.target.value) })}
            />
          </div>
          <div className="flex items-end gap-2">
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Add</button>
            <button type="button" onClick={() => setShowTypeForm(false)} className="px-4 py-2 bg-gray-100 rounded-lg">Cancel</button>
          </div>
        </form>
      )}

      {/* Add stock form */}
      {showAdd && (
        <form onSubmit={handleAddStock} className="bg-white rounded-xl shadow-sm border p-4 mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              value={addForm.consumable_type_id}
              onChange={(e) => setAddForm({ ...addForm, consumable_type_id: e.target.value })}
              required
            >
              <option value="">Select...</option>
              {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
            <input
              type="number"
              step="0.1"
              className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              value={addForm.quantity || ''}
              onChange={(e) => setAddForm({ ...addForm, quantity: Number(e.target.value) })}
              required
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input
              className="w-full px-3 py-2 border rounded-lg"
              value={addForm.description}
              onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
              placeholder="Purchased in town"
            />
          </div>
          <div className="flex items-end gap-2">
            <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Add</button>
            <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 bg-gray-100 rounded-lg">Cancel</button>
          </div>
        </form>
      )}

      {/* Ledger */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
          <h3 className="font-semibold">Ledger</h3>
          <select
            className="px-3 py-1 border rounded-lg text-sm"
            value={ledgerFilter}
            onChange={(e) => setLedgerFilter(e.target.value)}
          >
            <option value="">All types</option>
            {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        {filteredLedger.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No entries yet</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Type</th>
                <th className="px-4 py-2 font-medium">Qty</th>
                <th className="px-4 py-2 font-medium">Direction</th>
                <th className="px-4 py-2 font-medium">Description</th>
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredLedger.map((e) => (
                <tr key={e.id}>
                  <td className="px-4 py-2">{types.find((t) => t.id === e.consumable_type_id)?.name ?? e.consumable_type_id}</td>
                  <td className={clsx('px-4 py-2 font-mono font-bold', e.direction === 'in' ? 'text-green-600' : 'text-red-600')}>
                    {e.direction === 'in' ? '+' : '-'}{e.quantity}
                  </td>
                  <td className="px-4 py-2">
                    <span className={clsx(
                      'px-2 py-0.5 rounded text-xs font-medium',
                      e.direction === 'in' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700',
                    )}>
                      {e.direction}
                    </span>
                  </td>
                  <td className="px-4 py-2">{e.description || '--'}</td>
                  <td className="px-4 py-2">{e.game_date || '--'}</td>
                  <td className="px-4 py-2">
                    <button onClick={() => handleDeleteEntry(e.id)} className="p-1 text-gray-400 hover:text-red-600">
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
