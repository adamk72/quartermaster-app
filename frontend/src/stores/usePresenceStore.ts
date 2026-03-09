import { create } from 'zustand'
import { api } from '../api/client'
import type { ActiveUser } from '../types'

interface PresenceState {
  activeUsers: ActiveUser[]
  fetchActiveUsers: () => Promise<void>
}

export const usePresenceStore = create<PresenceState>((set) => ({
  activeUsers: [],

  fetchActiveUsers: async () => {
    try {
      const users = await api.get<ActiveUser[]>('/users/active')
      set({ activeUsers: users })
    } catch {
      // silently ignore — polling will retry
    }
  },
}))
