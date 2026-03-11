import { useEffect, useMemo, useState } from 'react'
import { useInventoryStore } from '../stores/useInventoryStore'
import { Plus, Trash2, Pencil, Sparkles } from 'lucide-react'
import { getCharacterIcon } from '../constants/characterIcons'
import { confirm } from '../stores/useConfirmStore'
import { toast } from '../stores/useToastStore'
import { MAX_ATTUNEMENT_SLOTS } from '../constants'
import type { Character } from '../types'
import { IconPicker } from '../components/IconPicker'

export function CharactersPage() {
  const { characters, items, fetchCharacters, fetchItems, createCharacter, updateCharacter, deleteCharacter } = useInventoryStore()
  const [showForm, setShowForm] = useState(false)
  const [editChar, setEditChar] = useState<Character | null>(null)
  const [form, setForm] = useState<Partial<Character>>({ name: '', player_name: '', class: '', level: 1, race: '', ac: 10, hp_max: 0 })
  const [iconPickerCharId, setIconPickerCharId] = useState<string | null>(null)

  const usedIcons = useMemo(
    () => Object.fromEntries(characters.filter(c => c.icon).map(c => [c.icon, c.id])),
    [characters]
  )

  useEffect(() => { fetchCharacters(); fetchItems() }, [fetchCharacters, fetchItems])

  const attunementByCharacter = useMemo(() => {
    const map = new Map<string, typeof items>()
    for (const item of items) {
      if (item.attuned_to) {
        const existing = map.get(item.attuned_to) ?? []
        existing.push(item)
        map.set(item.attuned_to, existing)
      }
    }
    return map
  }, [items])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editChar) {
        await updateCharacter(editChar.id, form)
      } else {
        await createCharacter(form)
      }
      setShowForm(false)
      setEditChar(null)
      setForm({ name: '', player_name: '', class: '', level: 1, race: '', ac: 10, hp_max: 0 })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save character')
    }
  }

  const handleDelete = async (id: string) => {
    if (!(await confirm('Delete this character?'))) return
    try {
      await deleteCharacter(id)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete character')
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-heading text-3xl font-bold text-parchment">Characters</h2>
        <button
          onClick={() => { setEditChar(null); setForm({ name: '', player_name: '', class: '', level: 1, race: '', ac: 10, hp_max: 0 }); setShowForm(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-gold text-base font-heading font-semibold rounded-lg hover:bg-gold-bright text-sm transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Character
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSave} className="tt-card mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-heading font-semibold text-parchment-dim mb-1">Name</label>
            <input
              className="input-themed"
              value={form.name ?? ''}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-heading font-semibold text-parchment-dim mb-1">Player</label>
            <input
              className="input-themed"
              value={form.player_name ?? ''}
              onChange={(e) => setForm({ ...form, player_name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-heading font-semibold text-parchment-dim mb-1">Race</label>
            <input
              className="input-themed"
              value={form.race ?? ''}
              onChange={(e) => setForm({ ...form, race: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-heading font-semibold text-parchment-dim mb-1">Class</label>
            <input
              className="input-themed"
              value={form.class ?? ''}
              onChange={(e) => setForm({ ...form, class: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-heading font-semibold text-parchment-dim mb-1">Level</label>
            <input type="number" className="input-themed"
              value={form.level ?? 1}
              onChange={(e) => setForm({ ...form, level: Number(e.target.value) })} min={1} max={20}
            />
          </div>
          <div>
            <label className="block text-sm font-heading font-semibold text-parchment-dim mb-1">AC</label>
            <input type="number" className="input-themed"
              value={form.ac ?? 10}
              onChange={(e) => setForm({ ...form, ac: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className="block text-sm font-heading font-semibold text-parchment-dim mb-1">HP Max</label>
            <input type="number" className="input-themed"
              value={form.hp_max ?? 0}
              onChange={(e) => setForm({ ...form, hp_max: Number(e.target.value) })}
            />
          </div>
          <div className="flex items-end gap-2">
            <button type="submit" className="px-4 py-2 bg-gold text-base font-heading font-semibold rounded-lg hover:bg-gold-bright transition-colors">
              {editChar ? 'Update' : 'Add'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-surface text-parchment-dim border border-border rounded-lg hover:bg-card-hover transition-colors">Cancel</button>
          </div>
        </form>
      )}

      {characters.length === 0 ? (
        <div className="text-center text-parchment-muted py-8">No characters yet</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {characters.map((c) => (
            <div key={c.id} className="tt-card hover:border-border-light transition-colors">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <button
                      onClick={() => setIconPickerCharId(iconPickerCharId === c.id ? null : c.id)}
                      className="p-0.5 rounded hover:bg-card-hover transition-colors"
                      title="Change icon"
                    >
                      {(() => { const Icon = getCharacterIcon(c.icon); return <Icon className="w-5 h-5 text-gold" /> })()}
                    </button>
                    {iconPickerCharId === c.id && (
                      <IconPicker
                        characterId={c.id}
                        currentIcon={c.icon}
                        usedIcons={usedIcons}
                        onSelect={async (iconName) => {
                          try {
                            await updateCharacter(c.id, { ...c, icon: iconName })
                            setIconPickerCharId(null)
                          } catch (e) {
                            toast.error(e instanceof Error ? e.message : 'Failed to update icon')
                          }
                        }}
                        onClose={() => setIconPickerCharId(null)}
                      />
                    )}
                  </div>
                  <h3 className="font-heading text-lg font-bold text-parchment">{c.name}</h3>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => { setEditChar(c); setForm(c); setShowForm(true) }}
                    className="p-1 text-parchment-muted hover:text-sky transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(c.id)} className="p-1 text-parchment-muted hover:text-wine transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <p className="text-sm text-parchment-dim mb-3">
                Level {c.level} {c.race} {c.class}
                {c.player_name && <span className="ml-2 text-parchment-muted">({c.player_name})</span>}
              </p>
              <div className="flex gap-3 text-sm">
                <span className="px-2.5 py-1 bg-sky/10 text-sky rounded font-medium">AC {c.ac}</span>
                <span className="px-2.5 py-1 bg-wine/10 text-wine rounded font-medium">HP {c.hp_max}</span>
              </div>
              {/* Attunement slots */}
              {(() => {
                const attuned = attunementByCharacter.get(c.id) ?? []
                return (
                  <div className="mt-3 pt-3 border-t border-border">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-arcane" />
                      <span className="text-xs font-heading font-semibold text-parchment-dim">
                        Attunement ({attuned.length}/{MAX_ATTUNEMENT_SLOTS})
                      </span>
                    </div>
                    {attuned.length > 0 ? (
                      <ul className="space-y-0.5">
                        {attuned.map((item) => (
                          <li key={item.id} className="text-xs text-arcane">{item.name}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-parchment-muted">No attuned items</p>
                    )}
                  </div>
                )
              })()}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
