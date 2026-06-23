import { request } from './http'
import type { ApiResult } from '../types'

export interface CreateStaffDto {
  email: string
  fullName: string
  phoneNumber?: string | null
  role: string
  temporaryPassword: string
}

export interface UpdateStaffDto {
  fullName?: string
  phoneNumber?: string | null
  role?: string
  status?: string
}

export interface AssignPermissionDto {
  staffId: string
  role: string
  status: string
  reason?: string | null
}

export interface GetStaffListQuery {
  pageNumber?: number
  pageSize?: number
  role?: string
  status?: string
  searchTerm?: string
}

export const adminApi = {
  createStaff: (body: CreateStaffDto) =>
    request<ApiResult>('/api/Admin/create-staff', {
      method: 'POST',
      body: JSON.stringify(body),
      auth: true,
    }),

  getStaffList: (query: GetStaffListQuery = {}) => {
    const params = new URLSearchParams()
    params.set('pageNumber', String(query.pageNumber ?? 1))
    params.set('pageSize', String(query.pageSize ?? 10))
    if (query.role) params.set('role', query.role)
    if (query.status) params.set('status', query.status)
    if (query.searchTerm) params.set('searchTerm', query.searchTerm)
    return request<ApiResult>(`/api/Admin/staff-list?${params.toString()}`, { auth: true })
  },

  getStaff: (id: string) =>
    request<ApiResult>(`/api/Admin/staff/${id}`, { auth: true }),

  updateStaff: (id: string, body: UpdateStaffDto) =>
    request<ApiResult>(`/api/Admin/staff/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
      auth: true,
    }),

  assignPermission: (body: AssignPermissionDto) =>
    request<ApiResult>('/api/Admin/assign-permission', {
      method: 'POST',
      body: JSON.stringify({
        staffId: body.staffId,
        role: body.role,
        status: body.status,
        reason: body.reason ?? null,
      }),
      auth: true,
    }),

  deactivateStaff: (id: string, reason?: string) =>
    request<ApiResult>(`/api/Admin/staff/${id}/deactivate`, {
      method: 'POST',
      body: JSON.stringify(reason ?? 'Admin khóa tài khoản'),
      auth: true,
    }),

  activateStaff: (id: string) =>
    request<ApiResult>(`/api/Admin/staff/${id}/activate`, {
      method: 'POST',
      auth: true,
    }),

  resetPassword: (id: string, newPassword: string) =>
    request<ApiResult>(`/api/Admin/staff/${id}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ newPassword }),
      auth: true,
    }),
}
