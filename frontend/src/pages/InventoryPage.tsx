import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useInventoryStore } from '../stores/useInventoryStore'
import { useLabelStore } from '../stores/useLabelStore'
import { CONTAINER_TYPES, MAX_ATTUNEMENT_SLOTS, hexWithAlpha } from '../constants'
import { Plus, Trash2, DollarSign, Pencil, Sparkles, Undo2, GripVertical, ArrowUpDown, ChevronDown, Search, Package } from 'lucide-react'
import { confirm } from '../stores/useConfirmStore'
import { toast } from '../stores/useToastStore'
import clsx from 'clsx'
import type { Item, Container, Mount, Label } from '../types'

type SortMode = 'custom' | 'name' | 'labels' | 'date' | 'credit' | 'debit'

function getContainerDisplayName(container: Container, characters: { id: string; name: string }[], mounts: Mount[]): string {
  const charOwner = container.character_id ? characters.find((ch) => ch.id === container.character_id) : null
  const mountOwner = container.mount_id ? mounts.find((m) => m.id === container.mount_id) : null
  const owner = charOwner ?? mountOwner
  return owner && !container.name.includes(owner.name) ? `${owner.name}'s ${container.name}` : container.name
}

const SORT_LABELS: Record<SortMode, string> = {
  custom: 'Custom Order',
  name: 'Name',
  labels: 'Labels',
  date: 'Date',
  credit: 'Credit',
  debit: 'Debit',
}

