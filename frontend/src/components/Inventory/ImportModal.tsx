import { useState } from 'react'
import { Upload, AlertCircle, CheckCircle2, Copy, ChevronDown, ChevronRight } from 'lucide-react'
import { useInventoryStore } from '../../stores/useInventoryStore'
import { useLabelStore } from '../../stores/useLabelStore'
import { toast } from '../../stores/useToastStore'
import { todayGameDate } from '../../constants'
import type { Container } from '../../types'

interface ImportModalProps {
  onClose: () => void
  containers: Container[]
}

interface ImportItem {
  name: string
  quantity: number
  unit_value_gp: number | null
  game_date: string
  container_id: string | null
  label_ids: string[]
  notes: string
}

function buildPrompt(containers: Container[], labelList: { id: string; name: string }[]): string {
  const containerLines = containers.map((c) => `  - "${c.id}" → ${c.name} (${c.type})`).join('\n')
  const labelLines = labelList.length > 0
    ? labelList.map((l) => `  - "${l.id}" → ${l.name}`).join('\n')
    : '  (none defined yet)'

  return `You are a D&D inventory parser. Convert the loot/treasure text below into a JSON array for import into our campaign tracker.

## Output Format

Return ONLY a JSON array (no markdown, no explanation). Each item is an object with these fields:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | yes | Item name, title case |
| quantity | number | yes | Default 1 if not specified |
| unit_value_gp | number | no | Per-unit value in gold pieces. Convert: 1pp=10gp, 1ep=0.5gp, 1sp=0.1gp, 1cp=0.01gp |
| container_id | string | no | Must be one of the valid IDs below, or omit |
| label_ids | string[] | no | Array of label IDs from the list below. Assign any that seem to fit the item. |
| game_date | string | no | Format "M/D" (e.g. "3/11") if a date is mentioned |
| notes | string | no | Anything that doesn't fit the other fields (description, magic properties, etc.) |

## Valid Containers

${containerLines}

If the text mentions who is carrying something, match to the appropriate container. If unclear, omit container_id.

## Available Labels

${labelLines}

Assign labels that fit each item. For example, gemstones get the gems label, magical items get the magic label, etc. An item can have multiple labels. Use your best judgment — it's easy to fix later. If no label fits, use an empty array.

## Parsing Rules

- Combine identical items into one entry with quantity > 1
- "TBI" or "to be identified" → add "TBI" to notes
- Spell scrolls → name as "Scroll of [Spell Name]"
- Potions → name as "Potion of [Effect]"
- If a total value is given for a group (e.g. "12 jaspers worth 120gp"), calculate unit_value_gp (120/12 = 10)
- Coins (gp, sp, cp, pp, ep) should NOT be included — they are tracked separately

## Loot Text to Parse

[PASTE YOUR LOOT TEXT HERE]`
}

