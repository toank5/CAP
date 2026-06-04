import { request } from './http'
import type { ApiResult } from '../types'

export interface CreateStaffDto {
  email: string
  fullName: string
  phoneNumber?: string | null
  role: string
}

export interface UpdateStaffDto {
  fullName: string
  phoneNumber?: string | null
  role: string
}

export interface PermissionDto {
  staffId: string
  permission: string
}

export const adminApi = {
  createStaff: (body: CreateStaffDto) =>
    request<ApiResult>('/api/Admin/create-staff', {
      method: 'POST',
      body: JSON.stringify(body),
      auth: true,
    }),

  getStaffList: () =>
    request<ApiResult>('/api/Admin/staff-list', { auth: true }),

  getStaff: (id: string) =>
    request<ApiResult>(`/api/Admin/staff/${id}`, { auth: true }),

  updateStaff: (id: string, body: UpdateStaffDto) =>
    request<ApiResult>(`/api/Admin/staff/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
      auth: true,
    }),

  assignPermission: (body: PermissionDto) =>
    request<ApiResult>('/api/Admin/assign-permission', {
      method: 'POST',
      body: JSON.stringify(body),
      auth: true,
    }),

  deactivateStaff: (id: string) =>
    request<ApiResult>(`/api/Admin/staff/${id}/deactivate`, {
      method: 'POST',
      auth: true,
    }),

  activateStaff: (id: string) =>
    request<ApiResult>(`/api/Admin/staff/${id}/activate`, {
      method: 'POST',
      auth: true,
    }),

  resetPassword: (id: string) =>
    request<ApiResult>(`/api/Admin/staff/${id}/reset-password`, {
      method: 'POST',
      auth: true,
    }),
}
