import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useInventoryStore } from '../stores/useInventoryStore'
import { ITEM_CATEGORIES } from '../constants'
import { Plus, Trash2, DollarSign, Pencil, Sparkles, Undo2, GripVertical, ArrowUpDown, ChevronDown } from 'lucide-react'
import { confirm } from '../stores/useConfirmStore'
import { toast } from '../stores/useToastStore'
import clsx from 'clsx'
import type { Item } from '../types'

type SortMode = 'custom' | 'name' | 'category' | 'date' | 'credit' | 'debit'

const SORT_LABELS: Record<SortMode, string> = {
  custom: 'Custom Order',
  name: 'Name',
  category: 'Category',
  date: 'Date',
  credit: 'Credit',
  debit: 'Debit',
}

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
  const { items, summary, containers, loading, fetchItems, fetchSummary, fetchContainers, createItem, updateItem, deleteItem, sellItem, unsellItem, identifyItem, reorderItems } = useInventoryStore()
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<Item | null>(null)
  const [identifyTarget, setIdentifyTarget] = useState<Item | null>(null)
  const [categoryFilter, setCategoryFilter] = useState('')
  const [showSold, setShowSold] = useState(false)
  const [sortMode, setSortMode] = useState<SortMode>('custom')
  const [showSortMenu, setShowSortMenu] = useState(false)
  const sortMenuRef = useRef<HTMLDivElement>(null)

  // Drag state
  const [dragId, setDragId] = useState<number | null>(null)
  const [dragOverId, setDragOverId] = useState<number | null>(null)

  useEffect(() => {
    const params: Record<string, string> = {}
    if (categoryFilter) params['category'] = categoryFilter
    if (!showSold) params['sold'] = 'false'
    fetchItems(params)
    fetchSummary()
    fetchContainers()
  }, [fetchItems, fetchSummary, fetchContainers, categoryFilter, showSold])

  // Close sort menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target as Node)) {
        setShowSortMenu(false)
      }
    }
    if (showSortMenu) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showSortMenu])

  const sortedItems = useMemo(() => {
    if (sortMode === 'custom') return items
    const sorted = [...items]
    switch (sortMode) {
      case 'name':
        sorted.sort((a, b) => a.name.localeCompare(b.name))
        break
      case 'category':
        sorted.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name))
        break
      case 'date':
        sorted.sort((a, b) => (b.game_date || '').localeCompare(a.game_date || '') || a.name.localeCompare(b.name))
        break
      case 'credit':
        sorted.sort((a, b) => (b.credit_gp ?? 0) - (a.credit_gp ?? 0))
        break
      case 'debit':
        sorted.sort((a, b) => (b.debit_gp ?? 0) - (a.debit_gp ?? 0))
        break
    }
    return sorted
  }, [items, sortMode])

  const handleDragStart = useCallback((id: number) => {
    setDragId(id)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, id: number) => {
    e.preventDefault()
    setDragOverId(id)
  }, [])

  const handleDrop = useCallback(async (targetId: number) => {
    if (dragId == null || dragId === targetId) {
      setDragId(null)
      setDragOverId(null)
      return
    }
    const ids = items.map((i) => i.id)
    const fromIdx = ids.indexOf(dragId)
    const toIdx = ids.indexOf(targetId)
    if (fromIdx === -1 || toIdx === -1) return

    ids.splice(fromIdx, 1)
    ids.splice(toIdx, 0, dragId)

    setDragId(null)
    setDragOverId(null)

    try {
      await reorderItems(ids)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to reorder')
    }
  }, [dragId, items, reorderItems])

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

      {/* Filters + Sort */}
      <div className="flex gap-4 mb-4 items-center">
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

        <div className="relative ml-auto" ref={sortMenuRef}>
          <button
            onClick={() => setShowSortMenu(!showSortMenu)}
            className="flex items-center gap-2 px-3 py-2 border rounded-lg text-sm hover:bg-gray-50"
          >
            <ArrowUpDown className="w-4 h-4" />
            {SORT_LABELS[sortMode]}
            <ChevronDown className="w-3 h-3" />
          </button>
          {showSortMenu && (
            <div className="absolute right-0 top-full mt-1 bg-white border rounded-lg shadow-lg py-1 z-20 min-w-[160px]">
              {(Object.keys(SORT_LABELS) as SortMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => { setSortMode(mode); setShowSortMenu(false) }}
                  className={clsx(
                    'w-full text-left px-4 py-2 text-sm hover:bg-gray-50',
                    sortMode === mode && 'text-blue-600 font-medium'
                  )}
                >
                  {SORT_LABELS[mode]}
                  {sortMode === mode && <span className="float-right text-blue-600">&#10003;</span>}
                </button>
              ))}
            </div>
          )}
        </div>
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
                {sortMode === 'custom' && <th className="w-8"></th>}
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
              {sortedItems.map((item) => (
                <tr
                  key={item.id}
                  className={clsx(
                    item.sold && 'bg-red-50/50',
                    dragOverId === item.id && dragId !== item.id && 'border-t-2 border-t-blue-400',
                  )}
                  draggable={sortMode === 'custom'}
                  onDragStart={() => handleDragStart(item.id)}
                  onDragOver={(e) => handleDragOver(e, item.id)}
                  onDrop={() => handleDrop(item.id)}
                  onDragEnd={() => { setDragId(null); setDragOverId(null) }}
                >
                  {sortMode === 'custom' && (
                    <td className="pl-2 pr-0 py-3 cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500">
                      <GripVertical className="w-4 h-4" />
                    </td>
                  )}
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
