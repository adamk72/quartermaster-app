import { create } from 'zustand'
import { api } from '../api/client'
import { toast } from './useToastStore'
import type { Label } from '../types'

interface LabelState {
  labels: Label[]
  loading: boolean
  fetchLabels: () => Promise<void>
  createLabel: (label: Partial<Label>) => Promise<Label>
  updateLabel: (id: string, label: Partial<Label>) => Promise<Label>
  deleteLabel: (id: string) => Promise<void>
}

export const useLabelStore = create<LabelState>((set, get) => ({
  labels: [],
  loading: false,

  fetchLabels: async () => {
    set({ loading: true })
    try {
      const labels = await api.get<Label[]>('/labels')
      set({ labels, loading: false })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to fetch labels')
      set({ loading: false })
    }
  },

  createLabel: async (label) => {
    const created = await api.post<Label>('/labels', label)
    const { labels } = get()
    set({ labels: [...labels, created] })
    return created
  },

  updateLabel: async (id, label) => {
    const updated = await api.put<Label>(`/labels/${id}`, label)
    const { labels } = get()
    set({ labels: labels.map((l) => (l.id === id ? updated : l)) })
    return updated
  },

  deleteLabel: async (id) => {
    await api.del(`/labels/${id}`)
    const { labels } = get()
    set({ labels: labels.filter((l) => l.id !== id) })
  },
}))
