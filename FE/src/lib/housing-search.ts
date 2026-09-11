import type { HousingProjectFilter } from '@/api/housing-projects'
import type { HousingProjectDto } from '@/types'
import type { RouteId } from '@/router'
import { HCM_PROVINCE } from '@/lib/vn-provinces-v2'
import { effectiveProjectStatus } from '@/lib/project-status-flow'

export { HCM_PROVINCE }

export type HousingSortKey = 'default' | 'price_asc' | 'price_desc' | 'units_desc'

export const HOUSING_SORT_OPTIONS: { key: HousingSortKey; label: string }[] = [
  { key: 'default', label: 'Mặc định' },
  { key: 'price_asc', label: 'Giá tăng' },
  { key: 'price_desc', label: 'Giá giảm' },
  { key: 'units_desc', label: 'Còn nhiều căn' },
]

export interface HousingSearchFilter {
  search: string
  province: string
  /** Phường/xã (API v2). Giữ tên field district trên hash cũ `huyen` → map sang ward. */
  ward: string
  minPriceMillion: string
  maxPriceMillion: string
  minArea: string
  maxArea: string
  minAvailable: string
  statusId: string
  statusCode: string
  sort: HousingSortKey
}

export const EMPTY_HOUSING_SEARCH: HousingSearchFilter = {
  search: '',
  province: HCM_PROVINCE,
  ward: '',
  minPriceMillion: '',
  maxPriceMillion: '',
  minArea: '',
  maxArea: '',
  minAvailable: '',
  statusId: '',
  statusCode: '',
  sort: 'default',
}

const QUERY_KEYS = {
  search: 'q',
  province: 'tinh',
  ward: 'phuong',
  minPriceMillion: 'giaTu',
  maxPriceMillion: 'giaDen',
  minArea: 'dtTu',
  maxArea: 'dtDen',
  minAvailable: 'can',
  statusId: 'trangThai',
  statusCode: 'maTrangThai',
  sort: 'sapXep',
} as const

function normalizeSort(value: string): HousingSortKey {
  if (value === 'price_asc' || value === 'price_desc' || value === 'units_desc') return value
  return 'default'
}

