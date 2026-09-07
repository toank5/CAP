import type { ApartmentDto } from '@/types'

/**
 * Hạn xác nhận mặc định khi được đôn từ Danh sách dự bị, chỉ dùng cho câu mô tả nghiệp vụ.
 * Giá trị quyết định nằm ở PolicyConfig WAITLIST_CONFIRM_HOURS trên backend và admin sửa được;
 * hạn thực tế của từng hồ sơ luôn lấy từ `depositDeadline` do backend trả về, không tự tính lại.
 */
export const WAITLIST_CONFIRM_HOURS_DEFAULT = 48

export function isPriorityUnit(unitGroup?: string | null): boolean {
  return String(unitGroup ?? '').toUpperCase() === 'PRIORITY'
}

/**
 * Hồ sơ này có được nhận căn này không — bản sao của ApartmentAssignmentGate ở backend,
 * dùng để lọc dropdown chọn căn. Backend vẫn là nơi chặn thật; đây chỉ để cán bộ không phải
 * chọn thử rồi nhận lỗi.
 *
 * Hai ràng buộc: đúng loại căn đã đăng ký nguyện vọng (vì suất trúng đếm theo từng loại căn),
 * và quỹ căn ưu tiên chỉ dành cho hồ sơ thuộc nhóm ưu tiên. Ràng buộc ưu tiên là một chiều —
 * người ưu tiên vẫn được nhận căn tiêu chuẩn, vì quỹ ưu tiên là mức sàn dành riêng chứ không phải mức trần.
 */
export function isAssignableUnit(
  app: { desiredApartmentTypeId?: string | null; priorityGroup?: string | null },
  apt: Pick<ApartmentDto, 'unitGroup' | 'apartmentTypeId'>,
): boolean {
  if (app.desiredApartmentTypeId && apt.apartmentTypeId
    && app.desiredApartmentTypeId !== apt.apartmentTypeId) {
    return false
  }
  if (isPriorityUnit(apt.unitGroup) && !String(app.priorityGroup ?? '').trim()) {
    return false
  }
  return true
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
  const type = apt.apartmentTypeLabel || apt.apartmentType || 'chưa gắn loại'
  const price = Number(apt.price).toLocaleString('vi-VN')
  return `${apt.unitName} · ${group} · ${type} · ${apt.area}m² · ${price}đ${taken ? ' (đã chọn)' : ''}`
}
