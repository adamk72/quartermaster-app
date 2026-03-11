import { useEffect, useState } from 'react'
import { useLabelStore } from '../stores/useLabelStore'
import { useSettingsStore } from '../stores/useSettingsStore'
import { Pencil, Trash2 } from 'lucide-react'
import { confirm } from '../stores/useConfirmStore'
import { toast } from '../stores/useToastStore'
import { DEFAULT_LABEL_COLOR, hexWithAlpha } from '../constants'
import type { Label } from '../types'

function randomHexColor(): string {
  const h = Math.random() * 360
  const s = 0.5, l = 0.45
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs((h / 60) % 2 - 1))
  const m = l - c / 2
  let r = 0, g = 0, b = 0
  if (h < 60) { r = c; g = x }
  else if (h < 120) { r = x; g = c }
  else if (h < 180) { g = c; b = x }
  else if (h < 240) { g = x; b = c }
  else if (h < 300) { r = x; b = c }
  else { r = c; b = x }
  const toHex = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

function LabelForm({
  label,
  onSave,
  onCancel,
}: {
  label: Partial<Label> | null
  onSave: (data: Partial<Label>) => void
  onCancel: () => void
}) {
  const [form, setForm] = useState<Partial<Label>>(() => {
    if (label) return label
    const color = randomHexColor()
    return { name: '', color, text_color: color }
  })

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSave(form) }}
      className="space-y-3"
    >
      <div className="flex items-end gap-3 flex-wrap">
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
          <label className="block text-sm font-heading font-semibold text-parchment-dim mb-1">Background</label>
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
        <div>
          <label className="block text-sm font-heading font-semibold text-parchment-dim mb-1">Text</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={form.text_color ?? '#ffffff'}
              onChange={(e) => setForm({ ...form, text_color: e.target.value })}
              className="w-10 h-10 rounded border border-border cursor-pointer bg-transparent"
            />
            <input
              className="input-themed !w-24"
              value={form.text_color ?? ''}
              onChange={(e) => setForm({ ...form, text_color: e.target.value })}
              placeholder="#hex"
            />
          </div>
        </div>
        <button type="submit" className="px-4 py-2 bg-gold text-base font-heading font-semibold rounded-lg hover:bg-gold-bright transition-colors text-sm">
          {label?.id ? 'Update' : 'Add'}
        </button>
        <span
          className="inline-block px-2.5 py-1 rounded text-xs font-medium self-center"
          style={{ backgroundColor: hexWithAlpha(form.color ?? DEFAULT_LABEL_COLOR, '40'), color: form.text_color ?? '#ffffff' }}
        >
          {form.name || 'Label'}
        </span>
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
  const [formKey, setFormKey] = useState(0)
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
        setFormKey((k) => k + 1)
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
          key={editLabel?.id ?? `new-${formKey}`}
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
                    style={{ backgroundColor: hexWithAlpha(label.color, '40'), color: label.text_color || '#ffffff' }}
                  >
                    {label.name}
                  </span>
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
