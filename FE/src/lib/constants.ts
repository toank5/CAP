export const APPLICATION_STATUS: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'danger' | 'secondary' }> = {
  DRAFT: { label: 'Nháp', variant: 'secondary' },
  SUBMITTED: { label: 'Đã nộp', variant: 'default' },
  REVIEWING: { label: 'Đang thẩm định', variant: 'warning' },
  NEED_MORE_DOCUMENTS: { label: 'Cần bổ sung', variant: 'warning' },
  PENDING_SXD_REVIEW: { label: 'Chờ Sở Xây dựng', variant: 'warning' },
  APPROVED: { label: 'Đã phê duyệt', variant: 'success' },
  APPROVED_BY_TIMEOUT: { label: 'Duyệt quá hạn', variant: 'success' },
  DEPOSIT_PENDING: { label: 'Chờ đặt cọc', variant: 'warning' },
  CONTRACT_PENDING: { label: 'Chờ ký hợp đồng', variant: 'warning' },
  CONTRACTING: { label: 'Đang ký hợp đồng', variant: 'warning' },
  CONTRACT_SIGNED: { label: 'Đã ký hợp đồng', variant: 'success' },
  DEPOSIT_PAID: { label: 'Đã đóng Đợt 1', variant: 'success' },
  INSTALLMENT_IN_PROGRESS: { label: 'Đang thanh toán', variant: 'warning' },
  PARTIALLY_PAID: { label: 'Thanh toán một phần', variant: 'warning' },
  PAID: { label: 'Đã thanh toán đủ', variant: 'success' },
  FULLY_PAID: { label: 'Đã thanh toán đủ', variant: 'success' },
  REJECTED: { label: 'Từ chối', variant: 'danger' },
  CANCELED: { label: 'Đã hủy', variant: 'secondary' },
  EXPIRED: { label: 'Hết hạn', variant: 'danger' },
  LOTTERY_WON: { label: 'Trúng bốc thăm', variant: 'success' },
  LOTTERY_LOST: { label: 'Không trúng bốc thăm', variant: 'danger' },
  LOTTERY_PENDING: { label: 'Chờ bốc thăm', variant: 'warning' },
  LOTTERY_WAITING: { label: 'Chờ bốc thăm', variant: 'warning' },
  LOTTERY_IN_PROGRESS: { label: 'Đang bốc thăm', variant: 'warning' },
  LOTTERY_COMPLETED: { label: 'Đã bốc thăm', variant: 'secondary' },
}

export const CLOSED_APPLICATION_STATUSES = ['APPROVED', 'DEPOSIT_PAID', 'REJECTED', 'CANCELED', 'EXPIRED', 'LOTTERY_LOST']

/**
 * Trạng thái hồ sơ ĐANG chạy (chặn tạo mới).
 * Chỉ khi hồ sơ rơi vào nhóm "thất bại" thì mới được tạo mới.
 * Quy tắc:
 *  - Nháp (DRAFT): KHÔNG chặn — user có thể tiếp tục chỉnh nháp cũ hoặc tạo hồ sơ mới.
 *  - Đã nộp / đang thẩm định / chờ SXD / chờ đặt cọc / chờ ký HĐ / đang ký / đang thanh toán: CHẶN.
 *  - Trượt duyệt (REJECTED) / Trượt bốc thăm (LOTTERY_LOST) / Đã hủy (CANCELED): CHO PHÉP tạo mới.
 *  - Hết hạn (EXPIRED): CHO PHÉP tạo mới.
 *  - Đã duyệt / Đã ký HĐ / Đã thanh toán: CHẶN (đã trúng suất rồi).
 */
export const BLOCKING_APPLICATION_STATUSES = [
  'SUBMITTED',
  'REVIEWING',
  'NEED_MORE_DOCUMENTS',
  'PENDING_SXD_REVIEW',
  'APPROVED',
  'APPROVED_BY_TIMEOUT',
  'DEPOSIT_PENDING',
  'CONTRACT_PENDING',
  'CONTRACTING',
  'CONTRACT_SIGNED',
  'DEPOSIT_PAID',
  'INSTALLMENT_IN_PROGRESS',
  'PARTIALLY_PAID',
  'PAID',
  'FULLY_PAID',
] as const

/**
 * Quyết định user có được tạo hồ sơ mới hay không, dựa trên danh sách trạng thái
 * các hồ sơ hiện có. Nếu bất kỳ hồ sơ nào ở trạng thái chặn, trả false.
 */
export function canCreateNewApplication(existingStatuses: Array<string | null | undefined>): boolean {
  if (!existingStatuses || existingStatuses.length === 0) return true
  return !existingStatuses.some((s) => s && BLOCKING_APPLICATION_STATUSES.includes(s as never))
}

/** Trạng thái kết thúc (Applicant không thể cancel/edit). */
export function isClosedStatus(status: string | null | undefined): boolean {
  if (!status) return false
  return CLOSED_APPLICATION_STATUSES.includes(status)
}

