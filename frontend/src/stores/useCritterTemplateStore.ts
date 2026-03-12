import { create } from 'zustand'
import { api } from '../api/client'
import { toast } from './useToastStore'
import type { CritterTemplate } from '../types'

interface CritterTemplateState {
  templates: CritterTemplate[]
  loading: boolean
  error: string | null

  fetchTemplates: () => Promise<void>
  createTemplate: (template: Partial<CritterTemplate>) => Promise<CritterTemplate>
  updateTemplate: (id: number, template: Partial<CritterTemplate>) => Promise<CritterTemplate>
  deleteTemplate: (id: number) => Promise<void>
}

export const useCritterTemplateStore = create<CritterTemplateState>((set) => ({
  templates: [],
  loading: false,
  error: null,

  fetchTemplates: async () => {
    set({ loading: true, error: null })
    try {
      const templates = await api.get<CritterTemplate[]>('/critter-templates')
      set({ templates, loading: false })
    } catch (err) {
      const msg = 'Failed to fetch critter templates'
      set({ error: msg, loading: false })
      toast.error(msg)
    }
  },

  createTemplate: async (template) => {
    const created = await api.post<CritterTemplate>('/critter-templates', template)
    set((state) => ({ templates: [...state.templates, created] }))
    return created
  },

  updateTemplate: async (id, template) => {
    const updated = await api.put<CritterTemplate>(`/critter-templates/${id}`, template)
    set((state) => ({
      templates: state.templates.map((t) => (t.id === id ? updated : t)),
    }))
    return updated
  },

  deleteTemplate: async (id) => {
    await api.del(`/critter-templates/${id}`)
    set((state) => ({
      templates: state.templates.filter((t) => t.id !== id),
    }))
  },
}))
