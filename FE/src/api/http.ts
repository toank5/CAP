import type { ProblemDetails } from '../types'

const baseUrl = import.meta.env.VITE_API_BASE_URL ?? ''

let refreshPromise: Promise<boolean> | null = null

export class ApiError extends Error {
  status: number
  body: ProblemDetails | unknown

  constructor(status: number, body: unknown) {
    // Ưu tiên `message` cho status 4xx/5xx vì nhiều controller .NET trả raw object
    // `{ message: "..." }` thay vì ProblemDetails. Với 4xx validation, fallback về `title`.
    const obj = body && typeof body === 'object' ? (body as Record<string, unknown>) : null
    const rawMessage = obj && typeof obj.message === 'string' ? (obj.message as string) : null
    const rawTitle = obj && typeof obj.title === 'string' ? (obj.title as string) : null
    const text =
      rawMessage ??
      (rawTitle && rawTitle !== 'Unauthorized' && rawTitle !== 'One or more validation errors occurred.'
        ? rawTitle
        : null) ??
      `HTTP ${status}`
    super(text)
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
  if (access) sessionStorage.setItem('accessToken', access)
  if (refresh) sessionStorage.setItem('refreshToken', refresh)
  const user = o.user ?? o.User
  if (user && typeof user === 'object') {
    const role = (user as Record<string, unknown>).role ?? (user as Record<string, unknown>).Role
    if (typeof role === 'string' && role) sessionStorage.setItem('userRole', role)
  }
}

async function tryRefreshToken(): Promise<boolean> {
  const refresh = sessionStorage.getItem('refreshToken')
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
    return !!sessionStorage.getItem('accessToken')
  } catch {
    sessionStorage.removeItem('accessToken')
    sessionStorage.removeItem('refreshToken')
    sessionStorage.removeItem('userRole')
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
    const token = sessionStorage.getItem('accessToken')
    if (token) headers.set('Authorization', `Bearer ${token}`)
  }
  return fetch(`${baseUrl}${path}`, { ...init, headers })
}

export async function request<T = unknown>(
  path: string,
  init: RequestInit & { auth?: boolean; timeoutMs?: number } = {},
): Promise<T> {
  // Tự động cancel request khi quá timeout (mặc định 30s; create/upload có thể truyền 90s)
  const timeoutMs = init.timeoutMs ?? 30_000
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  const initWithSignal: RequestInit & { auth?: boolean } = {
    ...init,
    signal: controller.signal,
  }

  let res: Response
  try {
    res = await doFetch(path, initWithSignal)
    if (res.status === 401 && init.auth) {
      const refreshed = await refreshAccessToken()
      if (refreshed) res = await doFetch(path, initWithSignal)
    }
  } catch (err) {
    clearTimeout(timeoutId)
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiError(0, {
        message: `Yêu cầu quá thời gian (timeout ${Math.round(timeoutMs / 1000)}s). Vui lòng thử lại hoặc kiểm tra kết nối.`,
      })
    }
    throw err
  }
  clearTimeout(timeoutId)

  if (res.status === 204 || res.status === 205) return null as T

  const text = await res.text()
  let data: unknown = null
  if (text) {
    try {
      data = JSON.parse(text) as unknown
    } catch {
      if (!res.ok) {
        throw new ApiError(res.status, { message: text.slice(0, 300) || `HTTP ${res.status}` })
      }
      throw new Error('Phản hồi từ máy chủ không phải JSON hợp lệ.')
    }
  }

  if (!res.ok) throw new ApiError(res.status, data)

  return data as T
}
