import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useInventoryStore } from '../stores/useInventoryStore'
import { useLabelStore } from '../stores/useLabelStore'
import { hexWithAlpha } from '../constants'
import { Plus, Trash2, DollarSign, Pencil, Sparkles, Undo2, GripVertical, ArrowUpDown, ArrowDownUp, ChevronDown, Search, Package, Upload } from 'lucide-react'
import { confirm } from '../stores/useConfirmStore'
import { toast } from '../stores/useToastStore'
import clsx from 'clsx'
import type { Item, Container, Mount } from '../types'
import { ItemFormModal } from '../components/Inventory/ItemFormModal'
import { IdentifyModal } from '../components/Inventory/IdentifyModal'
import { ContainerManagerModal } from '../components/Inventory/ContainerManagerModal'
import { SellModal } from '../components/Inventory/SellModal'
import { BulkSellModal } from '../components/Inventory/BulkSellModal'
import { BulkLabelsModal } from '../components/Inventory/BulkLabelsModal'
import { ImportModal } from '../components/Inventory/ImportModal'

type SortMode = 'custom' | 'name' | 'labels' | 'date'

/** Parse "M/D" (assumes current year) or "M/D/YY" into components. Returns null for unparseable. */
function parseGameDate(d: string): { month: number; day: number; year: number } | null {
  if (!d) return null
  const parts = d.split('/')
  if (parts.length < 2) return null
  const month = parseInt(parts[0]!, 10)
  const day = parseInt(parts[1]!, 10)
  const year = parts.length >= 3 ? 2000 + parseInt(parts[2]!, 10) : new Date().getFullYear()
  if (isNaN(month) || isNaN(day) || isNaN(year)) return null
  return { month, day, year }
}

function gameDateSortKey(d: string): number {
  const parsed = parseGameDate(d)
  if (!parsed) return 0
  return parsed.year * 10000 + parsed.month * 100 + parsed.day
}

function formatGameDate(d: string): string {
  const parsed = parseGameDate(d)
  if (!parsed) return d
  const yy = String(parsed.year).slice(-2)
  return `${parsed.month}/${parsed.day}/${yy}`
}

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
}

