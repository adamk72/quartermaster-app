import { create } from 'zustand'
import { api, ApiError } from '../api/client'
import { toast } from './useToastStore'
import type { Item, ItemSummary, Container, Character, Mount } from '../types'

const CONFLICT_MSG = 'This record was modified by another user. The page has been refreshed with the latest data — please re-apply your changes.'

interface InventoryState {
  items: Item[]
  summary: ItemSummary | null
  containers: Container[]
  characters: Character[]
  mounts: Mount[]
  loading: boolean
  error: string | null

  fetchItems: (params?: Record<string, string>) => Promise<void>
  fetchSummary: () => Promise<void>
  fetchContainers: () => Promise<void>
  fetchCharacters: () => Promise<void>
  fetchMounts: () => Promise<void>
  createItem: (item: Partial<Item>) => Promise<Item>
  updateItem: (id: number, item: Partial<Item>) => Promise<Item>
  deleteItem: (id: number) => Promise<void>
  sellItem: (id: number, sellPriceGP?: number | null, quantity?: number) => Promise<void>
  unsellItem: (id: number) => Promise<void>
  reorderItems: (itemIds: number[]) => Promise<void>
  identifyItem: (id: number, name?: string, magic?: boolean) => Promise<Item>
  bulkSellItems: (itemIds: number[]) => Promise<void>
  bulkDeleteItems: (itemIds: number[]) => Promise<void>
  bulkMoveItems: (itemIds: number[], containerId: string) => Promise<void>
  createContainer: (container: Partial<Container>) => Promise<Container>
  updateContainer: (id: string, container: Partial<Container>) => Promise<Container>
  deleteContainer: (id: string) => Promise<void>
  createCharacter: (char: Partial<Character>) => Promise<Character>
  updateCharacter: (id: string, char: Partial<Character>) => Promise<Character>
  deleteCharacter: (id: string) => Promise<void>
  createMount: (mount: Partial<Mount>) => Promise<Mount>
  updateMount: (id: string, mount: Partial<Mount>) => Promise<Mount>
  deleteMount: (id: string) => Promise<void>
}

export const useInventoryStore = create<InventoryState>((set, get) => ({
  items: [],
  summary: null,
  containers: [],
  characters: [],
  mounts: [],
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
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to fetch summary')
    }
  },

  fetchContainers: async () => {
    try {
      const containers = await api.get<Container[]>('/containers')
      set({ containers })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to fetch containers')
    }
  },

  fetchCharacters: async () => {
    try {
      const characters = await api.get<Character[]>('/characters')
      set({ characters })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to fetch characters')
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
    try {
      const updated = await api.put<Item>(`/items/${id}`, item)
      const { items } = get()
      set({ items: items.map((i) => (i.id === id ? updated : i)) })
      get().fetchSummary()
      return updated
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        await get().fetchItems()
        toast.info(CONFLICT_MSG)
      }
      throw e
    }
  },

  deleteItem: async (id) => {
    await api.del(`/items/${id}`)
    const { items } = get()
    set({ items: items.filter((i) => i.id !== id) })
    get().fetchSummary()
  },

  sellItem: async (id, sellPriceGP, quantity) => {
    const body: Record<string, unknown> = {}
    if (sellPriceGP != null) body.sell_price_gp = sellPriceGP
    if (quantity != null) body.quantity = quantity
    await api.post(`/items/${id}/sell`, Object.keys(body).length > 0 ? body : undefined)
    // Refetch items to get accurate state (partial sells change quantity)
    get().fetchItems()
    get().fetchSummary()
  },

  unsellItem: async (id) => {
    await api.post(`/items/${id}/unsell`)
    const { items } = get()
    set({ items: items.map((i) => (i.id === id ? { ...i, sold: false } : i)) })
    get().fetchSummary()
  },

  reorderItems: async (itemIds) => {
    await api.post('/items/reorder', { item_ids: itemIds })
    const { items } = get()
    const orderMap = new Map(itemIds.map((id, i) => [id, i]))
    set({ items: items.map((item) => ({ ...item, sort_order: orderMap.get(item.id) ?? item.sort_order })) })
  },

  identifyItem: async (id, name, magic) => {
    const updated = await api.post<Item>(`/items/${id}/identify`, { name: name ?? '', magic: magic ?? true })
    const { items } = get()
    set({ items: items.map((i) => (i.id === id ? updated : i)) })
    return updated
  },

  bulkSellItems: async (itemIds) => {
    await api.post('/items/bulk-sell', { item_ids: itemIds })
    const { items } = get()
    const idSet = new Set(itemIds)
    set({ items: items.map((i) => idSet.has(i.id) ? { ...i, sold: true } : i) })
    get().fetchSummary()
  },

  bulkDeleteItems: async (itemIds) => {
    await api.post('/items/bulk-delete', { item_ids: itemIds })
    const { items } = get()
    const idSet = new Set(itemIds)
    set({ items: items.filter((i) => !idSet.has(i.id)) })
    get().fetchSummary()
  },

  bulkMoveItems: async (itemIds, containerId) => {
    await api.post('/items/bulk-move', { item_ids: itemIds, container_id: containerId })
    const { items } = get()
    const idSet = new Set(itemIds)
    set({ items: items.map((i) => idSet.has(i.id) ? { ...i, container_id: containerId || null, attuned_to: null } : i) })
  },

  createContainer: async (container) => {
    const created = await api.post<Container>('/containers', container)
    const { containers } = get()
    set({ containers: [...containers, created] })
    return created
  },

  updateContainer: async (id, container) => {
    try {
      const updated = await api.put<Container>(`/containers/${id}`, container)
      const { containers } = get()
      set({ containers: containers.map((c) => (c.id === id ? updated : c)) })
      return updated
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        await get().fetchContainers()
        toast.info(CONFLICT_MSG)
      }
      throw e
    }
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

  fetchMounts: async () => {
    try {
      const mounts = await api.get<Mount[]>('/mounts')
      set({ mounts })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to fetch mounts')
    }
  },

  createMount: async (mount) => {
    const created = await api.post<Mount>('/mounts', mount)
    const { mounts } = get()
    set({ mounts: [...mounts, created] })
    return created
  },

  updateMount: async (id, mount) => {
    const updated = await api.put<Mount>(`/mounts/${id}`, mount)
    const { mounts } = get()
    set({ mounts: mounts.map((m) => (m.id === id ? updated : m)) })
    return updated
  },

  deleteMount: async (id) => {
    await api.del(`/mounts/${id}`)
    const { mounts } = get()
    set({ mounts: mounts.filter((m) => m.id !== id) })
  },
}))