export function ImportModal({ onClose, containers }: ImportModalProps) {
  const { importItems } = useInventoryStore()
  const { labels } = useLabelStore()
  const [jsonText, setJsonText] = useState('')
  const [parsed, setParsed] = useState<ImportItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [showPrompt, setShowPrompt] = useState(false)
  const [importDate, setImportDate] = useState(todayGameDate)

  function handleParse() {
    setError(null)
    setParsed(null)
    try {
      const data = JSON.parse(jsonText)
      if (!Array.isArray(data)) {
        setError('Expected a JSON array')
        return
      }
      if (data.length === 0) {
        setError('Array is empty')
        return
      }

      // Validate each item
      const containerIds = new Set(containers.map((c) => c.id))
      const errors: string[] = []
      const items: ImportItem[] = data.map((raw: Record<string, unknown>, i: number) => {
        if (!raw.name || typeof raw.name !== 'string') {
          errors.push(`Item ${i + 1}: missing name`)
        }
        if (raw.container_id && !containerIds.has(raw.container_id as string)) {
          errors.push(`Item ${i + 1}: unknown container "${raw.container_id}"`)
        }
        return {
          name: (raw.name as string) || '',
          quantity: typeof raw.quantity === 'number' ? raw.quantity : 1,
          unit_value_gp: typeof raw.unit_value_gp === 'number' ? raw.unit_value_gp : null,
          game_date: (raw.game_date as string) || '',
          container_id: (raw.container_id as string) || null,
          label_ids: Array.isArray(raw.label_ids) ? (raw.label_ids as string[]) : [],
          notes: (raw.notes as string) || '',
        }
      })

      if (errors.length > 0) {
        setError(errors.join('\n'))
        return
      }

      setParsed(items)
    } catch {
      setError('Invalid JSON — check formatting and try again')
    }
  }

  async function handleImport() {
    if (!parsed) return
    setImporting(true)
    try {
      const dated = parsed.map((item) => ({ ...item, game_date: importDate || item.game_date }))
      const result = await importItems(dated)
      toast.success(`Imported ${result.count} items`)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  function getContainerName(id: string | null): string {
    if (!id) return '—'
    const c = containers.find((c) => c.id === id)
    return c ? c.name : id
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-surface border border-border rounded-xl w-full max-w-3xl max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-heading text-lg font-bold text-parchment">Import Items</h3>
          <button onClick={onClose} className="text-parchment-muted hover:text-parchment text-xl">&times;</button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto space-y-4">
          {!parsed ? (
            <>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setShowPrompt(!showPrompt)}
                  className="flex items-center gap-1.5 text-sm text-sky hover:text-sky-bright transition-colors"
                >
                  {showPrompt ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  AI Prompt Template
                </button>
                {showPrompt && (
                  <div className="space-y-2">
                    <p className="text-xs text-parchment-muted">
                      Copy this prompt into ChatGPT, Claude, or any AI. Replace the placeholder at the bottom with your loot text, then paste the AI's JSON output below.
                    </p>
                    <div className="relative">
                      <pre className="bg-card border border-border rounded-lg p-3 text-xs text-parchment-dim font-mono whitespace-pre-wrap max-h-48 overflow-y-auto">
                        {buildPrompt(containers, labels.map((l) => ({ id: l.id, name: l.name })))}
                      </pre>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(buildPrompt(containers, labels.map((l) => ({ id: l.id, name: l.name }))))
                          toast.success('Prompt copied to clipboard')
                        }}
                        className="absolute top-2 right-2 p-1.5 bg-surface border border-border rounded hover:bg-card-hover transition-colors"
                        title="Copy prompt"
                      >
                        <Copy className="w-3.5 h-3.5 text-parchment-muted" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <p className="text-sm text-parchment-dim">
                Paste the JSON array from the AI output below.
              </p>
              <textarea
                className="input-themed w-full h-48 font-mono text-xs"
                placeholder='[{"name": "Longsword", "quantity": 1, ...}]'
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
              />
              {error && (
                <div className="flex items-start gap-2 text-red-400 text-sm bg-red-400/10 rounded-lg p-3">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <pre className="whitespace-pre-wrap">{error}</pre>
                </div>
              )}
              <button
                onClick={handleParse}
                disabled={!jsonText.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-gold text-base font-heading font-semibold rounded-lg hover:bg-gold-bright text-sm transition-colors disabled:opacity-50"
              >
                Preview
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald text-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  {parsed.length} items ready to import
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-heading font-semibold text-parchment-dim">Game Date</label>
                  <input
                    className="input-themed text-sm w-24"
                    value={importDate}
                    onChange={(e) => setImportDate(e.target.value)}
                    placeholder="M/D"
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 text-red-400 text-sm bg-red-400/10 rounded-lg p-3">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="overflow-x-auto border border-border rounded-lg">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-card-hover text-parchment-dim">
                      <th className="text-left p-2">Name</th>
                      <th className="text-right p-2">Qty</th>
                      <th className="text-right p-2">Value (gp)</th>
                      <th className="text-left p-2">Container</th>
                      <th className="text-left p-2">Labels</th>
                      <th className="text-left p-2">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.map((item, i) => (
                      <tr key={i} className="border-t border-border">
                        <td className="p-2 text-parchment">{item.name}</td>
                        <td className="p-2 text-right text-parchment-dim">{item.quantity}</td>
                        <td className="p-2 text-right text-gold">{item.unit_value_gp ?? '—'}</td>
                        <td className="p-2 text-parchment-dim">{getContainerName(item.container_id)}</td>
                        <td className="p-2 text-parchment-dim text-xs">
                          {item.label_ids.length > 0
                            ? item.label_ids.map((lid) => {
                                const l = labels.find((lb) => lb.id === lid)
                                return l ? l.name : lid
                              }).join(', ')
                            : '—'}
                        </td>
                        <td className="p-2 text-parchment-dim truncate max-w-[150px]">{item.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => { setParsed(null); setError(null) }}
                  className="px-4 py-2 bg-surface text-parchment-dim border border-border font-heading font-semibold rounded-lg hover:bg-card-hover text-sm transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleImport}
                  disabled={importing}
                  className="flex items-center gap-2 px-4 py-2 bg-gold text-base font-heading font-semibold rounded-lg hover:bg-gold-bright text-sm transition-colors disabled:opacity-50"
                >
                  <Upload className="w-4 h-4" />
                  {importing ? 'Importing...' : `Import ${parsed.length} Items`}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
