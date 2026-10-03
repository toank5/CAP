import { request } from './http'
import type { ApiResult, PagedResultDto } from '../types'

export interface CreateIssueReportRequestDto {
  title: string
  description: string
  issueType: string
  screenshotUrl?: string | null
}

export interface IssueReportListItemDto {
  id: string
  title: string
  issueType: string
  status: string
  createdAt: string
  reporterName: string
}

export interface IssueReportDetailResponseDto {
  id: string
  title: string
  description: string
  issueType: string
  status: string
  screenshotUrl?: string | null
  createdAt: string
  resolvedAt?: string | null
  reporterName: string
  reporterId: string
}

export interface UpdateIssueReportStatusRequestDto {
  status: string
}

export interface GetIssueReportsQuery {
  pageIndex?: number
  pageSize?: number
  search?: string
  status?: string
  issueType?: string
}

export const ISSUE_REPORT_STATUSES = [
  'Open',
  'InProgress',
  'Resolved',
  'Closed',
  'Rejected',
] as const
export type IssueReportStatus = (typeof ISSUE_REPORT_STATUSES)[number]

export const ISSUE_TYPES = [
  'Bug',
  'FeatureRequest',
  'Improvement',
  'DataIssue',
  'AccountIssue',
  'Other',
] as const

export function statusLabel(s: string): string {
  switch (s) {
    case 'Open':
    case 'New': return 'Mới tiếp nhận'
    case 'InProgress':
    case 'InReview': return 'Đang xử lý'
    case 'Resolved': return 'Đã giải quyết'
    case 'Closed': return 'Đã đóng'
    case 'Rejected': return 'Từ chối'
    default: return s || '—'
  }
}

export function statusTone(
  s: string,
): 'default' | 'secondary' | 'success' | 'warning' | 'danger' {
  switch (s) {
    case 'Open':
    case 'New': return 'warning'
    case 'InProgress':
    case 'InReview': return 'default'
    case 'Resolved': return 'success'
    case 'Closed': return 'secondary'
    case 'Rejected': return 'danger'
    default: return 'secondary'
  }
}

export function issueTypeLabel(t: string): string {
  switch (t) {
    case 'Bug': return 'Lỗi kỹ thuật'
    case 'FeatureRequest': return 'Yêu cầu tính năng'
    case 'Improvement': return 'Cải thiện'
    case 'DataIssue': return 'Sai dữ liệu'
    case 'AccountIssue': return 'Vấn đề tài khoản'
    case 'Other': return 'Khác'
    default: return t || 'Khác'
  }
}

function parseListItem(it: unknown): IssueReportListItemDto {
  const row = (it && typeof it === 'object' ? it : {}) as Record<string, unknown>
  return {
    id: String(row.id ?? row.Id ?? ''),
    title: String(row.title ?? row.Title ?? ''),
    issueType: String(row.issueType ?? row.IssueType ?? ''),
    status: String(row.status ?? row.Status ?? ''),
    createdAt: String(row.createdAt ?? row.CreatedAt ?? ''),
    reporterName: String(row.reporterName ?? row.ReporterName ?? ''),
  }
}

function parseListResponse(data: unknown): PagedResultDto<IssueReportListItemDto> {
  const root = (data ?? {}) as Record<string, unknown>
  const o = (root.data ?? root.Data ?? root) as Record<string, unknown>
  const raw = (o.items ?? o.Items) as unknown[] | undefined
  const items = Array.isArray(raw) ? raw.map(parseListItem).filter((x) => x.id) : []
  const pageSize = Number(o.pageSize ?? o.PageSize ?? (items.length || 12))
  const totalCount = Number(o.totalCount ?? o.TotalCount ?? items.length)
  const totalPages = Number(
    o.totalPages ?? o.TotalPages ?? (pageSize > 0 ? Math.max(1, Math.ceil(totalCount / pageSize)) : 1),
  )
  return {
    items,
    pageIndex: Number(o.pageIndex ?? o.PageIndex ?? 1),
    pageSize,
    totalCount,
    totalPages,
    hasNextPage: Boolean(o.hasNextPage ?? o.HasNextPage ?? false),
    hasPreviousPage: Boolean(o.hasPreviousPage ?? o.HasPreviousPage ?? false),
  }
}

export function parseIssueReports(data: unknown): IssueReportListItemDto[] {
  if (!data || typeof data !== 'object') return []
  const o = data as Record<string, unknown>
  const items = (o.items ?? o.Items) as IssueReportListItemDto[] | undefined
  return Array.isArray(items) ? items : []
}

export function parseIssueReportDetail(data: unknown): IssueReportDetailResponseDto | null {
  if (!data || typeof data !== 'object') return null
  const root = data as Record<string, unknown>
  const inner = (root.data ?? root.Data ?? root) as Record<string, unknown>
  if (!inner || typeof inner !== 'object') return null
  return {
    id: String(inner.id ?? inner.Id ?? ''),
    title: String(inner.title ?? inner.Title ?? ''),
    description: String(inner.description ?? inner.Description ?? ''),
    issueType: String(inner.issueType ?? inner.IssueType ?? ''),
    status: String(inner.status ?? inner.Status ?? ''),
    screenshotUrl: (inner.screenshotUrl ?? inner.ScreenshotUrl ?? null) as string | null,
    createdAt: String(inner.createdAt ?? inner.CreatedAt ?? ''),
    resolvedAt: (inner.resolvedAt ?? inner.ResolvedAt ?? null) as string | null,
    reporterName: String(inner.reporterName ?? inner.ReporterName ?? ''),
    reporterId: String(inner.reporterId ?? inner.ReporterId ?? ''),
  }
}

export const issueReportsApi = {
  create: (body: CreateIssueReportRequestDto) =>
    request<ApiResult>('/api/issue-reports', {
      method: 'POST',
      body: JSON.stringify({
        title: body.title,
        description: body.description,
        issueType: body.issueType,
        screenshotUrl: body.screenshotUrl ?? null,
      }),
      auth: true,
    }),

  getByIdAdmin: (id: string) =>
    request<ApiResult>(`/api/admin/issue-reports/${id}`, { auth: true }),

  getMyReports: (pageIndex = 1, pageSize = 10) =>
    request<ApiResult>(
      `/api/issue-reports/my-reports?pageIndex=${pageIndex}&pageSize=${pageSize}`,
      { auth: true },
    ),

  getAllReports: (q: GetIssueReportsQuery = {}) => {
    const params = new URLSearchParams()
    params.set('pageIndex', String(q.pageIndex ?? 1))
    params.set('pageSize', String(q.pageSize ?? 12))
    if (q.search) params.set('search', q.search)
    if (q.status) params.set('status', q.status)
    if (q.issueType) params.set('issueType', q.issueType)
    return request<ApiResult>(`/api/admin/issue-reports?${params.toString()}`, {
      auth: true,
    }).then(parseListResponse)
  },

  updateStatus: (id: string, body: UpdateIssueReportStatusRequestDto) =>
    request<ApiResult>(`/api/admin/issue-reports/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status: body.status }),
      auth: true,
    }),
}

export { parseListResponse as parseIssueReportsPage }
