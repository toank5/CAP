import { labelProjectStatus } from '@/lib/labels'
import { GOV_IMAGES } from '@/lib/media'
import type { HousingProjectDto } from '@/types'

export interface ProjectCard {
  id: string
  name: string
  location: string
  address: string
  price: string
  units: string
  type: string
  area: string
  status: string
  description: string
  paymentAmount: number
  imageUrl: string
  minPrice: number
  maxPrice: number
  availableUnits: number
}

const baseUrl = import.meta.env.VITE_API_BASE_URL ?? ''

export function resolveProjectImageUrl(url?: string | null): string {
  if (!url) return GOV_IMAGES.heroBanner
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/')) return url
  return `${baseUrl.replace(/\/$/, '')}/${url.replace(/^\//, '')}`
}

export function formatPriceVnd(amount: number): string {
  if (!amount || amount <= 0) return 'Liên hệ'
  if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1).replace(/\.0$/, '')} tỷ`
  if (amount >= 1_000_000) return `${Math.round(amount / 1_000_000).toLocaleString('vi-VN')} triệu`
  return `${amount.toLocaleString('vi-VN')} VNĐ`
}

export function formatPriceRange(min: number, max: number): string {
  if (min > 0 && max > 0 && min !== max) {
    return `${formatPriceVnd(min)} – ${formatPriceVnd(max)}`
  }
  return formatPriceVnd(max || min)
}

export function formatAreaRange(min: number, max: number): string {
  if (min > 0 && max > 0 && min !== max) return `${min}–${max} m²`
  const v = max || min
  return v > 0 ? `${v} m²` : '—'
}

export function depositAmount(minPrice: number): number {
  if (minPrice <= 0) return 100_000
  return Math.min(500_000, Math.max(100_000, Math.round(minPrice * 0.001)))
}

export function mapProjectToCard(p: HousingProjectDto): ProjectCard {
  const minPrice = p.minPrice ?? 0
  const maxPrice = p.maxPrice ?? minPrice
  const minArea = p.minArea ?? 0
  const maxArea = p.maxArea ?? minArea
  const location =
    p.location ||
    [p.district, p.province].filter(Boolean).join(', ') ||
    'Việt Nam'

  return {
    id: p.id ?? '',
    name: p.projectName || p.name || 'Dự án nhà ở',
    location,
    address: p.address || location,
    price: formatPriceRange(minPrice, maxPrice),
    units: `Còn ${p.availableUnits ?? 0} căn`,
    type: 'Nhà ở xã hội',
    area: formatAreaRange(minArea, maxArea),
    status: labelProjectStatus(p.status),
    description: p.description || '',
    paymentAmount: depositAmount(minPrice),
    imageUrl: resolveProjectImageUrl(p.thumbnailUrl || p.imageUrl),
    minPrice,
    maxPrice,
    availableUnits: p.availableUnits ?? 0,
  }
}
