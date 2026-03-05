import { useEffect, useState } from 'react'
import { useInventoryStore } from '../stores/useInventoryStore'
import { ITEM_CATEGORIES } from '../constants'
import { Plus, Trash2, DollarSign, Pencil, Sparkles, Undo2 } from 'lucide-react'
import { confirm } from '../stores/useConfirmStore'
import { toast } from '../stores/useToastStore'
import clsx from 'clsx'
import type { Item } from '../types'

function ItemFormModal({
  item,
  containers,
  onSave,
  onClose,
}: {
  item: Partial<Item> | null
  containers: { id: string; name: string }[]
  onSave: (data: Partial<Item>) => void
  onClose: () => void
}) {
  const [form, setForm] = useState<Partial<Item>>(
    item ?? { name: '', quantity: 1, category: 'Item', game_date: '', sold: false }
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(form)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto space-y-4">
        <h3 className="text-lg font-semibold">{item?.id ? 'Edit Item' : 'Add Item'}</h3>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              value={form.name ?? ''}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
            <input
              type="number"
              className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              value={form.quantity ?? 1}
              onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
              min={1}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              value={form.category ?? 'Item'}
              onChange={(e) => setForm({ ...form, category: e.target.value as Item['category'] })}
            >
              {ITEM_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Credit (gp)</label>
            <input
              type="number"
              step="0.01"
              className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              value={form.credit_gp ?? ''}
              onChange={(e) => setForm({ ...form, credit_gp: e.target.value ? Number(e.target.value) : null })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Debit (gp)</label>
            <input
              type="number"
              step="0.01"
              className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              value={form.debit_gp ?? ''}
              onChange={(e) => setForm({ ...form, debit_gp: e.target.value ? Number(e.target.value) : null })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Game Date</label>
            <input
              className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              value={form.game_date ?? ''}
              onChange={(e) => setForm({ ...form, game_date: e.target.value })}
              placeholder="M/D or M/D/YY"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Container</label>
            <select
              className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              value={form.container_id ?? ''}
              onChange={(e) => setForm({ ...form, container_id: e.target.value || null })}
            >
              <option value="">None</option>
              {containers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Unit Weight (lbs)</label>
            <input
              type="number"
              step="0.01"
              className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              value={form.unit_weight_lbs ?? ''}
              onChange={(e) => setForm({ ...form, unit_weight_lbs: e.target.value ? Number(e.target.value) : null })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Unit Value (gp)</label>
            <input
              type="number"
              step="0.01"
              className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              value={form.unit_value_gp ?? ''}
              onChange={(e) => setForm({ ...form, unit_value_gp: e.target.value ? Number(e.target.value) : null })}
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <input
              className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              value={form.notes ?? ''}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">
            Cancel
          </button>
          <button type="submit" className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700">
            {item?.id ? 'Update' : 'Add'}
          </button>
        </div>
      </form>
    </div>
  )
}

function IdentifyModal({
  item,
  onConfirm,
  onClose,
}: {
  item: Item
  onConfirm: (name: string) => void
  onClose: () => void
}) {
  const [name, setName] = useState(item.name)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-sm space-y-4">
        <h3 className="text-lg font-semibold">Identify Item</h3>
        <p className="text-sm text-gray-600">Mark this item as identified. You can optionally rename it.</p>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
          <input
            className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-purple-500"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">
            Cancel
          </button>
          <button
            onClick={() => onConfirm(name)}
            className="px-4 py-2 text-white bg-purple-600 rounded-lg hover:bg-purple-700"
          >
            Identify
          </button>
        </div>
      </div>
    </div>
  )
}

export function InventoryPage() {
  const { items, summary, containers, loading, fetchItems, fetchSummary, fetchContainers, createItem, updateItem, deleteItem, sellItem, unsellItem, identifyItem } = useInventoryStore()
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<Item | null>(null)
  const [identifyTarget, setIdentifyTarget] = useState<Item | null>(null)
  const [categoryFilter, setCategoryFilter] = useState('')
  const [showSold, setShowSold] = useState(false)

  useEffect(() => {
    const params: Record<string, string> = {}
    if (categoryFilter) params['category'] = categoryFilter
    if (!showSold) params['sold'] = 'false'
    fetchItems(params)
    fetchSummary()
    fetchContainers()
  }, [fetchItems, fetchSummary, fetchContainers, categoryFilter, showSold])

  const handleSave = async (data: Partial<Item>) => {
    try {
      if (editItem) {
        await updateItem(editItem.id, data)
      } else {
        await createItem(data)
      }
      setShowForm(false)
      setEditItem(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save item')
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Inventory</h2>
        <button
          onClick={() => { setEditItem(null); setShowForm(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
        >
          <Plus className="w-4 h-4" /> Add Item
        </button>
      </div>

      {/* Summary bar */}
      {summary && (
        <div className="flex flex-wrap gap-4 mb-4 text-sm">
          <span className="px-3 py-1 bg-yellow-50 text-yellow-800 rounded-full">Party Coin: {summary.party_coin_gp.toFixed(2)} gp</span>
          <span className="px-3 py-1 bg-green-50 text-green-800 rounded-full">Net Worth: {summary.net_worth_gp.toFixed(2)} gp</span>
          <span className="px-3 py-1 bg-blue-50 text-blue-800 rounded-full">Weight: {summary.total_weight.toFixed(1)} lbs</span>
          <span className="px-3 py-1 bg-purple-50 text-purple-800 rounded-full">{summary.item_count} items</span>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-4 mb-4">
        <select
          className="px-3 py-2 border rounded-lg text-sm"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="">All Categories</option>
          {ITEM_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={showSold}
            onChange={(e) => setShowSold(e.target.checked)}
          />
          Show sold
        </label>
      </div>

      {/* Items table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No items found</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Qty</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Credit</th>
                <th className="px-4 py-3 font-medium">Debit</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Container</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((item) => (
                <tr key={item.id} className={clsx(item.sold && 'bg-red-50/50')}>
                  <td className="px-4 py-3">
                    <span className={clsx('font-medium', item.sold && 'line-through text-gray-400')}>{item.name}</span>
                    {item.sold && (
                      <span className="ml-2 px-1.5 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded">SOLD</span>
                    )}
                    {!item.identified && (
                      <span className="ml-2 px-1.5 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded">TBI</span>
                    )}
                    {item.notes && <p className="text-xs text-gray-500 mt-0.5">{item.notes}</p>}
                  </td>
                  <td className="px-4 py-3">{item.quantity}</td>
                  <td className="px-4 py-3">
                    <span className={clsx(
                      'px-2 py-0.5 rounded text-xs font-medium',
                      item.category === 'Magic' ? 'bg-purple-100 text-purple-700' :
                      item.category === 'Treasure' ? 'bg-yellow-100 text-yellow-700' :
                      item.category === 'Expense' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-700'
                    )}>
                      {item.category}
                    </span>
                  </td>
                  <td className="px-4 py-3">{item.credit_gp != null ? `${item.credit_gp} gp` : '--'}</td>
                  <td className="px-4 py-3">{item.debit_gp != null ? `${item.debit_gp} gp` : '--'}</td>
                  <td className="px-4 py-3">{item.game_date || '--'}</td>
                  <td className="px-4 py-3 text-xs">{containers.find((c) => c.id === item.container_id)?.name ?? '--'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button
                        onClick={() => { setEditItem(item); setShowForm(true) }}
                        className="p-1 text-gray-400 hover:text-blue-600"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      {!item.identified && (
                        <button
                          onClick={() => setIdentifyTarget(item)}
                          className="p-1 text-gray-400 hover:text-purple-600"
                          title="Identify"
                        >
                          <Sparkles className="w-4 h-4" />
                        </button>
                      )}
                      {item.sold ? (
                        <button
                          onClick={async () => { try { await unsellItem(item.id) } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed to unsell') } }}
                          className="p-1 text-gray-400 hover:text-orange-600"
                          title="Undo sold"
                        >
                          <Undo2 className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={async () => { try { await sellItem(item.id) } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed to sell') } }}
                          className="p-1 text-gray-400 hover:text-green-600"
                          title="Mark as sold"
                        >
                          <DollarSign className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={async () => { if (await confirm('Delete this item?')) { try { await deleteItem(item.id) } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed to delete') } } }}
                        className="p-1 text-gray-400 hover:text-red-600"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <ItemFormModal
          item={editItem}
          containers={containers}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditItem(null) }}
        />
      )}

      {identifyTarget && (
        <IdentifyModal
          item={identifyTarget}
          onConfirm={async (name) => {
            try {
              await identifyItem(identifyTarget.id, name !== identifyTarget.name ? name : undefined)
              setIdentifyTarget(null)
            } catch (e) {
              toast.error(e instanceof Error ? e.message : 'Failed to identify item')
            }
          }}
          onClose={() => setIdentifyTarget(null)}
        />
      )}
    </div>
  )
}
