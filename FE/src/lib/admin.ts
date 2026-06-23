import { extractList } from '@/lib/parsers'
import { labelRole, labelStaffStatus } from '@/lib/labels'

export interface StaffRow {
  id: string
  fullName: string
  email: string
  phoneNumber?: string
  roleName: string
  status: string
  createdAt?: string
}

export function staffRoleLabel(role: string): string {
  return labelRole(role)
}

export function staffStatusLabel(status: string): string {
  return labelStaffStatus(status)
}

export function isStaffActive(status: string): boolean {
  return status.toLowerCase() === 'active'
}

export function parseStaffList(data: unknown): StaffRow[] {
  return extractList(data).map((s) => ({
    id: String(s.id ?? s.Id ?? ''),
    fullName: String(s.fullName ?? s.FullName ?? ''),
    email: String(s.email ?? s.Email ?? ''),
    phoneNumber: s.phoneNumber ? String(s.phoneNumber) : s.PhoneNumber ? String(s.PhoneNumber) : undefined,
    roleName: String(s.roleName ?? s.RoleName ?? s.role ?? s.Role ?? ''),
    status: String(s.status ?? s.Status ?? 'Active'),
    createdAt: s.createdAt ? String(s.createdAt) : s.CreatedAt ? String(s.CreatedAt) : undefined,
  })).filter((s) => s.id)
}

export function parseStaffDetail(data: unknown): StaffRow | null {
  if (!data || typeof data !== 'object') return null
  const o = data as Record<string, unknown>
  const nested = o.data ?? o.Data
  const row = nested && typeof nested === 'object' ? nested : o
  const list = parseStaffList({ items: [row] })
  return list[0] ?? null
}

export const STAFF_ROLE_OPTIONS = [
  { value: 'Ward Manager', label: 'Quản lý phường' },
  { value: 'Verification Officer', label: 'Cán bộ thẩm định' },
] as const

export const STAFF_STATUS_OPTIONS = [
  { value: 'Active', label: 'Đang hoạt động' },
  { value: 'Inactive', label: 'Ngừng hoạt động' },
  { value: 'Suspended', label: 'Tạm khóa' },
] as const

export interface StaffListResult {
  items: StaffRow[]
  totalCount: number
  pageNumber: number
  pageSize: number
  totalPages: number
}

export function parseStaffListResponse(data: unknown): StaffListResult {
  if (!data || typeof data !== 'object') {
    return { items: [], totalCount: 0, pageNumber: 1, pageSize: 10, totalPages: 1 }
  }
  const root = data as Record<string, unknown>
  const nested = root.data ?? root.Data
  const o = nested && typeof nested === 'object' ? (nested as Record<string, unknown>) : root
  const items = parseStaffList({ items: o.items ?? o.Items ?? data })
  const totalCount = Number(o.totalCount ?? o.TotalCount ?? items.length)
  const pageNumber = Number(o.pageNumber ?? o.PageNumber ?? 1)
  const pageSize = Number(o.pageSize ?? o.PageSize ?? 10)
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  return { items, totalCount, pageNumber, pageSize, totalPages }
}
