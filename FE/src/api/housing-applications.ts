import { request } from './http'
import type {
  ApiResult,
  ApplicationDetailDto,
  ApplicationFilterDto,
  CreateApplicationDto,
  PagedResultDto,
  ApplicationSummaryDto,
  ReviewRequestDto,
} from '../types'

function buildQuery(filter: ApplicationFilterDto = {}): string {
  const params = new URLSearchParams()
  if (filter.pageIndex != null) params.set('pageIndex', String(filter.pageIndex))
  if (filter.pageSize != null) params.set('pageSize', String(filter.pageSize))
  if (filter.status) params.set('status', filter.status)
  if (filter.projectId) params.set('projectId', filter.projectId)
  if (filter.search) params.set('search', filter.search)
  if (filter.submittedFrom) params.set('submittedFrom', filter.submittedFrom)
  if (filter.submittedTo) params.set('submittedTo', filter.submittedTo)
  const q = params.toString()
  return q ? `?${q}` : ''
}

export function parsePagedApplications(data: unknown): ApplicationSummaryDto[] {
  if (!data || typeof data !== 'object') return []
  const o = data as Record<string, unknown>
  const items = o.items ?? o.Items
  return Array.isArray(items) ? (items as ApplicationSummaryDto[]) : []
}

export function parseApplicationDetail(data: unknown): ApplicationDetailDto | null {
  if (!data || typeof data !== 'object') return null
  return data as ApplicationDetailDto
}

export const housingApplicationsApi = {
  create: (body: CreateApplicationDto) =>
    request<ApiResult>('/api/housing-applications', {
      method: 'POST',
      body: JSON.stringify(body),
      auth: true,
    }),

  getMy: (filter?: ApplicationFilterDto) =>
    request<PagedResultDto<ApplicationSummaryDto>>(
      `/api/housing-applications/my${buildQuery(filter)}`,
      { auth: true },
    ),

  getAll: (filter?: ApplicationFilterDto) =>
    request<PagedResultDto<ApplicationSummaryDto>>(
      `/api/housing-applications${buildQuery(filter)}`,
      { auth: true },
    ),

  getVoDashboard: (filter?: ApplicationFilterDto) =>
    request<PagedResultDto<ApplicationSummaryDto>>(
      `/api/housing-applications/dashboard/vo${buildQuery(filter)}`,
      { auth: true },
    ),

  getWmDashboard: (filter?: ApplicationFilterDto) =>
    request<PagedResultDto<ApplicationSummaryDto>>(
      `/api/housing-applications/dashboard/wm${buildQuery(filter)}`,
      { auth: true },
    ),

  getById: (id: string) =>
    request<ApplicationDetailDto>(`/api/housing-applications/${id}`, { auth: true }),

  submit: (id: string) =>
    request<ApiResult>(`/api/housing-applications/${id}/submit`, {
      method: 'POST',
      auth: true,
    }),

  assign: (id: string) =>
    request<ApiResult>(`/api/housing-applications/${id}/assign`, {
      method: 'POST',
      auth: true,
    }),

  voReview: (id: string, body: ReviewRequestDto) =>
    request<ApiResult>(`/api/housing-applications/${id}/vo-review`, {
      method: 'POST',
      body: JSON.stringify(body),
      auth: true,
    }),

  wmReview: (id: string, body: ReviewRequestDto) =>
    request<ApiResult>(`/api/housing-applications/${id}/wm-review`, {
      method: 'POST',
      body: JSON.stringify(body),
      auth: true,
    }),

  uploadDocument: (applicationId: string, documentType: string, file: File) => {
    const fd = new FormData()
    fd.append('DocumentType', documentType)
    fd.append('File', file)
    return request<ApiResult>(`/api/housing-applications/${applicationId}/documents`, {
      method: 'POST',
      body: fd,
      auth: true,
    })
  },

  deleteDocument: (applicationId: string, documentId: string) =>
    request<ApiResult>(`/api/housing-applications/${applicationId}/documents/${documentId}`, {
      method: 'DELETE',
      auth: true,
    }),
}
