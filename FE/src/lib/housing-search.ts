import type { HousingProjectFilter } from '@/api/housing-projects'
import type { HousingProjectDto } from '@/types'
import type { RouteId } from '@/router'

export interface HousingSearchFilter {
  search: string
  province: string
  district: string
  minPriceMillion: string
  maxPriceMillion: string
  minArea: string
  maxArea: string
  minAvailable: string
  statusId: string
}

export const EMPTY_HOUSING_SEARCH: HousingSearchFilter = {
  search: '',
  province: '',
  district: '',
  minPriceMillion: '',
  maxPriceMillion: '',
  minArea: '',
  maxArea: '',
  minAvailable: '',
  statusId: '',
}

const QUERY_KEYS: Record<keyof HousingSearchFilter, string> = {
  search: 'q',
  province: 'tinh',
  district: 'huyen',
  minPriceMillion: 'giaTu',
  maxPriceMillion: 'giaDen',
  minArea: 'dtTu',
  maxArea: 'dtDen',
  minAvailable: 'can',
  statusId: 'trangThai',
}

export function parseHousingSearchFromHash(): HousingSearchFilter {
  const hash = location.hash.replace(/^#\/?/, '')
  const qIdx = hash.indexOf('?')
  if (qIdx < 0) return { ...EMPTY_HOUSING_SEARCH }

  const params = new URLSearchParams(hash.slice(qIdx + 1))
  const read = (key: keyof HousingSearchFilter) => params.get(QUERY_KEYS[key]) ?? ''

  return {
    search: read('search'),
    province: read('province'),
    district: read('district'),
    minPriceMillion: read('minPriceMillion'),
    maxPriceMillion: read('maxPriceMillion'),
    minArea: read('minArea'),
    maxArea: read('maxArea'),
    minAvailable: read('minAvailable'),
    statusId: read('statusId'),
  }
}

export function navigateToHousingSearch(filter: HousingSearchFilter, route: RouteId = 'tim-nha') {
  const params = new URLSearchParams()
  for (const [field, key] of Object.entries(QUERY_KEYS) as [keyof HousingSearchFilter, string][]) {
    const value = filter[field]?.trim()
    if (value) params.set(key, value)
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
    province: filter.province || undefined,
    district: filter.district || undefined,
    minPrice: minM != null ? minM * 1_000_000 : undefined,
    maxPrice: maxM != null ? maxM * 1_000_000 : undefined,
    minArea: parseNum(filter.minArea),
    maxArea: parseNum(filter.maxArea),
    statusId: filter.statusId || undefined,
  }
}

export function applyClientFilters(projects: HousingProjectDto[], filter: HousingSearchFilter): HousingProjectDto[] {
  const minAvailable = parseNum(filter.minAvailable) ?? 0
  const minM = parseNum(filter.minPriceMillion)
  const maxM = parseNum(filter.maxPriceMillion)
  const minArea = parseNum(filter.minArea)
  const maxArea = parseNum(filter.maxArea)
  const q = filter.search.trim().toLowerCase()

  return projects.filter((p) => {
    const name = (p.projectName || p.name || '').toLowerCase()
    const loc = [p.district, p.province, p.address, p.location].filter(Boolean).join(' ').toLowerCase()
    if (q && !name.includes(q) && !loc.includes(q) && !(p.description ?? '').toLowerCase().includes(q)) return false

    if (filter.province && p.province !== filter.province) return false
    if (filter.district && p.district !== filter.district) return false

    const price = p.maxPrice ?? p.minPrice ?? 0
    if (minM != null && price > 0 && price < minM * 1_000_000) return false
    if (maxM != null && price > maxM * 1_000_000) return false

    const area = p.maxArea ?? p.minArea ?? 0
    if (minArea != null && area > 0 && area < minArea) return false
    if (maxArea != null && area > maxArea) return false

    if (p.availableUnits != null && p.availableUnits < minAvailable) return false
    if (filter.statusId && p.housingProjectStatusId !== filter.statusId) return false

    return true
  })
}

export function countActiveFilters(filter: HousingSearchFilter): number {
  return Object.values(filter).filter((v) => v.trim()).length
}