export function parseHousingSearchFromHash(): HousingSearchFilter {
  const hash = location.hash.replace(/^#\/?/, '')
  const qIdx = hash.indexOf('?')
  if (qIdx < 0) return { ...EMPTY_HOUSING_SEARCH }

  const params = new URLSearchParams(hash.slice(qIdx + 1))
  const read = (key: string) => params.get(key) ?? ''

  return {
    search: read(QUERY_KEYS.search),
    province: HCM_PROVINCE,
    // Ưu tiên `phuong`, fallback `huyen` (URL cũ)
    ward: read(QUERY_KEYS.ward) || read('huyen'),
    minPriceMillion: read(QUERY_KEYS.minPriceMillion),
    maxPriceMillion: read(QUERY_KEYS.maxPriceMillion),
    minArea: read(QUERY_KEYS.minArea),
    maxArea: read(QUERY_KEYS.maxArea),
    minAvailable: read(QUERY_KEYS.minAvailable),
    statusId: read(QUERY_KEYS.statusId),
    statusCode: read(QUERY_KEYS.statusCode),
    sort: normalizeSort(read(QUERY_KEYS.sort)),
  }
}

export function navigateToHousingSearch(filter: HousingSearchFilter, route: RouteId = 'tim-nha') {
  const params = new URLSearchParams()
  const locked: HousingSearchFilter = { ...filter, province: HCM_PROVINCE }
  for (const [field, key] of Object.entries(QUERY_KEYS) as [keyof typeof QUERY_KEYS, string][]) {
    if (field === 'province') continue
    const value = String(locked[field] ?? '').trim()
    if (!value || (field === 'sort' && value === 'default')) continue
    params.set(key, value)
  }
  const qs = params.toString()
  location.hash = qs ? `#/${route}?${qs}` : `#/${route}`
}

function parseNum(value: string): number | undefined {
  const n = parseFloat(value)
  return Number.isFinite(n) && n > 0 ? n : undefined
}

export function toApiFilter(filter: HousingSearchFilter): HousingProjectFilter {
  const minM = parseNum(filter.minPriceMillion)
  const maxM = parseNum(filter.maxPriceMillion)
  return {
    pageIndex: 1,
    pageSize: 100,
    search: filter.search.trim() || undefined,
    province: HCM_PROVINCE,
    ward: filter.ward || undefined,
    minPrice: minM != null ? minM * 1_000_000 : undefined,
    maxPrice: maxM != null ? maxM * 1_000_000 : undefined,
    minArea: parseNum(filter.minArea),
    maxArea: parseNum(filter.maxArea),
    statusId: filter.statusId || undefined,
    statusCode: filter.statusCode || undefined,
  }
}

export function matchesOpenStatus(statusLabel: string): boolean {
  // Nghiệp vụ mới: chỉ cho phép nộp hồ sơ khi dự án ở trạng thái OPEN (Đang mở đăng ký).
  // UPCOMING (Sắp mở bán) là giai đoạn chờ 30 ngày — Applicant phải đợi, không được nộp.
  const s = statusLabel.toLowerCase()
  return (
    s === 'open' ||
    s.includes('đang mở đăng ký') ||
    s.includes('mở đăng ký')
  )
}

export function applyClientFilters(
  projects: HousingProjectDto[],
  filter: HousingSearchFilter,
  options?: { allowUnapproved?: boolean },
): HousingProjectDto[] {
  const minAvailable = parseNum(filter.minAvailable) ?? 0
  const minM = parseNum(filter.minPriceMillion)
  const maxM = parseNum(filter.maxPriceMillion)
  const minArea = parseNum(filter.minArea)
  const maxArea = parseNum(filter.maxArea)
  const q = filter.search.trim().toLowerCase()
  const ward = filter.ward.trim().toLowerCase()

  return projects.filter((p) => {
    const name = (p.projectName || p.name || '').toLowerCase()
    const loc = [p.district, p.ward, p.province, p.address, p.location].filter(Boolean).join(' ').toLowerCase()
    if (q && !name.includes(q) && !loc.includes(q) && !(p.description ?? '').toLowerCase().includes(q)) return false

    if (p.province && p.province !== HCM_PROVINCE) return false
    if (ward) {
      const pw = (p.ward || '').toLowerCase()
      const pd = (p.district || '').toLowerCase()
      // Exact match — đồng bộ CRUD lưu District = Ward = tên phường v2
      if (pw !== ward && pd !== ward && !loc.includes(ward)) return false
    }

    const minP = p.minPrice ?? 0
    const maxP = p.maxPrice ?? minP
    if (minM != null) {
      const targetMin = minM * 1_000_000
      if (maxP > 0 && maxP < targetMin) return false
    }
    if (maxM != null) {
      const targetMax = maxM * 1_000_000
      if (minP > 0 && minP > targetMax) return false
    }

    const minA = p.minArea ?? 0
    const maxA = p.maxArea ?? minA
    if (minArea != null && maxA > 0 && maxA < minArea) return false
    if (maxArea != null && minA > 0 && minA > maxArea) return false

    if (p.availableUnits != null && p.availableUnits < minAvailable) return false

    const effective = effectiveProjectStatus(p)
    const rawStatus = (p.status || '').toUpperCase()

    if (!filter.statusCode && !filter.statusId && !options?.allowUnapproved) {
      if (effective === 'PENDING' || effective === 'REJECTED') return false
    }

    if (filter.statusId && p.housingProjectStatusId !== filter.statusId) return false
    if (filter.statusCode) {
      const want = filter.statusCode.toUpperCase()
      if (want === 'OPEN' || want === 'OPEN_FOR_REGISTRATION') {
        if (effective !== 'OPEN' && !matchesOpenStatus(p.status || '')) return false
      } else if (want === 'UPCOMING') {
        if (effective !== 'UPCOMING' && !/upcoming|sắp mở/i.test(p.status || '')) return false
      } else if (want === 'CLOSED') {
        if (effective !== 'CLOSED' && effective !== 'FULL' && !/closed|đã đóng|đóng đăng ký|hết căn/i.test(p.status || '')) return false
      } else if (want === 'PENDING') {
        if (effective !== 'PENDING' && !/pending|chờ|thẩm định|nháp/i.test(p.status || '')) return false
      } else if (want === 'REJECTED') {
        if (effective !== 'REJECTED' && !/reject|từ chối/i.test(p.status || '')) return false
      } else {
        if (effective !== want && !rawStatus.includes(want)) return false
      }
    }

    return true
  })
}

export function sortHousingProjects(
  projects: HousingProjectDto[],
  sort: HousingSortKey = 'default',
): HousingProjectDto[] {
  if (sort === 'default') return projects
  const list = [...projects]
  switch (sort) {
    case 'price_asc':
      return list.sort((a, b) => (a.minPrice ?? 0) - (b.minPrice ?? 0))
    case 'price_desc':
      return list.sort((a, b) => (b.minPrice ?? 0) - (a.minPrice ?? 0))
    case 'units_desc':
      return list.sort((a, b) => (b.availableUnits ?? 0) - (a.availableUnits ?? 0))
    default:
      return list
  }
}

export function countActiveFilters(filter: HousingSearchFilter): number {
  let n = 0
  if (filter.search.trim()) n++
  if (filter.ward.trim()) n++
  if (filter.minPriceMillion.trim()) n++
  if (filter.maxPriceMillion.trim()) n++
  if (filter.minArea.trim()) n++
  if (filter.maxArea.trim()) n++
  if (filter.minAvailable.trim()) n++
  if (filter.statusId.trim() || filter.statusCode.trim()) n++
  if (filter.sort && filter.sort !== 'default') n++
  return n
}
