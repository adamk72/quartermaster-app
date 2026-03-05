import { create } from 'zustand'
import { api } from '../api/client'
import type { Critter } from '../types'

interface CritterState {
  critters: Critter[]
  loading: boolean

  fetchCritters: (activeOnly?: boolean) => Promise<void>
  createCritter: (critter: Partial<Critter>) => Promise<Critter>
  updateCritter: (id: number, critter: Partial<Critter>) => Promise<Critter>
  deleteCritter: (id: number) => Promise<void>
  dismissAll: () => Promise<void>
}

export const useCritterStore = create<CritterState>((set, get) => ({
  critters: [],
  loading: false,

  fetchCritters: async (activeOnly) => {
    set({ loading: true })
    const qs = activeOnly ? '?active=true' : ''
    const critters = await api.get<Critter[]>(`/critters${qs}`)
    set({ critters, loading: false })
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
