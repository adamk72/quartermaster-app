import { create } from 'zustand'
import { api } from '../api/client'
import { toast } from './useToastStore'

interface SettingEntry {
  key: string
  value: string
  updated_at: string
}

interface SettingsState {
  settings: Record<string, string>
  loading: boolean
  fetchSettings: () => Promise<void>
  updateSetting: (key: string, value: string) => Promise<void>
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: {},
  loading: false,

  fetchSettings: async () => {
    set({ loading: true })
    try {
      const entries = await api.get<SettingEntry[]>('/settings')
      const settings: Record<string, string> = {}
      for (const e of entries) {
        settings[e.key] = e.value
      }
      set({ settings, loading: false })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to fetch settings')
      set({ loading: false })
    }
  },

  updateSetting: async (key, value) => {
    await api.put<SettingEntry>(`/settings/${key}`, { value })
    set((state) => ({ settings: { ...state.settings, [key]: value } }))
  },
}))
