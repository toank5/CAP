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

  getAuditLogs: (query: { page?: number; pageSize?: number; searchKey?: string; action?: string } = {}) => {
    const params = new URLSearchParams()
    params.set('page', String(query.page ?? 1))
    params.set('pageSize', String(query.pageSize ?? 50))
    if (query.searchKey) params.set('searchKey', query.searchKey)
    if (query.action) params.set('action', query.action)
    return request<unknown>(`/api/Admin/audit-logs?${params.toString()}`, { auth: true })
  },

  getTransactions: (query: AdminTransactionQueryParams = {}) => {
    const params = new URLSearchParams()
    const pageNum = Math.max(1, query.page ?? 1)
    const pageSizeNum = Math.min(100, Math.max(1, query.pageSize ?? 100))
    params.set('Page', String(pageNum))
    params.set('PageSize', String(pageSizeNum))
    if (query.status) params.set('Status', query.status)
    if (query.projectId) params.set('ProjectId', query.projectId)
    if (query.userId) params.set('UserId', query.userId)
    if (query.fromDate) params.set('FromDate', query.fromDate)
    if (query.toDate) params.set('ToDate', query.toDate)
    if (query.searchKeyword) params.set('SearchKeyword', query.searchKeyword)
    return request<AdminTransactionListResponseDto>(`/api/Admin/transactions?${params.toString()}`, { auth: true })
  },

  getTransactionDetail: (id: string) =>
    request<AdminTransactionDetailDto>(`/api/Admin/transactions/${id}`, { auth: true }),
}

export interface AdminTransactionDetailDto {
  id: string
  orderId?: string | null
  orderInfo?: string | null
  amount: number
  status?: string | null
  userId?: string | null
  userFullName?: string | null
  userEmail?: string | null
  userPhoneNumber?: string | null
  housingProjectId?: string | null
  projectName?: string | null
  applicationId?: string | null
  slotCode?: string | null
  pdfUrl?: string | null
  vnpResponseCode?: string | null
  vnpTransactionNo?: string | null
  vnpBankCode?: string | null
  vnpBankTranNo?: string | null
  vnpCardType?: string | null
  vnpPayDate?: string | null
  vnpTransactionStatus?: string | null
  createdAt?: string | null
  paidAt?: string | null
}

export interface AdminTransactionListResponseDto {
  items: AdminTransactionDetailDto[]
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
}

export interface AdminTransactionQueryParams {
  page?: number
  pageSize?: number
  status?: string
  projectId?: string
  userId?: string
  fromDate?: string
  toDate?: string
  searchKeyword?: string
}
