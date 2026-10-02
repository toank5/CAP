import { ApiError } from '@/api/http'

const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const COOLDOWN_KEY = 'ekyc_ocr_cooldown_until'

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo']

export function isRateLimitError(err: unknown): boolean {
  if (!(err instanceof ApiError)) return false
  if (err.status === 429) return true
  const text = JSON.stringify(err.body ?? err.message).toLowerCase()
  return text.includes('rate limit') || text.includes('429')
}

export function isEkycGatewayError(err: unknown): boolean {
  return err instanceof ApiError && (err.status === 502 || err.status === 503)
}

export function setOcrCooldown(minutes = 30) {
  localStorage.setItem(COOLDOWN_KEY, String(Date.now() + minutes * 60 * 1000))
}

export function getOcrCooldownRemainingMs(): number {
  const raw = localStorage.getItem(COOLDOWN_KEY)
  if (!raw) return 0
  const until = Number(raw)
  if (!until || until <= Date.now()) {
    localStorage.removeItem(COOLDOWN_KEY)
    return 0
  }
  return until - Date.now()
}

export function formatCooldown(ms: number): string {
  const totalSec = Math.ceil(ms / 1000)
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  if (min <= 0) return `${sec} giây`
  return sec > 0 ? `${min} phút ${sec} giây` : `${min} phút`
}

export function isTokenExpiredError(err: unknown): boolean {
  if (!(err instanceof ApiError)) return false
  const b = err.body as { detail?: string; message?: string; errorCode?: string } | null
  if (b?.errorCode === 'EKYC_TOKEN_EXPIRED') return true
  const text = JSON.stringify(err.body ?? err.message).toLowerCase()
  return (
    text.includes('ekyc_token_expired') ||
    text.includes('accesstoken vnpt') ||
    (text.includes('token') && (text.includes('hết hạn') || text.includes('expired'))) ||
    (text.includes('key') && (text.includes('hết hạn') || text.includes('expired')))
  )
}

export function formatEkycError(err: unknown): string {
  if (isTokenExpiredError(err)) {
    return 'Dịch vụ xác thực CCCD (VNPT eKYC) tạm thời gián đoạn do khóa truy cập (Token/Key) đã hết hạn. Vui lòng liên hệ quản trị viên cập nhật Token mới, hoặc chọn "Nhập tay thông tin" bên dưới để tiếp tục.'
  }
  if (isRateLimitError(err)) {
    setOcrCooldown(30)
    return 'Dịch vụ quét CCCD (VNPT eKYC) tạm thời giới hạn số lần gọi (HTTP 429). Vui lòng đợi khoảng 30 phút rồi thử lại, hoặc chọn "Nhập tay thông tin" bên dưới để tiếp tục.'
  }
  if (err instanceof ApiError) {
    if (err.status === 409) {
      return 'Số CCCD này đã được xác thực bởi tài khoản khác. Vui lòng dùng CCCD khác hoặc liên hệ quản trị.'
    }
    if (err.status === 502 || err.status === 503) {
      const b = err.body as { detail?: string; message?: string; errorCode?: string } | null
      const detail = b?.detail ?? b?.message
      if (
        b?.errorCode === 'EKYC_TOKEN_EXPIRED' ||
        (detail && (detail.toLowerCase().includes('token') || detail.toLowerCase().includes('accesstoken') || detail.toLowerCase().includes('hết hạn')))
      ) {
        return 'Dịch vụ xác thực CCCD (VNPT eKYC) tạm thời gián đoạn do khóa truy cập (Token/Key) đã hết hạn. Vui lòng liên hệ quản trị viên cập nhật Token mới, hoặc chọn "Nhập tay thông tin" bên dưới để tiếp tục.'
      }
      return detail
        ? `Không kết nối được dịch vụ VNPT eKYC: ${detail}`
        : 'Không kết nối được dịch vụ VNPT eKYC. Kiểm tra backend đang chạy và kết nối mạng, hoặc chọn "Nhập tay thông tin" bên dưới.'
    }
    if (err.status === 400) {
      const b = err.body as { message?: string } | null
      return b?.message ?? 'File ảnh/video không hợp lệ. Dùng JPEG/PNG ≤ 5MB (video MP4/WebM).'
    }
  }
  if (err instanceof ApiError) {
    const b = err.body as { message?: string; detail?: string } | null
    if (b?.message) return b.message
    if (b?.detail) return b.detail
    return err.message
  }
  if (err instanceof Error) return err.message
  return 'Đã xảy ra lỗi. Vui lòng thử lại.'
}

export function validateIdImage(file: File): string | null {
  if (!IMAGE_TYPES.includes(file.type)) return 'Ảnh CCCD phải là JPEG, PNG hoặc WebP.'
  if (file.size > MAX_IMAGE_BYTES) return 'Ảnh CCCD tối đa 5 MB.'
  if (file.size < 10_000) return 'Ảnh quá nhỏ hoặc không đọc được. Chọn ảnh rõ hơn.'
  return null
}

export function validateSelfieImage(file: File): string | null {
  return validateIdImage(file)
}

export function validateLivenessVideo(file: File): string | null {
  if (!VIDEO_TYPES.some((t) => file.type === t || file.type.startsWith('video/'))) {
    return 'Video liveness phải là MP4, WebM hoặc MOV.'
  }
  if (file.size > MAX_IMAGE_BYTES * 4) return 'Video tối đa khoảng 20 MB.'
  return null
}

export function isValidCitizenId(value: string): boolean {
  return /^\d{9}(\d{3})?$/.test(value.trim())
}

export const MAX_DOC_BYTES = 10 * 1024 * 1024
/** Tất cả doc types mà Applicant có thể upload — đồng bộ với BE DocumentTypeConstants.AllowedApplicantDocumentTypes */
export const ALL_DOCUMENT_TYPES = [
  'HOUSING_CONDITION_PROOF',
  'POVERTY_HOUSEHOLD_CERTIFICATE',
  'MERIT_PERSON_CERTIFICATE',
  'LOW_INCOME_CERTIFICATE',
  'EMPLOYMENT_CERTIFICATE',
  'MILITARY_SERVICE_CERTIFICATE',
  'CIVIL_SERVANT_CERTIFICATE',
  'PUBLIC_HOUSING_RETURN_CERTIFICATE',
  'LAND_RECOVERY_DECISION',
  'INCOME_CERTIFICATE',
] as const

export const DOC_TYPE_KEYS = ['HOUSING_CONDITION_PROOF', 'POVERTY_HOUSEHOLD_CERTIFICATE'] as const
export type DocTypeKey = (typeof ALL_DOCUMENT_TYPES)[number]

export function validateDocumentFile(file: File): string | null {
  const ok = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
  if (!ok) return 'Tài liệu phải là file PDF.'
  if (file.size > MAX_DOC_BYTES) return 'File PDF tối đa 10 MB.'
  if (file.size < 200) return 'File quá nhỏ, vui lòng chọn file hợp lệ.'
  return null
}