export const DOC_TYPE_LABELS: Record<string, string> = {
  HOUSING_CONDITION_PROOF: 'Giấy chứng nhận thực trạng nhà ở',
  POVERTY_HOUSEHOLD_CERTIFICATE: 'Giấy chứng nhận hộ nghèo/cận nghèo',
  MERIT_PERSON_CERTIFICATE: 'Giấy xác nhận người có công với cách mạng',
  LOW_INCOME_CERTIFICATE: 'Giấy xác nhận thu nhập thấp tại đô thị',
  EMPLOYMENT_CERTIFICATE: 'Giấy xác nhận đang làm việc tại DN/HTX/KCN',
  MILITARY_SERVICE_CERTIFICATE: 'Giấy xác nhận phục vụ lực lượng vũ trang/cơ yếu',
  CIVIL_SERVANT_CERTIFICATE: 'Giấy xác nhận cán bộ/công chức/viên chức',
  PUBLIC_HOUSING_RETURN_CERTIFICATE: 'Văn bản trả lại nhà ở công vụ',
  LAND_RECOVERY_DECISION: 'Quyết định thu hồi đất/giải tỏa nhà ở',
  INCOME_CERTIFICATE: 'Giấy xác nhận thu nhập',
  RESIDENCE_CONFIRMATION: 'Giấy xác nhận nơi cư trú',
  SINGLE_STATUS_CERTIFICATE: 'Giấy xác nhận tình trạng hôn nhân/độc thân',
  MARRIAGE_CERTIFICATE: 'Giấy chứng nhận kết hôn',
}

export const HOUSING_STATUS_LABELS: Record<string, string> = {
  NO_HOUSE: 'Chưa có nhà ở',
  SMALL_HOUSE: 'Nhà diện tích dưới 15m²',
}

export const ROLE_OPTIONS = [
  { value: 'Applicant', label: 'Người dùng' },
  { value: 'Department Of Construction', label: 'Sở Xây dựng' },
  { value: 'Housing Developer', label: 'Chủ đầu tư' },
] as const

export const FLASH_CREATE_PROJECT_KEY = 'flashCreateProjectSuccess'
export const FLASH_DELETE_PROJECT_KEY = 'flashDeleteProjectSuccess'

/**
 * Map priorityGroup → danh sách giấy tờ bắt buộc khi submit.
 * Đồng bộ với BE DocumentTypeConstants.GetRequiredTypesForSubmit + PriorityGroupConstants.
 */
export const REQUIRED_DOCS_BY_PRIORITY_GROUP: Record<string, string[]> = {
  // Hộ nghèo/cận nghèo: chỉ cần giấy hộ nghèo
  RURAL_POOR: ['HOUSING_CONDITION_PROOF', 'POVERTY_HOUSEHOLD_CERTIFICATE'],
  RURAL_NEAR_POOR: ['HOUSING_CONDITION_PROOF', 'POVERTY_HOUSEHOLD_CERTIFICATE'],
  URBAN_POOR: ['HOUSING_CONDITION_PROOF', 'POVERTY_HOUSEHOLD_CERTIFICATE'],
  URBAN_NEAR_POOR: ['HOUSING_CONDITION_PROOF', 'POVERTY_HOUSEHOLD_CERTIFICATE'],
  // Người có công: giấy người có công (không cần hộ nghèo/thu nhập)
  MERIT_PERSON: ['HOUSING_CONDITION_PROOF', 'MERIT_PERSON_CERTIFICATE'],
  // Nhóm có trần thu nhập: giấy chứng minh đối tượng + giấy xác nhận thu nhập
  LOW_INCOME_URBAN: ['HOUSING_CONDITION_PROOF', 'LOW_INCOME_CERTIFICATE', 'INCOME_CERTIFICATE'],
  WORKER: ['HOUSING_CONDITION_PROOF', 'EMPLOYMENT_CERTIFICATE', 'INCOME_CERTIFICATE'],
  MILITARY_PERSONNEL: ['HOUSING_CONDITION_PROOF', 'MILITARY_SERVICE_CERTIFICATE', 'INCOME_CERTIFICATE'],
  CIVIL_SERVANT: ['HOUSING_CONDITION_PROOF', 'CIVIL_SERVANT_CERTIFICATE', 'INCOME_CERTIFICATE'],
  PUBLIC_HOUSING_RETURN: ['HOUSING_CONDITION_PROOF', 'PUBLIC_HOUSING_RETURN_CERTIFICATE', 'INCOME_CERTIFICATE'],
  LAND_RECOVERY_AFFECTED: ['HOUSING_CONDITION_PROOF', 'LAND_RECOVERY_DECISION', 'INCOME_CERTIFICATE'],
}

export function getRequiredDocsForPriorityGroup(priorityGroup: string): string[] {
  return REQUIRED_DOCS_BY_PRIORITY_GROUP[priorityGroup] ?? ['HOUSING_CONDITION_PROOF']
}

export const DIRECTION_LABELS: Record<string, string> = {
  EAST: 'Đông',
  WEST: 'Tây',
  SOUTH: 'Nam',
  NORTH: 'Bắc',
  SOUTH_EAST: 'Đông Nam',
  NORTH_EAST: 'Đông Bắc',
  SOUTH_WEST: 'Tây Nam',
  NORTH_WEST: 'Tây Bắc',
}

