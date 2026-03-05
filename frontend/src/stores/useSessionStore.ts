import { create } from 'zustand'
import { api } from '../api/client'
import type { Session, SessionImage } from '../types'

interface SessionState {
  sessions: Session[]
  currentSession: Session | null
  loading: boolean
  error: string | null

  fetchSessions: () => Promise<void>
  fetchSession: (id: number) => Promise<void>
  createSession: (session: Partial<Session>) => Promise<Session>
  updateSession: (id: number, session: Partial<Session>) => Promise<Session>
  deleteSession: (id: number) => Promise<void>
  uploadImage: (sessionId: number, file: File, caption: string) => Promise<SessionImage>
}

export const useSessionStore = create<SessionState>((set, get) => ({
  sessions: [],
  currentSession: null,
  loading: false,
  error: null,

  fetchSessions: async () => {
    set({ loading: true, error: null })
    try {
      const sessions = await api.get<Session[]>('/sessions')
      set({ sessions, loading: false })
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to fetch sessions', loading: false })
    }
  },

  fetchSession: async (id) => {
    set({ loading: true, error: null })
    try {
      const session = await api.get<Session>(`/sessions/${id}`)
      set({ currentSession: session, loading: false })
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to fetch session', loading: false })
    }
  },

  createSession: async (session) => {
    const created = await api.post<Session>('/sessions', session)
    const { sessions } = get()
    set({ sessions: [created, ...sessions] })
    return created
  },

  updateSession: async (id, session) => {
    const updated = await api.put<Session>(`/sessions/${id}`, session)
    const { sessions } = get()
    set({
      sessions: sessions.map((s) => (s.id === id ? updated : s)),
      currentSession: updated,
    })
    return updated
  },

  deleteSession: async (id) => {
    await api.del(`/sessions/${id}`)
    const { sessions } = get()
    set({ sessions: sessions.filter((s) => s.id !== id), currentSession: null })
  },

  uploadImage: async (sessionId, file, caption) => {
    const formData = new FormData()
    formData.append('image', file)
    formData.append('caption', caption)
    return api.upload<SessionImage>(`/sessions/${sessionId}/images`, formData)
  },
}))
