import {
  getCachedVerified,
  refreshVerifiedCache,
} from '@/lib/verification'

type EkycGateListener = (state: { open: boolean; projectId?: string }) => void
const listeners = new Set<EkycGateListener>()

export function subscribeEkycGate(fn: EkycGateListener) {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

export function openEkycGateModal(projectId?: string) {
  if (projectId) {
    sessionStorage.setItem('createApplicationProjectId', projectId)
    sessionStorage.setItem('projectId', projectId)
  }
  listeners.forEach((fn) => fn({ open: true, projectId }))
}

export function closeEkycGateModal() {
  listeners.forEach((fn) => fn({ open: false }))
}

/**
 * Hard gate trước khi đăng ký / tạo hồ sơ.
 * Quy tắc đồng bộ: khi chưa eKYC thì mở modal hướng dẫn định danh thay vì window.confirm.
 *
 * @returns true nếu đã eKYC — được tiếp tục
 */
export async function ensureVerifiedForApplication(options?: {
  projectId?: string
  /** true = chỉ kiểm tra, không mở modal (dùng khi mount trang) */
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

  // Mở modal thông báo định danh eKYC
  openEkycGateModal(options?.projectId)
  return false
}

export { refreshVerifiedCache as refreshVerifiedStatus }

