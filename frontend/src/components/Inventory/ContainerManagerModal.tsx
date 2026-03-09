import { useState } from 'react'
import { CONTAINER_TYPES } from '../../constants'
import { Pencil, Trash2 } from 'lucide-react'
import { confirm } from '../../stores/useConfirmStore'
import type { Container, Mount } from '../../types'

export function ContainerManagerModal({
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
