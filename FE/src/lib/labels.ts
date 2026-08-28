import { APPLICATION_STATUS } from '@/lib/constants'

/** Trạng thái dự án nhà ở (theo mã hoặc tên từ BE/DB) */
export const PROJECT_STATUS_VI: Record<string, string> = {
  PENDING: 'Chờ phê duyệt',
  UPCOMING: 'Sắp mở bán',
  OPEN: 'Đang mở đăng ký',
  CLOSED: 'Đã đóng đăng ký',
  FULL: 'Đã hết suất',
  REJECTED: 'Bị từ chối',
  Pending: 'Chờ phê duyệt',
  Upcoming: 'Sắp mở bán',
  Open: 'Đang mở đăng ký',
  Closed: 'Đã đóng đăng ký',
  Full: 'Đã hết suất',
  Rejected: 'Bị từ chối',
}

export function labelProjectStatus(value?: string | null): string {
  if (!value?.trim()) return 'Chưa xác định'
  const key = value.trim()
  return PROJECT_STATUS_VI[key] ?? PROJECT_STATUS_VI[key.toUpperCase()] ?? key
}

/** Trạng thái thanh toán VNPay */
export const PAYMENT_STATUS_VI: Record<string, string> = {
  Success: 'Thành công',
  Pending: 'Đang chờ',
  Failed: 'Thất bại',
  Cancelled: 'Đã hủy',
}

export function labelPaymentStatus(value?: string | null): string {
  if (!value?.trim()) return 'Không rõ'
  return PAYMENT_STATUS_VI[value] ?? PAYMENT_STATUS_VI[value.trim()] ?? value
}

export function paymentStatusBadge(value?: string | null): {
  text: string
  variant: 'success' | 'warning' | 'danger' | 'secondary'
} {
  switch (value) {
    case 'Success': return { text: 'Thành công', variant: 'success' }
    case 'Pending': return { text: 'Đang chờ', variant: 'warning' }
    case 'Cancelled': return { text: 'Đã hủy', variant: 'secondary' }
    case 'Failed': return { text: 'Thất bại', variant: 'danger' }
    default: return { text: labelPaymentStatus(value), variant: 'secondary' }
  }
}

/** Vai trò người dùng */
export const ROLE_LABELS_VI: Record<string, string> = {
  Applicant: 'Người dùng',
  'Housing Authority Officer': 'Cán bộ nhà ở',
  'System Administrator': 'Quản trị hệ thống',
  'Department Of Construction': 'Sở Xây dựng',
  'Housing Developer': 'Chủ đầu tư',
}

export function labelRole(value?: string | null): string {
  if (!value?.trim()) return '—'
  return ROLE_LABELS_VI[value] ?? value
}

/** Trạng thái tài khoản cán bộ */
export const STAFF_STATUS_VI: Record<string, string> = {
  Active: 'Đang hoạt động',
  Inactive: 'Ngừng hoạt động',
  Suspended: 'Tạm khóa',
}

export function labelStaffStatus(value?: string | null): string {
  if (!value?.trim()) return '—'
  return STAFF_STATUS_VI[value] ?? value
}

/** Hành động xét duyệt hồ sơ */
export const REVIEW_ACTION_VI: Record<string, string> = {
  APPROVE: 'Phê duyệt',
  REJECT: 'Từ chối',
  REQUEST_MORE_DOCUMENTS: 'Yêu cầu bổ sung hồ sơ',
  ASSIGN_OFFICER: 'Nhận hồ sơ thẩm định',
  SUBMIT: 'Nộp hồ sơ',
  SAVE_DRAFT: 'Lưu nháp',
  PAYMENT_TIMEOUT: 'Hết hạn thanh toán',
  DEPOSIT_PAYMENT: 'Thanh toán Đợt 1',
  CANCEL: 'Tự hủy',
  SUBMIT_TO_DEPARTMENT: 'Gửi Sở Xây dựng',
  TACIT_APPROVAL: 'Tự động phê duyệt (20 ngày)',
}

export function labelReviewAction(value?: string | null): string {
  if (!value?.trim()) return '—'
  return REVIEW_ACTION_VI[value] ?? value
}

/** Trạng thái hồ sơ đăng ký */
export function labelApplicationStatus(status: string): string {
  if (!status) return '—'
  const key = status.trim()
  return APPLICATION_STATUS[key]?.label ?? APPLICATION_STATUS[key.toUpperCase()]?.label ?? status
}

/** Trạng thái xác minh tài liệu */
export const DOCUMENT_VERIFICATION_VI: Record<string, string> = {
  PENDING: 'Chờ xác minh',
  VERIFIED: 'Đã xác minh',
  REJECTED: 'Không hợp lệ',
}

export function labelDocumentVerification(value?: string | null): string {
  if (!value?.trim()) return '—'
  return DOCUMENT_VERIFICATION_VI[value] ?? value
}
