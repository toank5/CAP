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

/** Nhãn tiếng Việt cho khóa PolicyConfig (không hiện mã BE trên UI admin). */
export type PolicyValueKind = 'number' | 'money' | 'bool' | 'rate' | 'hours' | 'days'

export const POLICY_META_VI: Record<string, {
  title: string
  hint: string
  unit?: string
  kind: PolicyValueKind
}> = {
  MAX_AREA_PER_PERSON_M2: {
    title: 'Diện tích nhà ở bình quân tối đa mỗi người',
    hint: 'Hộ đã có nhà nhưng diện tích sàn mỗi người thấp hơn mức này vẫn đủ điều kiện.',
    unit: 'm²',
    kind: 'number',
  },
  INCOME_SINGLE_MAX_VND: {
    title: 'Thu nhập tháng tối đa — người độc thân',
    hint: 'Trần thu nhập để được hưởng chính sách nhà ở xã hội.',
    unit: 'đồng',
    kind: 'money',
  },
  INCOME_MARRIED_MAX_VND: {
    title: 'Thu nhập tháng tối đa — vợ và chồng',
    hint: 'Tổng thu nhập hai vợ chồng không được vượt mức này.',
    unit: 'đồng',
    kind: 'money',
  },
  INCOME_MILITARY_SINGLE_MAX_VND: {
    title: 'Thu nhập tháng tối đa — sĩ quan, chiến sĩ (độc thân)',
    hint: 'Trần thu nhập riêng cho đối tượng lực lượng vũ trang.',
    unit: 'đồng',
    kind: 'money',
  },
  INCOME_MILITARY_MARRIED_MAX_VND: {
    title: 'Thu nhập tháng tối đa — sĩ quan, chiến sĩ (đã kết hôn)',
    hint: 'Tổng thu nhập vợ chồng đối với lực lượng vũ trang.',
    unit: 'đồng',
    kind: 'money',
  },
  INTAKE_MIN_DAYS: {
    title: 'Thời gian mở nhận hồ sơ tối thiểu',
    hint: 'Số ngày dự án phải mở để người dân nộp hồ sơ.',
    unit: 'ngày',
    kind: 'days',
  },
  PUBLIC_ANNOUNCE_MIN_DAYS: {
    title: 'Thời gian công bố trước khi nhận hồ sơ',
    hint: 'Số ngày phải công khai thông tin dự án trước ngày mở nhận hồ sơ.',
    unit: 'ngày',
    kind: 'days',
  },
  WAITLIST_CONFIRM_HOURS: {
    title: 'Thời hạn xác nhận khi được đôn từ danh sách chờ',
    hint: 'Người được đôn suất phải xác nhận trong khoảng thời gian này.',
    unit: 'giờ',
    kind: 'hours',
  },
  TACIT_APPROVAL_DAYS: {
    title: 'Thời hạn Sở Xây dựng xét hồ sơ',
    hint: 'Quá thời hạn này mà Sở không phản hồi thì hệ thống tự ghi nhận đã duyệt.',
    unit: 'ngày',
    kind: 'days',
  },
  SXD_CROSSCHECK_SILENCE_DAYS: {
    title: 'Thời hạn Sở đối soát danh sách',
    hint: 'Số ngày Sở không phản hồi sau khi nhận danh sách chính thức.',
    unit: 'ngày',
    kind: 'days',
  },
  CONTRACT_SIGNING_DEADLINE_DAYS: {
    title: 'Thời hạn ký hợp đồng sau khi được cấp căn',
    hint: 'Người dân phải ký hợp đồng trong số ngày này kể từ khi đủ điều kiện.',
    unit: 'ngày',
    kind: 'days',
  },
  DEPOSIT_PAYMENT_HOURS: {
    title: 'Thời hạn đóng tiền đợt 1 (cọc)',
    hint: 'Số giờ phải thanh toán đợt 1 sau khi được cấp căn.',
    unit: 'giờ',
    kind: 'hours',
  },
  ONE_APPLICATION_PER_APPLICANT: {
    title: 'Mỗi người chỉ được một hồ sơ đang chạy',
    hint: 'Bật thì không cho nộp hồ sơ mới khi còn hồ sơ chưa kết thúc.',
    kind: 'bool',
  },
  LATE_PAYMENT_PENALTY_DAILY_RATE: {
    title: 'Lãi phạt chậm nộp mỗi ngày',
    hint: 'Tỷ lệ tính trên số tiền đợt còn nợ, áp theo ngày.',
    unit: '%/ngày',
    kind: 'rate',
  },
}

export function policyTitle(name: string): string {
  return POLICY_META_VI[name]?.title ?? name
}

export function formatPolicyValue(name: string, raw: string): string {
  const meta = POLICY_META_VI[name]
  const kind = meta?.kind ?? 'number'
  const trimmed = String(raw ?? '').trim()
  if (kind === 'bool') {
    return /^(true|1|yes)$/i.test(trimmed) ? 'Có' : 'Không'
  }
  if (kind === 'money') {
    const n = Number(trimmed)
    if (!Number.isFinite(n)) return trimmed
    return `${n.toLocaleString('vi-VN')} đồng`
  }
  if (kind === 'rate') {
    const n = Number(trimmed)
    if (!Number.isFinite(n)) return trimmed
    return `${(n * 100).toLocaleString('vi-VN', { maximumFractionDigits: 4 })}%/ngày`
  }
  if (kind === 'hours') return `${trimmed} giờ`
  if (kind === 'days') return `${trimmed} ngày`
  if (meta?.unit) return `${trimmed} ${meta.unit}`
  return trimmed
}
