export const APPLICATION_STATUS: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'danger' | 'secondary' }> = {
  DRAFT: { label: 'Nháp', variant: 'secondary' },
  SUBMITTED: { label: 'Đã nộp', variant: 'default' },
  UNDER_REVIEW: { label: 'Đang thẩm định', variant: 'warning' },
  NEED_MORE_DOCUMENTS: { label: 'Cần bổ sung', variant: 'warning' },
  APPROVED: { label: 'Đã duyệt', variant: 'success' },
  REJECTED: { label: 'Từ chối', variant: 'danger' },
}

export const DOC_TYPE_LABELS: Record<string, string> = {
  HOUSING_CONDITION_PROOF: 'Giấy chứng nhận thực trạng nhà ở',
  POVERTY_HOUSEHOLD_CERTIFICATE: 'Giấy chứng nhận hộ nghèo/cận nghèo',
}

export const HOUSING_STATUS_LABELS: Record<string, string> = {
  NO_HOUSE: 'Chưa có nhà ở',
  SMALL_HOUSE: 'Nhà diện tích dưới 15m²',
}

export const ROLE_OPTIONS = [
  { value: 'Applicant', label: 'Người dùng' },
  { value: 'Ward Manager', label: 'Quản lý phường' },
  { value: 'Verification Officer', label: 'Cán bộ thẩm định' },
] as const
