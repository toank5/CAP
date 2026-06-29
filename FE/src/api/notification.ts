import { request } from './http'
import type { ApiResult } from '../types'

export interface NotificationDto {
  notificationId: string
  title: string
  content: string
  notificationType: string
  isRead: boolean
  createdAt: string
}

export interface PagedNotificationResultDto {
  items: NotificationDto[]
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

export interface UnreadCountResponse {
  success: boolean
  unreadCount: number
}

export function parsePagedNotifications(data: unknown): PagedNotificationResultDto {
  const o = (data ?? {}) as Record<string, unknown>
  const nested = (o.data ?? o.Data) as Record<string, unknown> | undefined
  const src = (nested ?? o) as Record<string, unknown>
  const items = (src.items ?? src.Items) as NotificationDto[] | undefined
  const safe = Array.isArray(items) ? items : []
  return {
    items: safe,
    totalCount: Number(src.totalCount ?? src.TotalCount ?? safe.length),
    page: Number(src.page ?? src.Page ?? 1),
    pageSize: Number(src.pageSize ?? src.PageSize ?? 20),
    totalPages: Number(src.totalPages ?? src.TotalPages ?? 1),
    hasNextPage: Boolean(src.hasNextPage ?? src.HasNextPage ?? false),
    hasPreviousPage: Boolean(src.hasPreviousPage ?? src.HasPreviousPage ?? false),
  }
}

export function parseUnreadCount(data: unknown): number {
  if (!data || typeof data !== 'object') return 0
  const o = data as Record<string, unknown>
  if (typeof o.unreadCount === 'number') return o.unreadCount
  const nested = o.data ?? o.Data
  if (nested && typeof nested === 'object') {
    const n = nested as Record<string, unknown>
    if (typeof n.unreadCount === 'number') return n.unreadCount
  }
  return 0
}

export const notificationApi = {
  getMy: (page = 1, pageSize = 20) =>
    request<ApiResult>(
      `/api/Notification/my?page=${page}&pageSize=${pageSize}`,
      { auth: true },
    ),

  getUnreadCount: () =>
    request<ApiResult>('/api/Notification/unread-count', { auth: true }),

  markAsRead: (id: string) =>
    request<ApiResult>(`/api/Notification/${id}/read`, {
      method: 'PUT',
      auth: true,
    }),

  markAllAsRead: () =>
    request<ApiResult>('/api/Notification/read-all', {
      method: 'PUT',
      auth: true,
    }),
}
