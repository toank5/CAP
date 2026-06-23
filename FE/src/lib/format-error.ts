import { ApiError } from '@/api/http'

export function formatError(err: unknown): string {
  if (err instanceof ApiError) {
    const b = err.body
    if (b && typeof b === 'object') {
      const pd = b as { title?: string; errors?: Record<string, string[]> }
      if (pd.errors) {
        return Object.entries(pd.errors)
          .flatMap(([k, msgs]) => msgs.map((m) => `${k}: ${m}`))
          .join(' · ')
      }
      if (pd.title && pd.title !== 'Unauthorized') return pd.title
      if (pd.title === 'Unauthorized') return 'Bạn chưa đăng nhập hoặc phiên đã hết hạn.'
      const detail = (b as { detail?: string; Detail?: string }).detail ?? (b as { Detail?: string }).Detail
      if (typeof detail === 'string' && detail) {
        if (detail.includes('429') || detail.toLowerCase().includes('rate limit')) {
          return 'Dịch vụ FPT AI tạm giới hạn số lần gọi. Vui lòng đợi khoảng 30 phút rồi thử lại.'
        }
        return detail
      }
      const msg =
        (b as { message?: string; Message?: string }).message ??
        (b as { Message?: string }).Message
      if (msg) return msg
    }
    return err.message
  }
  if (err instanceof Error) return err.message
  return 'Đã xảy ra lỗi. Vui lòng thử lại.'
}

export function formatSuccess(data: unknown): string {
  if (!data || typeof data !== 'object') return 'Thành công.'
  const o = data as Record<string, unknown>
  const msg = o.message ?? o.Message
  if (typeof msg === 'string' && msg) return msg
  return 'Thành công.'
}
