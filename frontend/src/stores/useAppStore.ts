import { create } from 'zustand'
import { api } from '../api/client'
import type { User, LoginResponse } from '../types'

interface AppState {
  user: User | null
  loading: boolean
  error: string | null

  login: (username: string, inviteCode: string) => Promise<void>
  logout: () => void
  checkAuth: () => Promise<void>
  clearError: () => void
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  loading: true,
  error: null,

  login: async (username, inviteCode) => {
    try {
      set({ error: null })
      const res = await api.post<LoginResponse>('/auth/login', {
        username,
        invite_code: inviteCode,
      })
      localStorage.setItem('token', res.token)
      set({ user: res.user })
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Login failed' })
      throw e
    }
  },

  logout: () => {
    localStorage.removeItem('token')
    set({ user: null })
  },

  checkAuth: async () => {
    const token = localStorage.getItem('token')
    if (!token) {
      set({ loading: false })
      return
    }
    try {
      const user = await api.get<User>('/auth/me')
      set({ user, loading: false })
    } catch {
      localStorage.removeItem('token')
      set({ loading: false })
    }
  },

  clearError: () => set({ error: null }),
}))
