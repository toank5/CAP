import { request } from './http'
import type { ApiResult, UpdateProfileDto } from '../types'

export const usersApi = {
  getProfile: () => request<ApiResult>('/api/Users/profile', { auth: true }),

  updateProfile: (body: UpdateProfileDto) =>
    request<ApiResult>('/api/Users/profile', {
      method: 'PUT',
      body: JSON.stringify(body),
      auth: true,
    }),

  adminOnly: () => request<ApiResult>('/api/Users/admin-only', { auth: true }),

  officerOnly: () => request<ApiResult>('/api/Users/officer-only', { auth: true }),
}