export function InventoryPage() {
  const { items, summary, containers, characters, mounts, loading, fetchItems, fetchSummary, fetchContainers, fetchCharacters, fetchMounts, createItem, updateItem, deleteItem, sellItem, unsellItem, identifyItem, reorderItems, bulkSellItems, bulkDeleteItems, bulkMoveItems, bulkLabelItems, createContainer, updateContainer, deleteContainer } = useInventoryStore()
  const { labels, fetchLabels } = useLabelStore()
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState<Item | null>(null)
  const [identifyTarget, setIdentifyTarget] = useState<Item | null>(null)
  const [sellTarget, setSellTarget] = useState<Item | null>(null)
  const [showContainerManager, setShowContainerManager] = useState(false)
  const [showImport, setShowImport] = useState(false)

  // Multi-select
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [labelFilter, setLabelFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showSold, setShowSold] = useState(false)
  const [sortMode, setSortMode] = useState<SortMode>('custom')
  const [sortReversed, setSortReversed] = useState(false)
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
        sorted.sort((a, b) => gameDateSortKey(b.game_date) - gameDateSortKey(a.game_date) || a.name.localeCompare(b.name))
        break
    }
    if (sortReversed) sorted.reverse()
    return sorted
  }, [items, containers, sortMode, sortReversed, searchQuery])

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

  const [showBulkSell, setShowBulkSell] = useState(false)
  const [showBulkLabels, setShowBulkLabels] = useState(false)

  const handleBulkSell = async (sellPriceGP: number | null) => {
    const ids = [...selectedIds]
    try {
      await bulkSellItems(ids, sellPriceGP)
      setSelectedIds(new Set())
      setShowBulkSell(false)
      toast.success(`Sold ${ids.length} items`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to sell items')
    }
  }

  const handleBulkLabels = async (addLabelIds: string[], removeLabelIds: string[]) => {
    const ids = [...selectedIds]
    try {
      await bulkLabelItems(ids, addLabelIds, removeLabelIds)
      setSelectedIds(new Set())
      setShowBulkLabels(false)
      toast.success(`Updated labels on ${ids.length} items`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update labels')
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
            onClick={() => setShowImport(true)}
            className="flex items-center gap-2 px-4 py-2 bg-surface text-parchment-dim border border-border font-heading font-semibold rounded-lg hover:bg-card-hover text-sm transition-colors"
          >
            <Upload className="w-4 h-4" /> Import
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

        <div className="flex items-center gap-1 ml-auto">
          {sortMode !== 'custom' && (
            <button
              onClick={() => setSortReversed((r) => !r)}
              className={clsx(
                'p-2 border border-border rounded-lg text-sm transition-colors',
                sortReversed ? 'text-gold bg-gold/10 border-gold/30' : 'text-parchment-dim hover:bg-surface hover:text-parchment'
              )}
              title={sortReversed ? 'Reversed' : 'Reverse sort'}
            >
              <ArrowDownUp className="w-4 h-4" />
            </button>
          )}
        <div className="relative" ref={sortMenuRef}>
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
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 mb-4 px-4 py-3 bg-gold/10 border border-gold/30 rounded-lg animate-[fadeIn_0.15s_ease-out]">
          <span className="text-sm font-heading font-semibold text-gold">{selectedIds.size} selected</span>
          <button onClick={() => setShowBulkSell(true)} className="px-3 py-1.5 bg-gold text-base font-heading font-semibold rounded text-sm hover:bg-gold-bright transition-colors">
            Sell
          </button>
          <button onClick={() => setShowBulkLabels(true)} className="px-3 py-1.5 bg-purple-500/20 text-purple-300 font-heading font-semibold rounded text-sm hover:bg-purple-500/30 transition-colors">
            Labels
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
                <th>Value</th>
                <th>Labels</th>
                <th>Container</th>
                <th>Date</th>
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
                  <td className="text-gold text-sm">{item.unit_value_gp != null ? `${item.unit_value_gp} gp` : <span className="text-parchment-muted">--</span>}</td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {item.labels?.map((l) => (
                        <span
                          key={l.id}
                          className="px-2 py-0.5 rounded text-xs font-medium"
                          style={{ backgroundColor: hexWithAlpha(l.color, '40'), color: l.text_color || '#ffffff' }}
                        >
                          {l.name}
                        </span>
                      ))}
                      {(!item.labels || item.labels.length === 0) && (
                        <span className="text-parchment-muted text-xs">--</span>
                      )}
                    </div>
                  </td>
                  <td className="text-xs text-parchment-dim">{(() => {
                    const container = containers.find((c) => c.id === item.container_id)
                    if (!container) return <span className="text-parchment-muted">--</span>
                    return getContainerDisplayName(container, characters, mounts)
                  })()}</td>
                  <td className="text-xs text-parchment-dim">{item.game_date ? formatGameDate(item.game_date) : <span className="text-parchment-muted">--</span>}</td>
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
                      ) : (() => {
                        const container = containers.find((c) => c.id === item.container_id)
                        const isPersonal = container && (container.type === 'character' || (container.character_id != null))
                        return (
                          <button
                            onClick={() => setSellTarget(item)}
                            className={clsx('p-1 transition-colors', isPersonal ? 'text-parchment-muted/30 cursor-not-allowed' : 'text-parchment-muted hover:text-gold')}
                            title={isPersonal ? 'Move to party storage before selling' : 'Sell'}
                            disabled={!!isPersonal}
                          >
                            <DollarSign className="w-4 h-4" />
                          </button>
                        )
                      })()}
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
          onConfirm={async (name, magic) => {
            try {
              await identifyItem(identifyTarget.id, name !== identifyTarget.name ? name : undefined, magic)
              setIdentifyTarget(null)
            } catch (e) {
              toast.error(e instanceof Error ? e.message : 'Failed to identify item')
            }
          }}
          onClose={() => setIdentifyTarget(null)}
        />
      )}

      {sellTarget && (
        <SellModal
          item={sellTarget}
          onConfirm={async (sellPriceGP, quantity) => {
            try {
              await sellItem(sellTarget.id, sellPriceGP, quantity)
              setSellTarget(null)
              toast.success(`Sold ${quantity < sellTarget.quantity ? `${quantity}x ` : ''}${sellTarget.name}`)
            } catch (e) {
              toast.error(e instanceof Error ? e.message : 'Failed to sell item')
            }
          }}
          onClose={() => setSellTarget(null)}
        />
      )}

      {showBulkSell && (
        <BulkSellModal
          items={sortedItems.filter((i) => selectedIds.has(i.id))}
          onConfirm={handleBulkSell}
          onClose={() => setShowBulkSell(false)}
        />
      )}

      {showBulkLabels && (
        <BulkLabelsModal
          items={sortedItems.filter((i) => selectedIds.has(i.id))}
          labels={labels}
          onConfirm={handleBulkLabels}
          onClose={() => setShowBulkLabels(false)}
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

      {showImport && (
        <ImportModal onClose={() => setShowImport(false)} containers={containers} />
      )}

    </div>
  )
}
