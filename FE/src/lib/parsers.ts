import { labelProjectStatus } from '@/lib/labels'
import type { ApplicationSummaryDto, HousingProjectDto, WishlistItemDto } from '@/types'

export function countFromPaged(data: unknown): number {
  if (!data || typeof data !== 'object') return 0
  const o = data as Record<string, unknown>
  if (typeof o.totalCount === 'number') return o.totalCount
  if (typeof o.TotalCount === 'number') return o.TotalCount
  const nested = o.data ?? o.Data
  if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
    const inner = nested as Record<string, unknown>
    if (typeof inner.totalCount === 'number') return inner.totalCount
    if (typeof inner.TotalCount === 'number') return inner.TotalCount
  }
  return extractList(data).length
}

export function extractList(data: unknown): Record<string, unknown>[] {
  if (!data || typeof data !== 'object') return []
  if (Array.isArray(data)) return data as Record<string, unknown>[]

  const o = data as Record<string, unknown>
  const direct = o.items ?? o.Items ?? o.staff ?? o.Staff
  if (Array.isArray(direct)) return direct as Record<string, unknown>[]

  const nested = o.data ?? o.Data
  if (Array.isArray(nested)) return nested as Record<string, unknown>[]
  if (nested && typeof nested === 'object') {
    const inner = nested as Record<string, unknown>
    const innerItems = inner.items ?? inner.Items ?? inner.data ?? inner.Data
    if (Array.isArray(innerItems)) return innerItems as Record<string, unknown>[]
  }

  return []
}

function readProjectRow(p: Record<string, unknown>): HousingProjectDto {
  const images = p.images ?? p.Images
  const firstImage =
    Array.isArray(images) && images.length > 0
      ? String((images[0] as Record<string, unknown>).imageUrl ?? (images[0] as Record<string, unknown>).ImageUrl ?? '')
      : undefined

  const province = String(p.province ?? p.Province ?? '')
  const district = String(p.district ?? p.District ?? '')
  const projectName = String(p.projectName ?? p.ProjectName ?? p.name ?? p.Name ?? '')
  const thumbnail = p.thumbnailUrl ?? p.ThumbnailUrl ?? firstImage

  return {
    id: String(p.id ?? p.Id ?? ''),
    projectName,
    name: projectName,
    description: p.description ? String(p.description ?? p.Description) : undefined,
    province: province || undefined,
    district: district || undefined,
    address: p.address ? String(p.address ?? p.Address) : undefined,
    location: [district, province].filter(Boolean).join(', ') || undefined,
    minPrice: Number(p.minPrice ?? p.MinPrice ?? 0),
    maxPrice: Number(p.maxPrice ?? p.MaxPrice ?? 0),
    minArea: Number(p.minArea ?? p.MinArea ?? 0),
    maxArea: Number(p.maxArea ?? p.MaxArea ?? 0),
    availableUnits: Number(p.availableUnits ?? p.AvailableUnits ?? 0),
    thumbnailUrl: thumbnail ? String(thumbnail) : undefined,
    status: (() => {
      const raw =
        p.status ?? p.Status ??
        p.statusName ?? p.StatusName ??
        p.housingProjectStatusName ?? p.HousingProjectStatusName
      return raw ? labelProjectStatus(String(raw)) : undefined
    })(),
    createdAt: p.createdAt ? String(p.createdAt ?? p.CreatedAt) : undefined,
    updatedAt: p.updatedAt ? String(p.updatedAt ?? p.UpdatedAt) : undefined,
  }
}

export function extractProjects(data: unknown): HousingProjectDto[] {
  return extractList(data).map(readProjectRow).filter((p) => p.id)
}

export function extractSingleProject(data: unknown): HousingProjectDto | null {
  if (!data || typeof data !== 'object') return null
  const o = data as Record<string, unknown>
  const nested = o.data ?? o.Data
  if (nested && typeof nested === 'object') return readProjectRow(nested as Record<string, unknown>)
  if (o.id ?? o.Id ?? o.projectName ?? o.ProjectName) return readProjectRow(o)
  return extractProjects(data)[0] ?? null
}

export function extractWishlistItems(data: unknown): WishlistItemDto[] {
  const rows = extractList(data)
  return rows.map((w) => ({
    wishlistId: String(w.wishlistId ?? w.WishlistId ?? ''),
    projectId: String(w.projectId ?? w.ProjectId ?? ''),
    projectName: String(w.projectName ?? w.ProjectName ?? ''),
    description: w.description ? String(w.description) : undefined,
    province: w.province ? String(w.province) : undefined,
    district: w.district ? String(w.district) : undefined,
    address: w.address ? String(w.address) : undefined,
    minPrice: Number(w.minPrice ?? w.MinPrice ?? 0),
    maxPrice: Number(w.maxPrice ?? w.MaxPrice ?? 0),
    minArea: Number(w.minArea ?? w.MinArea ?? 0),
    maxArea: Number(w.maxArea ?? w.MaxArea ?? 0),
    availableUnits: Number(w.availableUnits ?? w.AvailableUnits ?? 0),
    thumbnailUrl: w.thumbnailUrl ? String(w.thumbnailUrl) : undefined,
    status: w.status ? labelProjectStatus(String(w.status ?? w.Status)) : undefined,
    addedAt: w.addedAt ? String(w.addedAt) : undefined,
  })).filter((w) => w.projectId)
}

export function extractApplicationId(data: unknown): string {
  if (!data || typeof data !== 'object') return ''
  const o = data as Record<string, unknown>
  return String(o.applicationId ?? o.ApplicationId ?? '')
}

export function parseProfile(data: unknown): Record<string, unknown> | null {
  if (!data || typeof data !== 'object') return null
  return data as Record<string, unknown>
}

export function appSummaries(data: unknown): ApplicationSummaryDto[] {
  if (!data || typeof data !== 'object') return []
  const o = data as Record<string, unknown>
  const items = o.items ?? o.Items
  return Array.isArray(items) ? (items as ApplicationSummaryDto[]) : []
}
