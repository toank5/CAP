import type { ApartmentDto } from '@/types'

/** BE đôn waitlist cho 48 giờ xác nhận cọc (không mở lại đợt bốc thăm). */
export const WAITLIST_CONFIRM_HOURS = 48

export function isPriorityUnit(unitGroup?: string | null): boolean {
  return String(unitGroup ?? '').toUpperCase() === 'PRIORITY'
}

export function sortByHighestScore<T extends { priorityScore?: number; submittedAt?: string }>(
  apps: T[],
): T[] {
  return [...apps].sort((a, b) => {
    const d = (b.priorityScore ?? 0) - (a.priorityScore ?? 0)
    if (d !== 0) return d
    return String(a.submittedAt ?? '').localeCompare(String(b.submittedAt ?? ''))
  })
}

export function splitAvailableUnits(apts: Pick<ApartmentDto, 'unitGroup'>[]): {
  priority: typeof apts
  standard: typeof apts
  priorityCount: number
  standardCount: number
} {
  const priority = apts.filter((a) => isPriorityUnit(a.unitGroup))
  const standard = apts.filter((a) => !isPriorityUnit(a.unitGroup))
  return {
    priority,
    standard,
    priorityCount: priority.length,
    standardCount: standard.length,
  }
}

export function apartmentOptionLabel(apt: ApartmentDto, taken: boolean): string {
  const group = isPriorityUnit(apt.unitGroup) ? 'Ưu tiên' : 'Thường'
  const price = Number(apt.price).toLocaleString('vi-VN')
  return `${apt.unitName} · ${group} · ${apt.area}m² · ${price}đ${taken ? ' (đã chọn)' : ''}`
}
