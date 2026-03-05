import { useEffect, useState } from 'react'
import { useInventoryStore } from '../stores/useInventoryStore'
import { Plus, Trash2, Pencil } from 'lucide-react'
import { confirm } from '../stores/useConfirmStore'
import { toast } from '../stores/useToastStore'
import type { Character } from '../types'

export function CharactersPage() {
  const { characters, fetchCharacters, createCharacter, updateCharacter, deleteCharacter } = useInventoryStore()
  const [showForm, setShowForm] = useState(false)
  const [editChar, setEditChar] = useState<Character | null>(null)
  const [form, setForm] = useState<Partial<Character>>({ name: '', player_name: '', class: '', level: 1, race: '', ac: 10, hp_max: 0 })

  useEffect(() => { fetchCharacters() }, [fetchCharacters])

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
        <h2 className="text-2xl font-bold text-gray-900">Characters</h2>
        <button
          onClick={() => { setEditChar(null); setForm({ name: '', player_name: '', class: '', level: 1, race: '', ac: 10, hp_max: 0 }); setShowForm(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
        >
          <Plus className="w-4 h-4" /> Add Character
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSave} className="bg-white rounded-xl shadow-sm border p-4 mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Player</label>
            <input
              className="w-full px-3 py-2 border rounded-lg"
              value={form.player_name ?? ''}
              onChange={(e) => setForm({ ...form, player_name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Race</label>
            <input
              className="w-full px-3 py-2 border rounded-lg"
              value={form.race ?? ''}
              onChange={(e) => setForm({ ...form, race: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
            <input
              className="w-full px-3 py-2 border rounded-lg"
              value={form.class ?? ''}
              onChange={(e) => setForm({ ...form, class: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Level</label>
            <input type="number" className="w-full px-3 py-2 border rounded-lg"
              value={form.level ?? 1}
              onChange={(e) => setForm({ ...form, level: Number(e.target.value) })} min={1} max={20}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">AC</label>
            <input type="number" className="w-full px-3 py-2 border rounded-lg"
              value={form.ac ?? 10}
              onChange={(e) => setForm({ ...form, ac: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">HP Max</label>
            <input type="number" className="w-full px-3 py-2 border rounded-lg"
              value={form.hp_max ?? 0}
              onChange={(e) => setForm({ ...form, hp_max: Number(e.target.value) })}
            />
          </div>
          <div className="flex items-end gap-2">
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              {editChar ? 'Update' : 'Add'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-100 rounded-lg">Cancel</button>
          </div>
        </form>
      )}

      {characters.length === 0 ? (
        <div className="text-center text-gray-500 py-8">No characters yet</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {characters.map((c) => (
            <div key={c.id} className="bg-white rounded-xl shadow-sm border p-5">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-bold">{c.name}</h3>
                <div className="flex gap-1">
                  <button
                    onClick={() => { setEditChar(c); setForm(c); setShowForm(true) }}
                    className="p-1 text-gray-400 hover:text-blue-600"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(c.id)} className="p-1 text-gray-400 hover:text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <p className="text-sm text-gray-500 mb-3">
                Level {c.level} {c.race} {c.class}
                {c.player_name && <span className="ml-2">({c.player_name})</span>}
              </p>
              <div className="flex gap-4 text-sm">
                <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded">AC {c.ac}</span>
                <span className="px-2 py-1 bg-red-50 text-red-700 rounded">HP {c.hp_max}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
