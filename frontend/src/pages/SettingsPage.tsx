import { useEffect, useState } from 'react'
import { useLabelStore } from '../stores/useLabelStore'
import { useSettingsStore } from '../stores/useSettingsStore'
import { Pencil, Trash2 } from 'lucide-react'
import { confirm } from '../stores/useConfirmStore'
import { toast } from '../stores/useToastStore'
import { DEFAULT_LABEL_COLOR, hexWithAlpha } from '../constants'
import type { Label } from '../types'

function LabelForm({
  label,
  onSave,
  onCancel,
}: {
  label: Partial<Label> | null
  onSave: (data: Partial<Label>) => void
  onCancel: () => void
}) {
  const [form, setForm] = useState<Partial<Label>>(
    label ?? { name: '', color: DEFAULT_LABEL_COLOR }
  )

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSave(form) }}
      className="flex items-end gap-3"
    >
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
        <label className="block text-sm font-heading font-semibold text-parchment-dim mb-1">Color</label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={form.color ?? DEFAULT_LABEL_COLOR}
            onChange={(e) => setForm({ ...form, color: e.target.value })}
            className="w-10 h-10 rounded border border-border cursor-pointer bg-transparent"
          />
          <input
            className="input-themed !w-24"
            value={form.color ?? ''}
            onChange={(e) => setForm({ ...form, color: e.target.value })}
            placeholder="#hex"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <button type="submit" className="px-4 py-2 bg-gold text-base font-heading font-semibold rounded-lg hover:bg-gold-bright transition-colors text-sm">
          {label?.id ? 'Update' : 'Add'}
        </button>
        {label?.id && (
          <button type="button" onClick={onCancel} className="px-4 py-2 bg-surface text-parchment-dim border border-border rounded-lg hover:bg-card-hover transition-colors text-sm">
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}

export function SettingsPage() {
  const { labels, loading, fetchLabels, createLabel, updateLabel, deleteLabel } = useLabelStore()
  const { settings, fetchSettings, updateSetting } = useSettingsStore()
  const [editLabel, setEditLabel] = useState<Label | null>(null)
  const [inviteCode, setInviteCode] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchLabels(); fetchSettings() }, [fetchLabels, fetchSettings])
  useEffect(() => { setInviteCode(settings.invite_code ?? '') }, [settings.invite_code])

  const handleSave = async (data: Partial<Label>) => {
    try {
      if (editLabel) {
        await updateLabel(editLabel.id, data)
        setEditLabel(null)
        toast.success('Label updated')
      } else {
        await createLabel(data)
        toast.success('Label created')
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save label')
    }
  }

  const handleDelete = async (label: Label) => {
    if (!(await confirm(`Delete label "${label.name}"? It will be removed from all items.`))) return
    try {
      await deleteLabel(label.id)
      toast.success('Label deleted')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete label')
    }
  }

  const handleSaveInviteCode = async () => {
    if (!inviteCode.trim()) return
    setSaving(true)
    try {
      await updateSetting('invite_code', inviteCode.trim())
      toast.success('Invite code updated')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update invite code')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <h2 className="font-heading text-3xl font-bold text-parchment mb-6">Settings</h2>

      <div className="bg-card border border-border rounded-xl p-6 space-y-4 max-w-xl mb-6">
        <div>
          <h3 className="font-heading text-xl font-semibold text-parchment mb-2">Invite Code</h3>
          <p className="text-sm text-parchment-muted mb-4">
            The invite code required for new users to log in.
          </p>
        </div>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <input
              className="input-themed w-full"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="Enter invite code"
            />
          </div>
          <button
            onClick={handleSaveInviteCode}
            disabled={saving || !inviteCode.trim()}
            className="px-4 py-2 bg-gold text-base font-heading font-semibold rounded-lg hover:bg-gold-bright transition-colors text-sm disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 space-y-6 max-w-xl">
        <div>
          <h3 className="font-heading text-xl font-semibold text-parchment mb-4">Item Labels</h3>
          <p className="text-sm text-parchment-muted mb-4">
            Labels are color-coded tags that can be assigned to items. Each item can have multiple labels.
          </p>
        </div>

        <LabelForm
          key={editLabel?.id ?? 'new'}
          label={editLabel}
          onSave={handleSave}
          onCancel={() => setEditLabel(null)}
        />

        <div className="border-t border-border pt-4">
          {loading ? (
            <p className="text-sm text-parchment-muted">Loading...</p>
          ) : labels.length === 0 ? (
            <p className="text-sm text-parchment-muted">No labels yet</p>
          ) : (
            <div className="space-y-1">
              {labels.map((label) => (
                <div
                  key={label.id}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-surface transition-colors group"
                >
                  <span
                    className="w-4 h-4 rounded-full shrink-0 border border-border"
                    style={{ backgroundColor: label.color }}
                  />
                  <span
                    className="px-2.5 py-0.5 rounded text-xs font-medium"
                    style={{ backgroundColor: hexWithAlpha(label.color, '25'), color: label.color }}
                  >
                    {label.name}
                  </span>
                  <span className="text-xs text-parchment-muted ml-1">{label.id}</span>
                  <div className="ml-auto flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setEditLabel(label)}
                      className="p-1 text-parchment-muted hover:text-sky transition-colors"
                      title="Edit"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(label)}
                      className="p-1 text-parchment-muted hover:text-wine transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
