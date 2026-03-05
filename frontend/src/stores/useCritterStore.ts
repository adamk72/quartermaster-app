import { create } from 'zustand'
import { api } from '../api/client'
import { toast } from './useToastStore'
import type { Critter } from '../types'

interface CritterState {
  critters: Critter[]
  loading: boolean
  error: string | null

  fetchCritters: (activeOnly?: boolean) => Promise<void>
  createCritter: (critter: Partial<Critter>) => Promise<Critter>
  updateCritter: (id: number, critter: Partial<Critter>) => Promise<Critter>
  deleteCritter: (id: number) => Promise<void>
  dismissAll: () => Promise<void>
}

export const useCritterStore = create<CritterState>((set, get) => ({
  critters: [],
  loading: false,
  error: null,

  fetchCritters: async (activeOnly) => {
    set({ loading: true, error: null })
    try {
      const qs = activeOnly ? '?active=true' : ''
      const critters = await api.get<Critter[]>(`/critters${qs}`)
      set({ critters, loading: false })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to fetch critters'
      set({ error: msg, loading: false })
      toast.error(msg)
    }
  },

  createCritter: async (critter) => {
    const created = await api.post<Critter>('/critters', critter)
    const { critters } = get()
    set({ critters: [...critters, created] })
    return created
  },

  updateCritter: async (id, critter) => {
    const updated = await api.put<Critter>(`/critters/${id}`, critter)
    const { critters } = get()
    set({ critters: critters.map((c) => (c.id === id ? updated : c)) })
    return updated
  },

  deleteCritter: async (id) => {
    await api.del(`/critters/${id}`)
    const { critters } = get()
    set({ critters: critters.filter((c) => c.id !== id) })
  },

  dismissAll: async () => {
    await api.post('/critters/dismiss-all')
    const { critters } = get()
    set({ critters: critters.map((c) => ({ ...c, active: false })) })
  },
}))
