import { create } from 'zustand'
import { api } from '../api/client'
import type { Item, ItemSummary, Container, Character } from '../types'

interface InventoryState {
  items: Item[]
  summary: ItemSummary | null
  containers: Container[]
  characters: Character[]
  loading: boolean
  error: string | null

  fetchItems: (params?: Record<string, string>) => Promise<void>
  fetchSummary: () => Promise<void>
  fetchContainers: () => Promise<void>
  fetchCharacters: () => Promise<void>
  createItem: (item: Partial<Item>) => Promise<Item>
  updateItem: (id: number, item: Partial<Item>) => Promise<Item>
  deleteItem: (id: number) => Promise<void>
  sellItem: (id: number) => Promise<void>
  identifyItem: (id: number, name?: string) => Promise<Item>
  createContainer: (container: Partial<Container>) => Promise<Container>
  updateContainer: (id: string, container: Partial<Container>) => Promise<Container>
  deleteContainer: (id: string) => Promise<void>
  createCharacter: (char: Partial<Character>) => Promise<Character>
  updateCharacter: (id: string, char: Partial<Character>) => Promise<Character>
  deleteCharacter: (id: string) => Promise<void>
}

export const useInventoryStore = create<InventoryState>((set, get) => ({
  items: [],
  summary: null,
  containers: [],
  characters: [],
  loading: false,
  error: null,

  fetchItems: async (params) => {
    set({ loading: true, error: null })
    try {
      const qs = params ? '?' + new URLSearchParams(params).toString() : ''
      const items = await api.get<Item[]>(`/items${qs}`)
      set({ items, loading: false })
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to fetch items', loading: false })
    }
  },

  fetchSummary: async () => {
    try {
      const summary = await api.get<ItemSummary>('/items/summary')
      set({ summary })
    } catch {
      // non-critical
    }
  },

  fetchContainers: async () => {
    try {
      const containers = await api.get<Container[]>('/containers')
      set({ containers })
    } catch {
      // non-critical
    }
  },

  fetchCharacters: async () => {
    try {
      const characters = await api.get<Character[]>('/characters')
      set({ characters })
    } catch {
      // non-critical
    }
  },

  createItem: async (item) => {
    const created = await api.post<Item>('/items', item)
    const { items } = get()
    set({ items: [created, ...items] })
    get().fetchSummary()
    return created
  },

  updateItem: async (id, item) => {
    const updated = await api.put<Item>(`/items/${id}`, item)
    const { items } = get()
    set({ items: items.map((i) => (i.id === id ? updated : i)) })
    get().fetchSummary()
    return updated
  },

  deleteItem: async (id) => {
    await api.del(`/items/${id}`)
    const { items } = get()
    set({ items: items.filter((i) => i.id !== id) })
    get().fetchSummary()
  },

  sellItem: async (id) => {
    await api.post(`/items/${id}/sell`)
    const { items } = get()
    set({ items: items.map((i) => (i.id === id ? { ...i, sold: true } : i)) })
    get().fetchSummary()
  },

  identifyItem: async (id, name) => {
    const updated = await api.post<Item>(`/items/${id}/identify`, { name: name ?? '' })
    const { items } = get()
    set({ items: items.map((i) => (i.id === id ? updated : i)) })
    return updated
  },

  createContainer: async (container) => {
    const created = await api.post<Container>('/containers', container)
    const { containers } = get()
    set({ containers: [...containers, created] })
    return created
  },

  updateContainer: async (id, container) => {
    const updated = await api.put<Container>(`/containers/${id}`, container)
    const { containers } = get()
    set({ containers: containers.map((c) => (c.id === id ? updated : c)) })
    return updated
  },

  deleteContainer: async (id) => {
    await api.del(`/containers/${id}`)
    const { containers } = get()
    set({ containers: containers.filter((c) => c.id !== id) })
  },

  createCharacter: async (char) => {
    const created = await api.post<Character>('/characters', char)
    const { characters } = get()
    set({ characters: [...characters, created] })
    return created
  },

  updateCharacter: async (id, char) => {
    const updated = await api.put<Character>(`/characters/${id}`, char)
    const { characters } = get()
    set({ characters: characters.map((c) => (c.id === id ? updated : c)) })
    return updated
  },

  deleteCharacter: async (id) => {
    await api.del(`/characters/${id}`)
    const { characters } = get()
    set({ characters: characters.filter((c) => c.id !== id) })
  },
}))
