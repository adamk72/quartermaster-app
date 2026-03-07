import { AUTH_TOKEN_KEY, API_BASE } from '../constants'

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

const getToken = (): string | null => localStorage.getItem(AUTH_TOKEN_KEY)

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  const token = getToken()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    let message = `Request failed: ${res.status}`
    try {
      const err = await res.json() as { error?: string }
      if (err.error) message = err.error
    } catch {
      // ignore parse error
    }

    if (res.status === 401) {
      localStorage.removeItem(AUTH_TOKEN_KEY)
    }

    throw new ApiError(message, res.status)
  }

  if (res.status === 204) return undefined as T

  return res.json() as Promise<T>
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  del: <T>(path: string) => request<T>('DELETE', path),

  upload: async <T>(path: string, formData: FormData): Promise<T> => {
    const token = getToken()
    const headers: Record<string, string> = {}
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers,
      body: formData,
    })

    if (!res.ok) {
      let message = `Upload failed: ${res.status}`
      try {
        const err = await res.json() as { error?: string }
        if (err.error) message = err.error
      } catch {
        // ignore parse error
      }

      if (res.status === 401) {
        localStorage.removeItem(AUTH_TOKEN_KEY)
      }

      throw new ApiError(message, res.status)
    }

    return res.json() as Promise<T>
  },
}
