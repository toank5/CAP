import { request } from './http'
import { labelProjectStatus } from '@/lib/labels'
import type { ApiResult } from '../types'

export interface HousingProjectStatusDto {
  id: string
  statusName: string
  statusCode: string
  label: string
}

export const housingProjectStatusesApi = {
  list: () =>
    request<ApiResult>('/api/housing-project-statuses'),
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
