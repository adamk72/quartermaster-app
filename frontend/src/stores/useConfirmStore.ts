import { create } from 'zustand'

interface ConfirmState {
  message: string | null
  resolve: ((value: boolean) => void) | null
  show: (message: string) => Promise<boolean>
  respond: (value: boolean) => void
}

export const useConfirmStore = create<ConfirmState>((set, get) => ({
  message: null,
  resolve: null,

  show: (message) => {
    return new Promise<boolean>((resolve) => {
      set({ message, resolve })
    })
  },

  respond: (value) => {
    const { resolve } = get()
    resolve?.(value)
    set({ message: null, resolve: null })
  },
}))

export const confirm = (message: string) => useConfirmStore.getState().show(message)
