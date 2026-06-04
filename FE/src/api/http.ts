import type { ProblemDetails } from '../types'

const baseUrl = import.meta.env.VITE_API_BASE_URL ?? ''

export class ApiError extends Error {
  status: number
  body: ProblemDetails | unknown

  constructor(status: number, body: unknown) {
    const title =
      body && typeof body === 'object' && 'title' in body
        ? String((body as ProblemDetails).title)
        : `HTTP ${status}`
    super(title)
    this.status = status
    this.body = body
  }
}

export async function request<T = unknown>(
  path: string,
  init: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  const headers = new Headers(init.headers)
  // Don't set Content-Type for FormData (browser will handle it)
  if (init.body != null && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  if (init.auth) {
    const token = localStorage.getItem('accessToken')
    if (token) headers.set('Authorization', `Bearer ${token}`)
  }

  const res = await fetch(`${baseUrl}${path}`, { ...init, headers })
  const text = await res.text()
  const data = text ? (JSON.parse(text) as unknown) : null

  if (!res.ok) throw new ApiError(res.status, data)

  return data as T
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
}
