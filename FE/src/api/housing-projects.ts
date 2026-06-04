import { request } from './http'
import type { ApiResult, CreateHousingProjectRequestDto } from '../types'

export const housingProjectsApi = {
  list: () => request<ApiResult>('/api/HousingProjects', { auth: true }),

  create: (body: CreateHousingProjectRequestDto) =>
    request<ApiResult>('/api/HousingProjects', {
      method: 'POST',
      body: JSON.stringify(body),
      auth: true,
    }),

  getById: (id: string) =>
    request<ApiResult>(`/api/HousingProjects/${id}`, { auth: true }),

  update: (id: string, body: Partial<CreateHousingProjectRequestDto>) =>
    request<ApiResult>(`/api/HousingProjects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
      auth: true,
    }),

  delete: (id: string) =>
    request<ApiResult>(`/api/HousingProjects/${id}`, {
      method: 'DELETE',
      auth: true,
    }),
}
