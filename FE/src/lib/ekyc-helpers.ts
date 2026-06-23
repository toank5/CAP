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

export function formatEkycError(err: unknown): string {
  if (isRateLimitError(err)) {
    setOcrCooldown(30)
    return 'Dịch vụ OCR FPT AI tạm thời giới hạn số lần gọi (HTTP 429). Vui lòng đợi khoảng 30 phút rồi thử lại, hoặc chọn "Nhập tay thông tin" bên dưới để tiếp tục (vẫn cần ảnh CCCD cho bước xác thực khuôn mặt).'
  }
  if (err instanceof ApiError) {
    if (err.status === 409) {
      return 'Số CCCD này đã được xác thực bởi tài khoản khác. Vui lòng dùng CCCD khác hoặc liên hệ quản trị.'
    }
    if (err.status === 502 || err.status === 503) {
      const b = err.body as { detail?: string; message?: string } | null
      const detail = b?.detail ?? b?.message
      return detail
        ? `Không kết nối được dịch vụ FPT AI: ${detail}`
        : 'Không kết nối được dịch vụ FPT AI. Kiểm tra backend đang chạy và kết nối mạng.'
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
  return /^\d{12}$/.test(value.trim())
}
