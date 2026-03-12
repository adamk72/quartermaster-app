import { create } from 'zustand'
import { api } from '../api/client'
import { toast } from './useToastStore'
import type { Critter, SummonRequest } from '../types'

interface CritterState {
  critters: Critter[]
  loading: boolean
  error: string | null

  fetchCritters: () => Promise<void>
  summonCritter: (req: SummonRequest) => Promise<Critter>
  updateCritter: (id: number, critter: Partial<Critter>) => Promise<Critter>
  deleteCritter: (id: number) => Promise<void>
  dismissAll: () => Promise<void>
}

export const useCritterStore = create<CritterState>((set) => ({
  critters: [],
  loading: false,
  error: null,

  fetchCritters: async () => {
    set({ loading: true, error: null })
    try {
      const critters = await api.get<Critter[]>('/critters')
      set({ critters, loading: false })
    } catch (err) {
      const msg = 'Failed to fetch critters'
      set({ error: msg, loading: false })
      toast.error(msg)
    }
  },

  summonCritter: async (req) => {
    const critter = await api.post<Critter>('/critters', req)
    set((state) => ({ critters: [...state.critters, critter] }))
    return critter
  },

  updateCritter: async (id, critter) => {
    const updated = await api.put<Critter>(`/critters/${id}`, critter)
    set((state) => ({
      critters: state.critters.map((c) => (c.id === id ? updated : c)),
    }))
    return updated
  },

  deleteCritter: async (id) => {
    await api.del(`/critters/${id}`)
    set((state) => ({
      critters: state.critters.filter((c) => c.id !== id),
    }))
  },

  dismissAll: async () => {
    await api.post('/critters/dismiss-all', {})
    set({ critters: [] })
  },
}))
