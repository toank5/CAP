import { request } from './http'
import type { ApiResult } from '../types'

export const wishlistApi = {
  list: (params?: { pageIndex?: number; pageSize?: number }) => {
    const qs = new URLSearchParams()
    qs.set('pageIndex', String(params?.pageIndex ?? 1))
    qs.set('pageSize', String(params?.pageSize ?? 100))
    return request<ApiResult>(`/api/wishlist?${qs.toString()}`, { auth: true })
  },

  add: (projectId: string) =>
    request<ApiResult>(`/api/wishlist/${projectId}`, { method: 'POST', auth: true }),

  remove: (projectId: string) =>
    request<ApiResult>(`/api/wishlist/${projectId}`, { method: 'DELETE', auth: true }),

  status: (projectId: string) =>
    request<ApiResult>(`/api/wishlist/${projectId}/status`, { auth: true }),
}
