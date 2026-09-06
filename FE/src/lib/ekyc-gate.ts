import { navigate } from '@/router'
import {
  getCachedVerified,
  refreshVerifiedCache,
} from '@/lib/verification'

/**
 * Hard gate trước khi đăng ký / tạo hồ sơ.
 * Quy tắc đồng bộ mobile: chỉ chặn đúng lúc nộp hồ sơ, không khóa cả app.
 *
 * @returns true nếu đã eKYC — được tiếp tục
 */
export async function ensureVerifiedForApplication(options?: {
  projectId?: string
  /** true = chỉ kiểm tra, không confirm/navigate (dùng khi mount trang) */
  silent?: boolean
}): Promise<boolean> {
  if (options?.projectId) {
    sessionStorage.setItem('createApplicationProjectId', options.projectId)
    sessionStorage.setItem('projectId', options.projectId)
  }

  const cached = getCachedVerified()
  if (cached === true) return true

  const verified = await refreshVerifiedCache()
  if (verified === true) return true

  if (options?.silent) return false

  const goVerify = window.confirm(
    'Bạn cần xác minh danh tính (eKYC) trước khi đăng ký hồ sơ nhà ở xã hội.\n\nXác minh ngay bây giờ?',
  )
  if (goVerify) navigate('verify-identity')
  return false
}

export { refreshVerifiedCache as refreshVerifiedStatus }
