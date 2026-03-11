import { useCallback, useEffect, useState } from 'react'
import { api } from '../api/client'
import { toast } from '../stores/useToastStore'
import { useInventoryStore } from '../stores/useInventoryStore'
import { confirm } from '../stores/useConfirmStore'
import { Trash2, Split, ChevronDown } from 'lucide-react'
import clsx from 'clsx'
import { DENOM_TO_CP, GEMS_JEWELRY_LABEL_IDS } from '../constants'
import type { CoinBalance, CoinLedgerEntry, ItemSummary, Character } from '../types'

const DENOM_ORDER = ['pp', 'gp', 'ep', 'sp', 'cp'] as const
const DENOM_LABELS: Record<string, string> = { pp: 'Platinum', gp: 'Gold', ep: 'Electrum', sp: 'Silver', cp: 'Copper' }
const DENOM_COLORS: Record<string, string> = { pp: 'text-parchment', gp: 'text-gold', ep: 'text-parchment-dim', sp: 'text-sky', cp: 'text-amber' }

export function WealthPage() {
  const [balance, setBalance] = useState<CoinBalance | null>(null)
  const [ledger, setLedger] = useState<CoinLedgerEntry[]>([])
  const [summary, setSummary] = useState<ItemSummary | null>(null)
  const [showAddEntry, setShowAddEntry] = useState(false)
  const [showConvert, setShowConvert] = useState(false)
  const [showSplit, setShowSplit] = useState(false)
  const { items, fetchItems, characters, fetchCharacters } = useInventoryStore()
  const [gemsCollapsed, setGemsCollapsed] = useState(false)
  const [ledgerCollapsed, setLedgerCollapsed] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const [archivedEntries, setArchivedEntries] = useState<CoinLedgerEntry[]>([])
  const [archivedCount, setArchivedCount] = useState(0)
  const [showArchiveForm, setShowArchiveForm] = useState(false)
  const [archiveBefore, setArchiveBefore] = useState('')
  const [archivePreviewCount, setArchivePreviewCount] = useState<number | null>(null)
  const [archiving, setArchiving] = useState(false)

  const fetchAll = useCallback(async () => {
    try {
      const [bal, entries, sum, allEntries] = await Promise.all([
        api.get<CoinBalance>('/coins/balance'),
        api.get<CoinLedgerEntry[]>('/coins'),
        api.get<ItemSummary>('/items/summary'),
        api.get<CoinLedgerEntry[]>('/coins?archived=true'),
      ])
      setBalance(bal)
      setLedger(entries)
      setSummary(sum)
      setArchivedCount(allEntries.length - entries.length)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to fetch wealth data')
    }
  }, [])

  useEffect(() => { fetchAll(); fetchItems({ sold: 'false' }); fetchCharacters() }, [fetchAll])

  const gemsAndJewelry = items.filter((i) => i.labels?.some((l) => GEMS_JEWELRY_LABEL_IDS.has(l.id)) && !i.sold)
  const gemsTotal = gemsAndJewelry.reduce((sum, i) => sum + (i.unit_value_gp ?? 0) * i.quantity, 0)

  const handleDeleteEntry = async (id: number) => {
    if (!(await confirm('Delete this coin entry?'))) return
    try {
      await api.del(`/coins/${id}`)
      await fetchAll()
      toast.success('Entry deleted')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete')
    }
  }

  const fetchArchivePreview = async (dateStr: string) => {
    if (!dateStr) { setArchivePreviewCount(null); return }
    try {
      const result = await api.get<{ count: number }>(`/coins/archive/preview?before_date=${encodeURIComponent(dateStr)}`)
      setArchivePreviewCount(result.count)
    } catch {
      setArchivePreviewCount(null)
    }
  }

  const handleArchive = async () => {
    if (!archiveBefore) return
    setArchiving(true)
    try {
      const result = await api.post<{ archived_count: number }>('/coins/archive', { before_date: archiveBefore })
      toast.success(`Archived ${result.archived_count} entries`)
      setShowArchiveForm(false)
      setArchiveBefore('')
      setArchivePreviewCount(null)
      setShowArchived(false)
      setArchivedEntries([])
      await fetchAll()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to archive')
    } finally {
      setArchiving(false)
    }
  }

  const handleToggleArchived = async () => {
    if (!showArchived && archivedEntries.length === 0) {
      try {
        const allEntries = await api.get<CoinLedgerEntry[]>('/coins?archived=true')
        setArchivedEntries(allEntries.filter(e => e.archived))
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Failed to fetch archived entries')
        return
      }
    }
    setShowArchived(!showArchived)
  }

  const RECENT_COUNT = 20
  const displayedEntries = showAll ? ledger : ledger.slice(0, RECENT_COUNT)
  const hasMore = ledger.length > RECENT_COUNT

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-heading text-3xl font-bold text-parchment">Wealth & Coinage</h2>
        <div className="flex gap-2">
          <button onClick={() => { setShowSplit(!showSplit); setShowConvert(false); setShowAddEntry(false) }} className="px-4 py-2 bg-surface text-parchment-dim border border-border font-heading font-semibold rounded-lg hover:bg-card-hover text-sm transition-colors">
            <Split className="w-4 h-4 inline mr-1.5" />Split Loot
          </button>
          <button onClick={() => { setShowConvert(!showConvert); setShowSplit(false); setShowAddEntry(false) }} className="px-4 py-2 bg-surface text-parchment-dim border border-border font-heading font-semibold rounded-lg hover:bg-card-hover text-sm transition-colors">
            Convert Coins
          </button>
          <button onClick={() => { setShowAddEntry(!showAddEntry); setShowSplit(false); setShowConvert(false) }} className="px-4 py-2 bg-gold text-base font-heading font-semibold rounded-lg hover:bg-gold-bright text-sm transition-colors">
            Add Entry
          </button>
        </div>
      </div>

      {/* Balance cards */}
      {balance && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {DENOM_ORDER.map((d) => (
            <div key={d} className="tt-card p-4 text-center">
              <p className="text-xs font-heading font-semibold text-parchment-muted uppercase mb-1">{DENOM_LABELS[d]}</p>
              <p className={`text-2xl font-bold ${DENOM_COLORS[d]}`}>{balance[d]}</p>
            </div>
          ))}
          <div className="tt-card p-4 text-center bg-emerald/5 border-emerald/20">
            <p className="text-xs font-heading font-semibold text-parchment-muted uppercase mb-1">Total (GP)</p>
            <p className="text-2xl font-bold text-emerald">{balance.total_gp.toFixed(2)}</p>
          </div>
        </div>
      )}

      {/* Net worth summary */}
      {summary && (
        <div className="flex flex-wrap gap-3 mb-6 text-sm">
          <span className="px-3 py-1.5 bg-gold/10 text-gold rounded-full font-medium">Coin Purse: {balance?.total_gp.toFixed(2) ?? '...'} GP</span>
          <span className="px-3 py-1.5 bg-amber/10 text-amber rounded-full font-medium">Gems & Jewelry: {gemsTotal.toFixed(2)} GP</span>
          <span className="px-3 py-1.5 bg-emerald/10 text-emerald rounded-full font-medium">Net Worth: {summary.net_worth_gp.toFixed(2)} GP</span>
        </div>
      )}

      {/* Split loot */}
      {showSplit && <LootSplitForm characters={characters} balance={balance} onDone={() => { setShowSplit(false); fetchAll() }} onCancel={() => setShowSplit(false)} />}

      {/* Coin conversion */}
      {showConvert && <CoinConvertForm onDone={fetchAll} />}

      {/* Add entry form */}
      {showAddEntry && <CoinEntryForm onDone={() => { setShowAddEntry(false); fetchAll() }} onCancel={() => setShowAddEntry(false)} />}

      {/* Gems & Jewelry section */}
      {gemsAndJewelry.length > 0 && (
        <div className="mb-6">
          <button onClick={() => setGemsCollapsed(!gemsCollapsed)} className="flex items-center gap-2 mb-3 group">
            <ChevronDown className={clsx('w-4 h-4 text-parchment-muted transition-transform', gemsCollapsed && '-rotate-90')} />
            <h3 className="font-heading text-lg font-semibold text-parchment group-hover:text-gold transition-colors">Gems & Jewelry</h3>
            <span className="text-sm text-parchment-muted">({gemsAndJewelry.length})</span>
          </button>
          {!gemsCollapsed && (
            <div className="bg-card border border-border rounded-xl overflow-x-auto">
              <table className="tt-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Qty</th>
                    <th>Unit Value</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {gemsAndJewelry.map((item) => (
                    <tr key={item.id}>
                      <td className="font-medium">{item.name}</td>
                      <td>{item.quantity}</td>
                      <td className="text-gold">{item.unit_value_gp != null ? `${item.unit_value_gp} GP` : '--'}</td>
                      <td className="text-gold font-medium">{((item.unit_value_gp ?? 0) * item.quantity).toFixed(2)} GP</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-border">
                    <td className="font-heading font-semibold" colSpan={3}>Total</td>
                    <td className="text-gold font-bold">{gemsTotal.toFixed(2)} GP</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Coin ledger */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <button onClick={() => setLedgerCollapsed(!ledgerCollapsed)} className="flex items-center gap-2 group">
          <ChevronDown className={clsx('w-4 h-4 text-parchment-muted transition-transform', ledgerCollapsed && '-rotate-90')} />
          <h3 className="font-heading text-lg font-semibold text-parchment group-hover:text-gold transition-colors">Coin Ledger</h3>
          <span className="text-sm text-parchment-muted">
            ({hasMore && !showAll ? `${RECENT_COUNT} of ${ledger.length}` : ledger.length})
          </span>
        </button>
        <div className="ml-auto flex items-center gap-3 text-sm">
          {!ledgerCollapsed && (
            <>
              <button
                onClick={() => setShowArchiveForm(!showArchiveForm)}
                className="text-parchment-muted hover:text-parchment transition-colors"
              >
                Archive old entries
              </button>
              {archivedCount > 0 && (
                <button
                  onClick={handleToggleArchived}
                  className={clsx('transition-colors', showArchived ? 'text-gold' : 'text-parchment-muted hover:text-parchment')}
                >
                  {showArchived ? 'Hide' : 'Show'} archived ({archivedCount})
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Archive form */}
      {showArchiveForm && !ledgerCollapsed && (
        <div className="bg-card border border-border rounded-xl p-4 mb-4 flex items-end gap-3 flex-wrap">
          <div>
            <label className="block text-sm font-heading font-semibold text-parchment-dim mb-1">Archive entries before</label>
            <input
              className="input-themed w-32"
              value={archiveBefore}
              onChange={(e) => { setArchiveBefore(e.target.value); fetchArchivePreview(e.target.value) }}
              placeholder="M/D or M/D/YY"
            />
          </div>
          {archivePreviewCount !== null && archiveBefore && (
            <span className="pb-2 text-sm text-parchment-dim">
              {archivePreviewCount === 0 ? 'No entries to archive' : `${archivePreviewCount} entries will be archived`}
            </span>
          )}
          <button
            onClick={handleArchive}
            disabled={archiving || !archiveBefore || archivePreviewCount === 0}
            className="px-4 py-2 bg-gold text-base font-heading font-semibold rounded-lg hover:bg-gold-bright transition-colors text-sm disabled:opacity-50"
          >
            {archiving ? 'Archiving...' : 'Archive'}
          </button>
          <button
            onClick={() => { setShowArchiveForm(false); setArchiveBefore(''); setArchivePreviewCount(null) }}
            className="px-4 py-2 text-parchment-dim bg-surface border border-border rounded-lg hover:bg-card-hover transition-colors text-sm"
          >
            Cancel
          </button>
        </div>
      )}

      {!ledgerCollapsed && (
        <div className="bg-card border border-border rounded-xl overflow-x-auto">
          {ledger.length === 0 ? (
            <div className="p-8 text-center text-parchment-muted">No coin entries yet</div>
          ) : (
            <>
              <table className="tt-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Direction</th>
                    <th>PP</th>
                    <th>GP</th>
                    <th>EP</th>
                    <th>SP</th>
                    <th>CP</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {displayedEntries.map((e) => (
                    <tr key={e.id}>
                      <td className="text-parchment-dim">{e.game_date || '--'}</td>
                      <td className="font-medium">{e.description || '--'}</td>
                      <td>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${e.direction === 'in' ? 'bg-emerald/15 text-emerald' : 'bg-wine/15 text-wine'}`}>
                          {e.direction}
                        </span>
                      </td>
                      <td className={e.pp ? DENOM_COLORS.pp : 'text-parchment-muted'}>{e.pp || '--'}</td>
                      <td className={e.gp ? DENOM_COLORS.gp : 'text-parchment-muted'}>{e.gp || '--'}</td>
                      <td className={e.ep ? DENOM_COLORS.ep : 'text-parchment-muted'}>{e.ep || '--'}</td>
                      <td className={e.sp ? DENOM_COLORS.sp : 'text-parchment-muted'}>{e.sp || '--'}</td>
                      <td className={e.cp ? DENOM_COLORS.cp : 'text-parchment-muted'}>{e.cp || '--'}</td>
                      <td>
                        <button onClick={() => handleDeleteEntry(e.id)} className="p-1 text-parchment-muted hover:text-wine transition-colors" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {/* Show archived entries dimmed at bottom */}
                  {showArchived && archivedEntries.map((e) => (
                    <tr key={`archived-${e.id}`} className="opacity-50">
                      <td className="text-parchment-dim">{e.game_date || '--'}</td>
                      <td className="font-medium">{e.description || '--'}</td>
                      <td>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${e.direction === 'in' ? 'bg-emerald/15 text-emerald' : 'bg-wine/15 text-wine'}`}>
                          {e.direction}
                        </span>
                      </td>
                      <td className={e.pp ? DENOM_COLORS.pp : 'text-parchment-muted'}>{e.pp || '--'}</td>
                      <td className={e.gp ? DENOM_COLORS.gp : 'text-parchment-muted'}>{e.gp || '--'}</td>
                      <td className={e.ep ? DENOM_COLORS.ep : 'text-parchment-muted'}>{e.ep || '--'}</td>
                      <td className={e.sp ? DENOM_COLORS.sp : 'text-parchment-muted'}>{e.sp || '--'}</td>
                      <td className={e.cp ? DENOM_COLORS.cp : 'text-parchment-muted'}>{e.cp || '--'}</td>
                      <td>
                        <button onClick={() => handleDeleteEntry(e.id)} className="p-1 text-parchment-muted hover:text-wine transition-colors" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {/* Show all / Show recent toggle */}
              {hasMore && (
                <div className="p-3 text-center border-t border-border">
                  <button
                    onClick={() => setShowAll(!showAll)}
                    className="text-sm text-parchment-muted hover:text-gold transition-colors"
                  >
                    {showAll ? 'Show recent' : `Show all ${ledger.length} entries`}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

function CoinEntryForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [form, setForm] = useState({ game_date: '', description: '', cp: 0, sp: 0, ep: 0, gp: 0, pp: 0, direction: 'in' as 'in' | 'out', notes: '' })
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api.post('/coins', form)
      toast.success('Coin entry added')
      onDone()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to add entry')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-4 mb-6 space-y-3">
      <h4 className="font-heading font-semibold text-parchment">New Coin Entry</h4>
      <div className="grid grid-cols-5 gap-2">
        {(['pp', 'gp', 'ep', 'sp', 'cp'] as const).map((d) => (
          <div key={d}>
            <label className="block text-xs font-heading font-semibold text-parchment-dim mb-1 uppercase">{d}</label>
            <input type="number" min={0} className="input-themed text-center" value={form[d] || ''} onChange={(e) => setForm({ ...form, [d]: Number(e.target.value) || 0 })} />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-heading font-semibold text-parchment-dim mb-1">Direction</label>
          <select className="input-themed" value={form.direction} onChange={(e) => setForm({ ...form, direction: e.target.value as 'in' | 'out' })}>
            <option value="in">In (earned)</option>
            <option value="out">Out (spent)</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-heading font-semibold text-parchment-dim mb-1">Game Date</label>
          <input className="input-themed" value={form.game_date} onChange={(e) => setForm({ ...form, game_date: e.target.value })} placeholder="M/D" />
        </div>
        <div>
          <label className="block text-sm font-heading font-semibold text-parchment-dim mb-1">Description</label>
          <input className="input-themed" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={submitting} className="px-4 py-2 bg-gold text-base font-heading font-semibold rounded-lg hover:bg-gold-bright transition-colors text-sm disabled:opacity-50">
          {submitting ? 'Adding...' : 'Add Entry'}
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2 text-parchment-dim bg-surface border border-border rounded-lg hover:bg-card-hover transition-colors text-sm">Cancel</button>
      </div>
    </form>
  )
}

function CoinConvertForm({ onDone }: { onDone: () => void }) {
  const [fromDenom, setFromDenom] = useState<string>('gp')
  const [toDenom, setToDenom] = useState<string>('sp')
  const [amount, setAmount] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  const convertedAmount = amount > 0 ? Math.floor((amount * (DENOM_TO_CP[fromDenom] ?? 1)) / (DENOM_TO_CP[toDenom] ?? 1)) : 0

  const handleConvert = async () => {
    if (amount <= 0 || fromDenom === toDenom) return
    setSubmitting(true)
    try {
      await api.post('/coins/convert', {
        from_denom: fromDenom, to_denom: toDenom, amount, game_date: '',
      })
      toast.success(`Converted ${amount} ${fromDenom} → ${convertedAmount} ${toDenom}`)
      setAmount(0)
      onDone()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to convert')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-card border border-border rounded-xl p-4 mb-6 space-y-3">
      <h4 className="font-heading font-semibold text-parchment">Convert Coins</h4>
      <div className="flex items-end gap-3 flex-wrap">
        <div>
          <label className="block text-sm font-heading font-semibold text-parchment-dim mb-1">Amount</label>
          <input type="number" min={1} className="input-themed w-24" value={amount || ''} onChange={(e) => setAmount(Number(e.target.value) || 0)} />
        </div>
        <div>
          <label className="block text-sm font-heading font-semibold text-parchment-dim mb-1">From</label>
          <select className="input-themed" value={fromDenom} onChange={(e) => setFromDenom(e.target.value)}>
            {DENOM_ORDER.map((d) => <option key={d} value={d}>{d.toUpperCase()}</option>)}
          </select>
        </div>
        <span className="pb-2 text-parchment-muted font-bold">→</span>
        <div>
          <label className="block text-sm font-heading font-semibold text-parchment-dim mb-1">To</label>
          <select className="input-themed" value={toDenom} onChange={(e) => setToDenom(e.target.value)}>
            {DENOM_ORDER.map((d) => <option key={d} value={d}>{d.toUpperCase()}</option>)}
          </select>
        </div>
        {amount > 0 && fromDenom !== toDenom && (
          <span className="pb-2 text-sm text-gold font-medium">= {convertedAmount} {toDenom}</span>
        )}
        <button onClick={handleConvert} disabled={submitting || amount <= 0 || fromDenom === toDenom} className="px-4 py-2 bg-gold text-base font-heading font-semibold rounded-lg hover:bg-gold-bright transition-colors text-sm disabled:opacity-50">
          Convert
        </button>
      </div>
    </div>
  )
}

function LootSplitForm({ characters, balance, onDone, onCancel }: { characters: Character[]; balance: CoinBalance | null; onDone: () => void; onCancel: () => void }) {
  const [mode, setMode] = useState<'all' | 'custom'>('all')
  const [form, setForm] = useState({ game_date: '', description: '', cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 })
  const [partyReserveStr, setPartyReserveStr] = useState('')
  const partyReserveGP = Number(partyReserveStr) || 0
  const [selected, setSelected] = useState<Set<string>>(new Set(characters.map((c) => c.id)))
  const [submitting, setSubmitting] = useState(false)

  // Prune stale character IDs if characters list changes
  useEffect(() => {
    const validIds = new Set(characters.map((c) => c.id))
    setSelected((prev) => {
      const pruned = new Set([...prev].filter((id) => validIds.has(id)))
      return pruned.size === prev.size ? prev : pruned
    })
  }, [characters])

  // In "all" mode, convert everything to GP first
  const allTotalCP = balance ? balance.cp + balance.sp * 10 + balance.ep * 50 + balance.gp * 100 + balance.pp * 1000 : 0
  const allTotalGP = Math.floor(allTotalCP / 100)
  const allSplitGP = Math.max(0, allTotalGP - partyReserveGP)
  const allChangeCP = allTotalCP % 100

  // Effective amounts for preview
  const splitAmounts = mode === 'all'
    ? { cp: 0, sp: 0, ep: 0, gp: allSplitGP, pp: 0 }
    : form

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (selected.size === 0) { toast.error('Select at least one character'); return }
    if (mode === 'all') {
      if (allSplitGP === 0) { toast.error('Nothing to split'); return }
      setSubmitting(true)
      try {
        await api.post('/coins/split', {
          game_date: form.game_date, description: form.description,
          cp: balance!.cp, sp: balance!.sp, ep: balance!.ep, gp: balance!.gp, pp: balance!.pp,
          character_ids: [...selected],
          convert_to_gp: true,
          reserve_gp: partyReserveGP,
        })
        toast.success(`Loot split among ${selected.size} characters`)
        onDone()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Failed to split loot')
      } finally {
        setSubmitting(false)
      }
    } else {
      const { cp, sp, ep, gp, pp } = form
      if (cp === 0 && sp === 0 && ep === 0 && gp === 0 && pp === 0) { toast.error('Enter some coins to split'); return }
      setSubmitting(true)
      try {
        await api.post('/coins/split', {
          game_date: form.game_date, description: form.description,
          cp, sp, ep, gp, pp,
          character_ids: [...selected],
        })
        toast.success(`Loot split among ${selected.size} characters`)
        onDone()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Failed to split loot')
      } finally {
        setSubmitting(false)
      }
    }
  }

  const n = selected.size || 1
  const preview = {
    cp: Math.floor(splitAmounts.cp / n), sp: Math.floor(splitAmounts.sp / n),
    ep: Math.floor(splitAmounts.ep / n), gp: Math.floor(splitAmounts.gp / n),
    pp: Math.floor(splitAmounts.pp / n),
  }
  const hasRemainder = splitAmounts.cp % n !== 0 || splitAmounts.sp % n !== 0 || splitAmounts.ep % n !== 0 || splitAmounts.gp % n !== 0 || splitAmounts.pp % n !== 0

  return (
    <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-4 mb-6 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-heading font-semibold text-parchment">Split Loot</h4>
        <div className="flex rounded-lg border border-border overflow-hidden text-sm">
          <button type="button" onClick={() => setMode('all')} className={clsx('px-3 py-1 font-heading font-semibold transition-colors', mode === 'all' ? 'bg-gold text-base' : 'bg-surface text-parchment-muted hover:bg-card-hover')}>
            Split All
          </button>
          <button type="button" onClick={() => setMode('custom')} className={clsx('px-3 py-1 font-heading font-semibold transition-colors', mode === 'custom' ? 'bg-gold text-base' : 'bg-surface text-parchment-muted hover:bg-card-hover')}>
            Custom
          </button>
        </div>
      </div>

      {mode === 'all' && balance ? (
        <div className="space-y-3">
          <div className="px-3 py-2 bg-surface rounded-lg text-sm text-parchment-dim">
            <span className="font-heading font-semibold">Current balance:</span>{' '}
            {balance.pp > 0 && <span>{balance.pp} PP </span>}
            {balance.gp > 0 && <span>{balance.gp} GP </span>}
            {balance.ep > 0 && <span>{balance.ep} EP </span>}
            {balance.sp > 0 && <span>{balance.sp} SP </span>}
            {balance.cp > 0 && <span>{balance.cp} CP </span>}
            <span className="ml-2 text-gold font-medium">→ {allTotalGP} GP</span>
            {allChangeCP > 0 && <span className="text-parchment-muted"> + {allChangeCP} CP change</span>}
          </div>
          <div className="flex items-end gap-3">
            <div>
              <label className="block text-sm font-heading font-semibold text-parchment-dim mb-1">Keep in party treasury (GP)</label>
              <input type="number" min={0} max={allTotalGP} className="input-themed w-32" value={partyReserveStr} onChange={(e) => setPartyReserveStr(e.target.value)} />
            </div>
            {partyReserveGP > 0 && (
              <span className="pb-2 text-sm text-parchment-dim">
                Splitting <span className="text-gold font-medium">{allSplitGP} GP</span> (of {allTotalGP} GP)
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-5 gap-2">
          {(['pp', 'gp', 'ep', 'sp', 'cp'] as const).map((denom) => (
            <div key={denom}>
              <label className="block text-xs font-heading font-semibold text-parchment-dim mb-1 uppercase">{denom}</label>
              <input type="number" min={0} className="input-themed text-center" value={form[denom] || ''} onChange={(e) => setForm({ ...form, [denom]: Number(e.target.value) || 0 })} />
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-heading font-semibold text-parchment-dim mb-1">Game Date</label>
          <input className="input-themed" value={form.game_date} onChange={(e) => setForm({ ...form, game_date: e.target.value })} placeholder="M/D or M/D/YY" />
        </div>
        <div>
          <label className="block text-sm font-heading font-semibold text-parchment-dim mb-1">Description</label>
          <input className="input-themed" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="e.g. Dragon hoard" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-heading font-semibold text-parchment-dim mb-2">Split among:</label>
        <div className="flex flex-wrap gap-2">
          {characters.map((c) => (
            <label key={c.id} className={clsx('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm cursor-pointer border transition-colors', selected.has(c.id) ? 'bg-gold/15 border-gold/40 text-gold' : 'bg-surface border-border text-parchment-muted')}>
              <input type="checkbox" className="hidden" checked={selected.has(c.id)} onChange={() => { const next = new Set(selected); if (next.has(c.id)) next.delete(c.id); else next.add(c.id); setSelected(next) }} />
              {c.name}
            </label>
          ))}
        </div>
      </div>

      {selected.size > 0 && (
        <div className="px-3 py-2 bg-surface rounded-lg text-sm text-parchment-dim">
          <span className="font-heading font-semibold">Per share ({selected.size} ways):</span>{' '}
          {preview.pp > 0 && <span>{preview.pp} PP </span>}
          {preview.gp > 0 && <span>{preview.gp} GP </span>}
          {preview.ep > 0 && <span>{preview.ep} EP </span>}
          {preview.sp > 0 && <span>{preview.sp} SP </span>}
          {preview.cp > 0 && <span>{preview.cp} CP </span>}
          {hasRemainder && <span className="text-amber">(remainder to party treasure)</span>}
        </div>
      )}

      <div className="flex gap-2">
        <button type="submit" disabled={submitting} className="px-4 py-2 bg-gold text-base font-heading font-semibold rounded-lg hover:bg-gold-bright transition-colors text-sm disabled:opacity-50">
          {submitting ? 'Splitting...' : 'Split'}
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2 text-parchment-dim bg-surface border border-border rounded-lg hover:bg-card-hover transition-colors text-sm">Cancel</button>
      </div>
    </form>
  )
}