function ItemFormModal({
  item,
  containers,
  allItems,
  labels,
  onSave,
  onClose,
}: {
  item: Partial<Item> | null
  containers: Container[]
  allItems: Item[]
  labels: Label[]
  onSave: (data: Partial<Item>) => void
  onClose: () => void
}) {
  const [form, setForm] = useState<Partial<Item>>(
    item ?? { name: '', quantity: 1, game_date: '', sold: false, label_ids: [] }
  )
  const [selectedLabelIds, setSelectedLabelIds] = useState<Set<string>>(
    new Set(item?.labels?.map((l) => l.id) ?? item?.label_ids ?? [])
  )

  const selectedContainer = containers.find((c) => c.id === form.container_id)
  const canAttune = selectedContainer?.type === 'character' && !!selectedContainer.character_id
  const attunedCount = canAttune
    ? allItems.filter((i) => i.attuned_to === selectedContainer.character_id && i.id !== item?.id).length
    : 0
  const attunementFull = attunedCount >= MAX_ATTUNEMENT_SLOTS

  const handleContainerChange = (containerId: string | null) => {
    const next = containers.find((c) => c.id === containerId)
    const shouldClearAttunement = !next || next.type !== 'character' || !next.character_id
    setForm({
      ...form,
      container_id: containerId,
      attuned_to: shouldClearAttunement ? null : form.attuned_to,
    })
  }

  const toggleLabel = (labelId: string) => {
    setSelectedLabelIds((prev) => {
      const next = new Set(prev)
      if (next.has(labelId)) next.delete(labelId)
      else next.add(labelId)
      return next
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const data = { ...form, label_ids: [...selectedLabelIds] }
    if (data.attuned_to && canAttune) {
      data.attuned_to = selectedContainer.character_id
    }
    onSave(data)
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-[fadeIn_0.15s_ease-out]">
      <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl shadow-2xl shadow-black/40 p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto space-y-4 animate-[slideIn_0.2s_ease-out]">
        <h3 className="font-heading text-lg font-semibold text-parchment">{item?.id ? 'Edit Item' : 'Add Item'}</h3>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-heading font-semibold text-parchment-dim">Name</label>
              {canAttune && (
                <label
                  htmlFor="attuned-check"
                  className={clsx(
                    'flex items-center gap-1.5 text-sm font-heading font-semibold cursor-pointer',
                    attunementFull && !form.attuned_to ? 'text-parchment-muted' : 'text-arcane'
                  )}
                >
                  <input
                    type="checkbox"
                    id="attuned-check"
                    checked={!!form.attuned_to}
                    disabled={attunementFull && !form.attuned_to}
                    onChange={(e) => setForm({ ...form, attuned_to: e.target.checked ? selectedContainer.character_id : null })}
                  />
                  Attuned {attunementFull && !form.attuned_to ? `(${MAX_ATTUNEMENT_SLOTS}/${MAX_ATTUNEMENT_SLOTS})` : `(${attunedCount + (form.attuned_to ? 1 : 0)}/${MAX_ATTUNEMENT_SLOTS})`}
                </label>
              )}
            </div>
            <input
              className="input-themed"
              value={form.name ?? ''}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-heading font-semibold text-parchment-dim mb-1">Quantity</label>
            <input
              type="number"
              className="input-themed"
              value={form.quantity ?? 1}
              onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
              min={1}
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-heading font-semibold text-parchment-dim mb-1">Labels</label>
            <div className="flex flex-wrap gap-1.5">
              {labels.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => toggleLabel(l.id)}
                  className={clsx(
                    'px-2.5 py-1 rounded-full text-xs font-medium border transition-all',
                    selectedLabelIds.has(l.id)
                      ? 'border-transparent text-base'
                      : 'border-border text-parchment-muted hover:text-parchment hover:border-border-light bg-transparent'
                  )}
                  style={selectedLabelIds.has(l.id) ? { backgroundColor: hexWithAlpha(l.color, '30'), color: l.color, borderColor: hexWithAlpha(l.color, '50') } : undefined}
                >
                  {l.name}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-heading font-semibold text-parchment-dim mb-1">Credit (gp)</label>
            <input
              type="number"
              step="0.01"
              className="input-themed"
              value={form.credit_gp ?? ''}
              onChange={(e) => setForm({ ...form, credit_gp: e.target.value ? Number(e.target.value) : null })}
            />
          </div>
          <div>
            <label className="block text-sm font-heading font-semibold text-parchment-dim mb-1">Debit (gp)</label>
            <input
              type="number"
              step="0.01"
              className="input-themed"
              value={form.debit_gp ?? ''}
              onChange={(e) => setForm({ ...form, debit_gp: e.target.value ? Number(e.target.value) : null })}
            />
          </div>
          <div>
            <label className="block text-sm font-heading font-semibold text-parchment-dim mb-1">Game Date</label>
            <input
              className="input-themed"
              value={form.game_date ?? ''}
              onChange={(e) => setForm({ ...form, game_date: e.target.value })}
              placeholder="M/D or M/D/YY"
            />
          </div>
          <div>
            <label className="block text-sm font-heading font-semibold text-parchment-dim mb-1">Container</label>
            <select
              className="input-themed"
              value={form.container_id ?? ''}
              onChange={(e) => handleContainerChange(e.target.value || null)}
            >
              <option value="">None</option>
              {containers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-heading font-semibold text-parchment-dim mb-1">Unit Weight (lbs)</label>
            <input
              type="number"
              step="0.01"
              className="input-themed"
              value={form.unit_weight_lbs ?? ''}
              onChange={(e) => setForm({ ...form, unit_weight_lbs: e.target.value ? Number(e.target.value) : null })}
            />
          </div>
          <div>
            <label className="block text-sm font-heading font-semibold text-parchment-dim mb-1">Unit Value (gp)</label>
            <input
              type="number"
              step="0.01"
              className="input-themed"
              value={form.unit_value_gp ?? ''}
              onChange={(e) => setForm({ ...form, unit_value_gp: e.target.value ? Number(e.target.value) : null })}
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-heading font-semibold text-parchment-dim mb-1">Notes</label>
            <input
              className="input-themed"
              value={form.notes ?? ''}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-parchment-dim bg-surface border border-border rounded-lg hover:bg-card-hover transition-colors">
            Cancel
          </button>
          <button type="submit" className="px-4 py-2 text-base bg-gold font-heading font-semibold rounded-lg hover:bg-gold-bright transition-colors">
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
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-[fadeIn_0.15s_ease-out]">
      <div className="bg-card border border-border rounded-xl shadow-2xl shadow-black/40 p-6 w-full max-w-sm space-y-4 animate-[slideIn_0.2s_ease-out]">
        <h3 className="font-heading text-lg font-semibold text-parchment">Identify Item</h3>
        <p className="text-sm text-parchment-muted">Mark this item as identified. You can optionally rename it.</p>
        <div>
          <label className="block text-sm font-heading font-semibold text-parchment-dim mb-1">Item Name</label>
          <input
            className="input-themed"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            style={{ borderColor: 'rgba(139, 108, 193, 0.4)' }}
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-parchment-dim bg-surface border border-border rounded-lg hover:bg-card-hover transition-colors">
            Cancel
          </button>
          <button
            onClick={() => onConfirm(name)}
            className="px-4 py-2 text-parchment bg-arcane rounded-lg hover:bg-arcane-dim transition-colors font-heading font-semibold"
          >
            Identify
          </button>
        </div>
      </div>
    </div>
  )
}

function ContainerManagerModal({
  containers,
  characters,
  mounts,
  onSave,
  onDelete,
  onClose,
}: {
  containers: Container[]
  characters: { id: string; name: string }[]
  mounts: Mount[]
  onSave: (data: Partial<Container>, id?: string) => void
  onDelete: (id: string) => void
  onClose: () => void
}) {
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<Partial<Container>>({ name: '', type: 'bag', notes: '', location: '' })

  const startEdit = (c: Container) => {
    setEditId(c.id)
    setForm(c)
  }
  const startNew = () => {
    setEditId(null)
    setForm({ name: '', type: 'bag', notes: '', location: '' })
  }

  const handleOwnerChange = (value: string) => {
    if (!value) {
      setForm({ ...form, character_id: null, mount_id: null })
    } else if (value.startsWith('mount:')) {
      setForm({ ...form, character_id: null, mount_id: value.slice(6) })
    } else {
      setForm({ ...form, character_id: value, mount_id: null })
    }
  }

  const ownerValue = form.character_id ?? (form.mount_id ? `mount:${form.mount_id}` : '')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(form, editId ?? undefined)
    startNew()
  }

  const getOwnerName = (c: Container) => {
    if (c.character_id) return characters.find((ch) => ch.id === c.character_id)?.name ?? '--'
    if (c.mount_id) return mounts.find((m) => m.id === c.mount_id)?.name ?? '--'
    return '--'
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-[fadeIn_0.15s_ease-out]">
      <div className="bg-card border border-border rounded-xl shadow-2xl shadow-black/40 p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto space-y-4 animate-[slideIn_0.2s_ease-out]">
        <div className="flex items-center justify-between">
          <h3 className="font-heading text-lg font-semibold text-parchment">Manage Containers</h3>
          <button onClick={onClose} className="text-parchment-muted hover:text-parchment transition-colors text-xl">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-heading font-semibold text-parchment-dim mb-1">Name</label>
            <input className="input-themed" value={form.name ?? ''} onChange={(e) => setForm({ ...form, name: e.target.value })} required autoFocus />
          </div>
          <div>
            <label className="block text-sm font-heading font-semibold text-parchment-dim mb-1">Type</label>
            <select className="input-themed" value={form.type ?? 'bag'} onChange={(e) => setForm({ ...form, type: e.target.value as Container['type'] })}>
              {CONTAINER_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-heading font-semibold text-parchment-dim mb-1">Owner</label>
            <select className="input-themed" value={ownerValue} onChange={(e) => handleOwnerChange(e.target.value)}>
              <option value="">None</option>
              <optgroup label="Characters">
                {characters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </optgroup>
              {mounts.length > 0 && (
                <optgroup label="Pack Animals">
                  {mounts.map((m) => <option key={m.id} value={`mount:${m.id}`}>{m.name}</option>)}
                </optgroup>
              )}
            </select>
          </div>
          <div>
            <label className="block text-sm font-heading font-semibold text-parchment-dim mb-1">Weight Limit</label>
            <input type="number" step="0.1" className="input-themed" value={form.weight_limit ?? ''} onChange={(e) => setForm({ ...form, weight_limit: e.target.value ? Number(e.target.value) : null })} />
          </div>
          <div>
            <label className="block text-sm font-heading font-semibold text-parchment-dim mb-1">Location</label>
            <input className="input-themed" value={form.location ?? ''} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. Waterdeep safehouse" />
          </div>
          <div>
            <label className="block text-sm font-heading font-semibold text-parchment-dim mb-1">Notes</label>
            <input className="input-themed" value={form.notes ?? ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div className="col-span-2 flex gap-2">
            <button type="submit" className="px-4 py-2 bg-gold text-base font-heading font-semibold rounded-lg hover:bg-gold-bright transition-colors text-sm">
              {editId ? 'Update' : 'Add'} Container
            </button>
            {editId && (
              <button type="button" onClick={startNew} className="px-4 py-2 bg-surface text-parchment-dim border border-border rounded-lg hover:bg-card-hover transition-colors text-sm">
                Cancel Edit
              </button>
            )}
          </div>
        </form>

        <div className="border-t border-border pt-4">
          {containers.length === 0 ? (
            <p className="text-sm text-parchment-muted">No containers yet</p>
          ) : (
            <table className="tt-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Owner</th>
                  <th>Location</th>
                  <th>Limit</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {containers.map((c) => (
                  <tr key={c.id}>
                    <td className="font-medium">{c.name}</td>
                    <td><span className="px-2 py-0.5 rounded text-xs bg-surface text-parchment-dim">{c.type}</span></td>
                    <td className="text-sm text-parchment-dim">{getOwnerName(c)}</td>
                    <td className="text-sm text-parchment-dim">{c.location || '--'}</td>
                    <td className="text-sm text-parchment-dim">{c.weight_limit != null ? `${c.weight_limit} lbs` : '--'}</td>
                    <td>
                      <div className="flex gap-1">
                        <button onClick={() => startEdit(c)} className="p-1 text-parchment-muted hover:text-sky transition-colors" title="Edit">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={async () => { if (await confirm('Delete this container? Items in it will become unassigned.')) onDelete(c.id) }}
                          className="p-1 text-parchment-muted hover:text-wine transition-colors" title="Delete"
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
      </div>
    </div>
  )
}

export function InventoryPage() {
  const { items, summary, containers, characters, mounts, loading, fetchItems, fetchSummary, fetchContainers, fetchCharacters, fetchMounts, createItem, updateItem, deleteItem, sellItem, unsellItem, identifyItem, reorderItems, bulkSellItems, bulkDeleteItems, bulkMoveItems, createContainer, updateContainer, deleteContainer } = useInventoryStore()
  const { labels, fetchLabels } = useLabelStore()
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<Item | null>(null)
  const [identifyTarget, setIdentifyTarget] = useState<Item | null>(null)
  const [showContainerManager, setShowContainerManager] = useState(false)

  // Multi-select
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [labelFilter, setLabelFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showSold, setShowSold] = useState(false)
  const [sortMode, setSortMode] = useState<SortMode>('custom')
  const [showSortMenu, setShowSortMenu] = useState(false)
  const sortMenuRef = useRef<HTMLDivElement>(null)

  // Drag state
  const [dragId, setDragId] = useState<number | null>(null)
  const [dragOverId, setDragOverId] = useState<number | null>(null)

  useEffect(() => {
    const params: Record<string, string> = {}
    if (labelFilter) params['label'] = labelFilter
    if (!showSold) params['sold'] = 'false'
    fetchItems(params)
    fetchSummary()
    fetchContainers()
    fetchCharacters()
    fetchMounts()
  }, [fetchItems, fetchSummary, fetchContainers, fetchCharacters, fetchMounts, labelFilter, showSold])

  useEffect(() => { fetchLabels() }, [fetchLabels])

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
    let filtered = items
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      filtered = items.filter((i) =>
        i.name.toLowerCase().includes(q) ||
        (i.notes && i.notes.toLowerCase().includes(q)) ||
        (i.labels && i.labels.some((l) => l.name.toLowerCase().includes(q))) ||
        (i.container_id && containers.find((c) => c.id === i.container_id)?.name.toLowerCase().includes(q))
      )
    }
    if (sortMode === 'custom') return filtered
    const sorted = [...filtered]
    switch (sortMode) {
      case 'name':
        sorted.sort((a, b) => a.name.localeCompare(b.name))
        break
      case 'labels':
        sorted.sort((a, b) => {
          const aLabel = a.labels?.[0]?.name ?? ''
          const bLabel = b.labels?.[0]?.name ?? ''
          return aLabel.localeCompare(bLabel) || a.name.localeCompare(b.name)
        })
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
  }, [items, containers, sortMode, searchQuery])

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

  const toggleSelect = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) =>
      prev.size === sortedItems.length ? new Set() : new Set(sortedItems.map((i) => i.id))
    )
  }, [sortedItems])

  const handleBulkSell = async () => {
    const ids = [...selectedIds]
    try {
      await bulkSellItems(ids)
      setSelectedIds(new Set())
      toast.success(`Sold ${ids.length} items`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to sell items')
    }
  }

  const handleBulkDelete = async () => {
    const ids = [...selectedIds]
    if (!(await confirm(`Delete ${ids.length} items? This cannot be undone.`))) return
    try {
      await bulkDeleteItems(ids)
      setSelectedIds(new Set())
      toast.success(`Deleted ${ids.length} items`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete items')
    }
  }

  const [showMoveMenu, setShowMoveMenu] = useState(false)
  const moveMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (moveMenuRef.current && !moveMenuRef.current.contains(e.target as Node)) {
        setShowMoveMenu(false)
      }
    }
    if (showMoveMenu) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showMoveMenu])

  const handleBulkMove = async (containerId: string) => {
    const ids = [...selectedIds]
    try {
      await bulkMoveItems(ids, containerId)
      setSelectedIds(new Set())
      setShowMoveMenu(false)
      toast.success(`Moved ${ids.length} items`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to move items')
    }
  }

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
        <h2 className="font-heading text-3xl font-bold text-parchment">Inventory</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowContainerManager(true)}
            className="flex items-center gap-2 px-4 py-2 bg-surface text-parchment-dim border border-border font-heading font-semibold rounded-lg hover:bg-card-hover text-sm transition-colors"
          >
            <Package className="w-4 h-4" /> Containers
          </button>
          <button
            onClick={() => { setEditItem(null); setShowForm(true) }}
            className="flex items-center gap-2 px-4 py-2 bg-gold text-base font-heading font-semibold rounded-lg hover:bg-gold-bright text-sm transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Item
          </button>
        </div>
      </div>

      {/* Summary bar */}
      {summary && (
        <div className="flex flex-wrap gap-3 mb-4 text-sm">
          <span className="px-3 py-1.5 bg-gold/10 text-gold rounded-full font-medium">Party Coin: {summary.party_coin_gp.toFixed(2)} gp</span>
          <span className="px-3 py-1.5 bg-emerald/10 text-emerald rounded-full font-medium">Net Worth: {summary.net_worth_gp.toFixed(2)} gp</span>
          <span className="px-3 py-1.5 bg-sky/10 text-sky rounded-full font-medium">Weight: {summary.total_weight.toFixed(1)} lbs</span>
          <span className="px-3 py-1.5 bg-arcane/10 text-arcane rounded-full font-medium">{summary.item_count} items</span>
        </div>
      )}

      {/* Filters + Sort */}
      <div className="flex gap-4 mb-4 items-center flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-parchment-muted" />
          <input
            className="input-themed !pl-9 !w-[200px]"
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <select
          className="input-themed !w-auto"
          value={labelFilter}
          onChange={(e) => setLabelFilter(e.target.value)}
        >
          <option value="">All Labels</option>
          {labels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm text-parchment-dim">
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
            className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg text-sm text-parchment-dim hover:bg-surface hover:text-parchment transition-colors"
          >
            <ArrowUpDown className="w-4 h-4" />
            {SORT_LABELS[sortMode]}
            <ChevronDown className="w-3 h-3" />
          </button>
          {showSortMenu && (
            <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-xl shadow-black/30 py-1 z-20 min-w-[160px]">
              {(Object.keys(SORT_LABELS) as SortMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => { setSortMode(mode); setShowSortMenu(false) }}
                  className={clsx(
                    'w-full text-left px-4 py-2 text-sm hover:bg-surface transition-colors',
                    sortMode === mode ? 'text-gold font-medium' : 'text-parchment-dim'
                  )}
                >
                  {SORT_LABELS[mode]}
                  {sortMode === mode && <span className="float-right text-gold">&#10003;</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 mb-4 px-4 py-3 bg-gold/10 border border-gold/30 rounded-lg animate-[fadeIn_0.15s_ease-out]">
          <span className="text-sm font-heading font-semibold text-gold">{selectedIds.size} selected</span>
          <button onClick={handleBulkSell} className="px-3 py-1.5 bg-gold text-base font-heading font-semibold rounded text-sm hover:bg-gold-bright transition-colors">
            Sell
          </button>
          <div className="relative" ref={moveMenuRef}>
            <button onClick={() => setShowMoveMenu(!showMoveMenu)} className="px-3 py-1.5 bg-sky/20 text-sky font-heading font-semibold rounded text-sm hover:bg-sky/30 transition-colors">
              Move to...
            </button>
            {showMoveMenu && (
              <div className="absolute left-0 top-full mt-1 bg-card border border-border rounded-lg shadow-xl shadow-black/30 py-1 z-20 min-w-[200px] max-h-60 overflow-y-auto">
                {containers.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => handleBulkMove(c.id)}
                      className="w-full text-left px-4 py-2 text-sm text-parchment-dim hover:bg-surface transition-colors"
                    >
                      {getContainerDisplayName(c, characters, mounts)}
                    </button>
                  ))}
              </div>
            )}
          </div>
          <button onClick={handleBulkDelete} className="px-3 py-1.5 bg-wine/20 text-wine font-heading font-semibold rounded text-sm hover:bg-wine/30 transition-colors">
            Delete
          </button>
          <button onClick={() => setSelectedIds(new Set())} className="ml-auto px-3 py-1.5 text-parchment-muted text-sm hover:text-parchment transition-colors">
            Clear selection
          </button>
        </div>
      )}

      {/* Items table */}
      <div className="bg-card border border-border rounded-xl overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center text-parchment-muted">Loading...</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-parchment-muted">No items found</div>
        ) : (
          <table className="tt-table">
            <thead>
              <tr>
                <th className="w-8 !pl-2 !pr-0">
                  <input type="checkbox" checked={selectedIds.size > 0 && selectedIds.size === sortedItems.length} onChange={toggleSelectAll} />
                </th>
                {sortMode === 'custom' && <th className="w-8"></th>}
                <th>Name</th>
                <th>Qty</th>
                <th>Labels</th>
                <th>Credit</th>
                <th>Debit</th>
                <th>Date</th>
                <th>Container</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedItems.map((item) => (
                <tr
                  key={item.id}
                  className={clsx(
                    item.sold && 'bg-wine/5',
                    dragOverId === item.id && dragId !== item.id && 'border-t-2 !border-t-gold/50',
                  )}
                  draggable={sortMode === 'custom'}
                  onDragStart={() => handleDragStart(item.id)}
                  onDragOver={(e) => handleDragOver(e, item.id)}
                  onDrop={() => handleDrop(item.id)}
                  onDragEnd={() => { setDragId(null); setDragOverId(null) }}
                >
                  <td className="!pl-2 !pr-0">
                    <input type="checkbox" checked={selectedIds.has(item.id)} onChange={() => toggleSelect(item.id)} />
                  </td>
                  {sortMode === 'custom' && (
                    <td className="!pl-2 !pr-0 cursor-grab active:cursor-grabbing text-parchment-muted hover:text-gold transition-colors">
                      <GripVertical className="w-4 h-4" />
                    </td>
                  )}
                  <td>
                    <span className={clsx('font-medium', item.sold && 'line-through text-parchment-muted')}>{item.name}</span>
                    {item.sold && (
                      <span className="ml-2 px-1.5 py-0.5 bg-wine/20 text-wine text-xs font-medium rounded">SOLD</span>
                    )}
                    {!item.identified && (
                      <span className="ml-2 px-1.5 py-0.5 bg-amber/20 text-amber text-xs font-medium rounded">TBI</span>
                    )}
                    {item.attuned_to && (
                      <span className="ml-2 px-1.5 py-0.5 bg-arcane/20 text-arcane text-xs font-medium rounded">
                        {characters.find((c) => c.id === item.attuned_to)?.name ?? 'Attuned'}
                      </span>
                    )}
                    {item.notes && <p className="text-xs text-parchment-muted mt-0.5">{item.notes}</p>}
                  </td>
                  <td>{item.quantity}</td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {item.labels?.map((l) => (
                        <span
                          key={l.id}
                          className="px-2 py-0.5 rounded text-xs font-medium"
                          style={{ backgroundColor: hexWithAlpha(l.color, '25'), color: l.color }}
                        >
                          {l.name}
                        </span>
                      ))}
                      {(!item.labels || item.labels.length === 0) && (
                        <span className="text-parchment-muted text-xs">--</span>
                      )}
                    </div>
                  </td>
                  <td className="text-emerald">{item.credit_gp != null ? `${item.credit_gp} gp` : <span className="text-parchment-muted">--</span>}</td>
                  <td className="text-wine">{item.debit_gp != null ? `${item.debit_gp} gp` : <span className="text-parchment-muted">--</span>}</td>
                  <td className="text-parchment-dim">{item.game_date || <span className="text-parchment-muted">--</span>}</td>
                  <td className="text-xs text-parchment-dim">{(() => {
                    const container = containers.find((c) => c.id === item.container_id)
                    if (!container) return <span className="text-parchment-muted">--</span>
                    return getContainerDisplayName(container, characters, mounts)
                  })()}</td>
                  <td>
                    <div className="flex gap-1">
                      <button
                        onClick={() => { setEditItem(item); setShowForm(true) }}
                        className="p-1 text-parchment-muted hover:text-sky transition-colors"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      {!item.identified && (
                        <button
                          onClick={() => setIdentifyTarget(item)}
                          className="p-1 text-parchment-muted hover:text-arcane transition-colors"
                          title="Identify"
                        >
                          <Sparkles className="w-4 h-4" />
                        </button>
                      )}
                      {item.sold ? (
                        <button
                          onClick={async () => { try { await unsellItem(item.id) } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed to unsell') } }}
                          className="p-1 text-parchment-muted hover:text-amber transition-colors"
                          title="Undo sold"
                        >
                          <Undo2 className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={async () => { try { await sellItem(item.id) } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed to sell') } }}
                          className="p-1 text-parchment-muted hover:text-gold transition-colors"
                          title="Mark as sold"
                        >
                          <DollarSign className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={async () => { if (await confirm('Delete this item?')) { try { await deleteItem(item.id) } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed to delete') } } }}
                        className="p-1 text-parchment-muted hover:text-wine transition-colors"
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
          allItems={items}
          labels={labels}
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

      {showContainerManager && (
        <ContainerManagerModal
          containers={containers}
          characters={characters}
          mounts={mounts}
          onSave={async (data, id) => {
            try {
              if (id) {
                await updateContainer(id, data)
              } else {
                await createContainer(data)
              }
            } catch (e) {
              toast.error(e instanceof Error ? e.message : 'Failed to save container')
            }
          }}
          onDelete={async (id) => {
            try {
              await deleteContainer(id)
            } catch (e) {
              toast.error(e instanceof Error ? e.message : 'Failed to delete container')
            }
          }}
          onClose={() => setShowContainerManager(false)}
        />
      )}

    </div>
  )
}
