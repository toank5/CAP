import type { ProblemDetails } from '../types'

const baseUrl = import.meta.env.VITE_API_BASE_URL ?? ''

let refreshPromise: Promise<boolean> | null = null

export class ApiError extends Error {
  status: number
  body: ProblemDetails | unknown

  constructor(status: number, body: unknown) {
    const title =
      body && typeof body === 'object' && 'title' in body
        ? String((body as ProblemDetails).title)
        : body && typeof body === 'object' && 'message' in body
          ? String((body as { message: string }).message)
          : `HTTP ${status}`
    super(title)
    this.status = status
    this.body = body
  }
}

export function saveTokensFromResponse(data: unknown): void {
  if (!data || typeof data !== 'object') return
  const o = data as Record<string, unknown>
  const access =
    (typeof o.accessToken === 'string' && o.accessToken) ||
    (typeof o.AccessToken === 'string' && o.AccessToken) ||
    (typeof o.token === 'string' && o.token) ||
    (typeof o.access_token === 'string' && o.access_token)
  const refresh =
    (typeof o.refreshToken === 'string' && o.refreshToken) ||
    (typeof o.RefreshToken === 'string' && o.RefreshToken) ||
    (typeof o.refresh_token === 'string' && o.refresh_token)
  if (access) localStorage.setItem('accessToken', access)
  if (refresh) localStorage.setItem('refreshToken', refresh)
  const user = o.user ?? o.User
  if (user && typeof user === 'object') {
    const role = (user as Record<string, unknown>).role ?? (user as Record<string, unknown>).Role
    if (typeof role === 'string' && role) localStorage.setItem('userRole', role)
  }
}

async function tryRefreshToken(): Promise<boolean> {
  const refresh = localStorage.getItem('refreshToken')
  if (!refresh) return false
  try {
    const res = await fetch(`${baseUrl}/api/Auth/refresh-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: refresh }),
    })
    if (!res.ok) throw new Error('refresh failed')
    const data = await res.json()
    saveTokensFromResponse(data)
    return !!localStorage.getItem('accessToken')
  } catch {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('userRole')
    return false
  }
}

async function refreshAccessToken(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = tryRefreshToken().finally(() => {
      refreshPromise = null
    })
  }
  return refreshPromise
}

async function doFetch(path: string, init: RequestInit & { auth?: boolean }): Promise<Response> {
  const headers = new Headers(init.headers)
  if (init.body != null && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  if (init.auth) {
    const token = localStorage.getItem('accessToken')
    if (token) headers.set('Authorization', `Bearer ${token}`)
  }
  return fetch(`${baseUrl}${path}`, { ...init, headers })
}

export async function request<T = unknown>(
  path: string,
  init: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  let res = await doFetch(path, init)

  if (res.status === 401 && init.auth) {
    const refreshed = await refreshAccessToken()
    if (refreshed) res = await doFetch(path, init)
  }

  const text = await res.text()
  const data = text ? (JSON.parse(text) as unknown) : null

  if (!res.ok) throw new ApiError(res.status, data)

  return data as T
}
