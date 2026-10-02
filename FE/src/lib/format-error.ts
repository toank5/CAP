import { ApiError } from '@/api/http'

function isTechnicalStack(text: string): boolean {
  if (!text) return false
  const lower = text.toLowerCase()
  return (
    lower.includes('system.nullreferenceexception') ||
    lower.includes('microsoft.entityframeworkcore') ||
    lower.includes('dbupdateexception') ||
    lower.includes('sqlexception') ||
    lower.includes('at rhs.') ||
    lower.includes('stack trace') ||
    lower.includes('invalidoperationexception') ||
    lower.includes('internal server error') ||
    (lower.includes('http 500') && !lower.includes('fpt'))
  )
}

function cleanMessage(text: string): string {
  let s = text.trim()
  if (s.startsWith('Error: ')) s = s.slice(7).trim()
  if (s.startsWith('ApiError: ')) s = s.slice(10).trim()
  if (isTechnicalStack(s)) {
    return 'Hệ thống máy chủ gặp sự cố xử lý. Vui lòng thử lại sau hoặc liên hệ quản trị viên.'
  }
  return s
}

export function formatError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status >= 500) {
      return 'Hệ thống máy chủ gặp sự cố (500). Vui lòng thử lại sau hoặc liên hệ quản trị viên.'
    }

    const b = err.body
    if (typeof b === 'string' && b.trim()) {
      return cleanMessage(b)
    }
    if (b && typeof b === 'object') {
      const pd = b as {
        title?: string
        errors?: Record<string, string[]>
        detail?: string
        Detail?: string
        details?: string
        Details?: string
        message?: string
        Message?: string
        error?: string
        Error?: string
        description?: string
        Description?: string
      }
      if (pd.errors) {
        return Object.entries(pd.errors)
          .flatMap(([k, msgs]) => msgs.map((m) => `${k}: ${m}`))
          .join(' · ')
      }

      // BE có thể trả `message` / `error` / `description` (raw object) thay vì ProblemDetails `title`/`detail`.
      const msg =
        (typeof pd.message === 'string' && pd.message) ||
        (typeof pd.Message === 'string' && pd.Message) ||
        (typeof pd.error === 'string' && pd.error) ||
        (typeof pd.Error === 'string' && pd.Error) ||
        (typeof pd.description === 'string' && pd.description) ||
        (typeof pd.Description === 'string' && pd.Description) ||
        null

      if (pd.title && pd.title !== 'Unauthorized' && pd.title !== 'One or more validation errors occurred.' && (!msg || msg.startsWith('Đã xảy ra lỗi'))) {
        return cleanMessage(pd.title)
      }
      if (pd.title === 'Unauthorized') return 'Bạn chưa đăng nhập hoặc phiên đã hết hạn.'

      const detail = pd.detail ?? pd.Detail ?? pd.details ?? pd.Details
      if (typeof detail === 'string' && detail) {
        if (detail.includes('429') || detail.toLowerCase().includes('rate limit')) {
          return 'Dịch vụ VNPT eKYC tạm giới hạn số lần gọi. Vui lòng đợi khoảng 30 phút rồi thử lại.'
        }
        return cleanMessage(detail)
      }

      if (msg) return cleanMessage(msg)

      // Trường hợp BE trả raw object không có title/message
      if (err.status === 422) {
        return 'Hồ sơ chưa đủ điều kiện nộp. Vui lòng kiểm tra: đã upload đủ tài liệu, dự án còn nhận hồ sơ, và thông tin hợp lệ.'
      }
      if (err.status === 409) {
        return 'Hồ sơ đang ở trạng thái không thể thực hiện thao tác này.'
      }
      if (err.status === 400) {
        return 'Yêu cầu không hợp lệ hoặc điều kiện mở đợt thanh toán chưa thỏa mãn (cần người dân thanh toán đợt trước đó).'
      }
      if (err.status === 404) {
        return 'Không tìm thấy dữ liệu yêu cầu.'
      }
      if (err.status === 403) {
        return 'Tài khoản không có quyền thực hiện thao tác này.'
      }
    }
    return cleanMessage(err.message)
  }
  if (err instanceof TypeError && err.message === 'Failed to fetch') {
    return 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra backend đang chạy và không bị chặn CORS.'
  }
  if (err instanceof Error) return cleanMessage(err.message)
  return 'Đã xảy ra lỗi. Vui lòng thử lại.'
}

export function formatSuccess(data: unknown): string {
  if (!data || typeof data !== 'object') return 'Thành công.'
  const o = data as Record<string, unknown>
  const msg = o.message ?? o.Message
  if (typeof msg === 'string' && msg) return msg
  return 'Thành công.'
}


