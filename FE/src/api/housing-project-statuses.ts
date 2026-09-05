import { request } from './http'
import { labelProjectStatus } from '@/lib/labels'
import type { ApiResult } from '../types'

export interface HousingProjectStatusDto {
  id: string
  statusName: string
  statusCode: string
  label: string
}

export interface PolicyConfigDto {
  policyName: string
  policyValue: string
  description?: string
  unit?: string
  updatedAt?: string
}

export interface PriorityGroupPointItemDto {
  groupCode: string
  groupName: string
  points: number
  description?: string | null
}

export interface PriorityPointsTableDto {
  pointsTable: PriorityGroupPointItemDto[]
}

export const housingProjectStatusesApi = {
  list: () =>
    request<ApiResult>('/api/housing-project-statuses'),

  getPolicy: (name: string) =>
    request<ApiResult>(`/api/PolicyConfig/${encodeURIComponent(name)}`),

  updatePolicy: (name: string, body: { policyValue: string; description?: string }) =>
    request<ApiResult>(`/api/PolicyConfig/${encodeURIComponent(name)}`, {
      method: 'PUT',
      body: JSON.stringify(body),
      auth: true,
    }),

  getPriorityPoints: () =>
    request<PriorityPointsTableDto | ApiResult>('/api/PolicyConfig/priority-points', { auth: true }),

  updatePriorityPoints: (body: PriorityPointsTableDto) =>
    request<ApiResult>('/api/PolicyConfig/priority-points', {
      method: 'PUT',
      body: JSON.stringify(body),
      auth: true,
    }),
}


export function parseStatuses(data: unknown): HousingProjectStatusDto[] {
  if (!data || typeof data !== 'object') return []
  if (Array.isArray(data)) {
    return data.map((item) => {
      const o = item as Record<string, unknown>
      return {
        id: String(o.id ?? o.Id ?? ''),
        statusName: String(o.statusName ?? o.StatusName ?? ''),
        statusCode: String(o.statusCode ?? o.StatusCode ?? ''),
        label: labelProjectStatus(String(o.statusCode ?? o.StatusCode ?? o.statusName ?? o.StatusName ?? '')),
      }
    })
  }
  const o = data as Record<string, unknown>
  const items = o.items ?? o.Items ?? o.data ?? o.Data
  if (!Array.isArray(items)) return []
  return parseStatuses(items)
}
