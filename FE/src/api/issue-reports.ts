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
  'New',
  'InReview',
  'Resolved',
  'Closed',
  'Rejected',
] as const
export type IssueReportStatus = (typeof ISSUE_REPORT_STATUSES)[number]

export const ISSUE_TYPES = [
  'Bug',
  'FeatureRequest',
  'DataIssue',
  'AccountIssue',
  'Other',
] as const

export function statusLabel(s: string): string {
  switch (s) {
    case 'Open': return 'Mới tiếp nhận'
    case 'New': return 'Mới tiếp nhận'
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
    case 'DataIssue': return 'Sai dữ liệu'
    case 'AccountIssue': return 'Vấn đề tài khoản'
    case 'Other': return 'Khác'
    default: return t || 'Khác'
  }
}

function parseListResponse(data: unknown): PagedResultDto<IssueReportListItemDto> {
  const root = (data ?? {}) as Record<string, unknown>
  const o = (root.data ?? root.Data ?? root) as Record<string, unknown>
  const items = (o.items ?? o.Items) as IssueReportListItemDto[] | undefined
  const safe = Array.isArray(items) ? items : []
  return {
    items: safe,
    pageIndex: Number(o.pageIndex ?? o.PageIndex ?? 1),
    pageSize: Number(o.pageSize ?? o.PageSize ?? safe.length),
    totalCount: Number(o.totalCount ?? o.TotalCount ?? safe.length),
    totalPages: Number(o.totalPages ?? o.TotalPages ?? 1),
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
    })
  },

  updateStatus: (id: string, body: UpdateIssueReportStatusRequestDto) =>
    request<ApiResult>(`/api/admin/issue-reports/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status: body.status }),
      auth: true,
    }),
}

export { parseListResponse as parseIssueReportsPage }
