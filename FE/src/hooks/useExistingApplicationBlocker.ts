import { useEffect, useState } from 'react'
import { housingApplicationsApi } from '@/api/housing-applications'
import {
  APPLICATION_STATUS,
  BLOCKING_APPLICATION_STATUSES,
  canCreateNewApplication,
} from '@/lib/constants'

/**
 * Hook kiểm tra user hiện tại có hồ sơ nào "đang chạy" (chặn tạo mới) hay không.
 *
 * Quy tắc: chỉ hồ sơ ở trạng thái thất bại (REJECTED / LOTTERY_LOST / CANCELED)
 * hoặc nháp (DRAFT) thì mới cho tạo hồ sơ mới. Waitlist và xin hủy HĐ vẫn CHẶN.
 *
 * Trả về `canCreate` (= true khi KHÔNG có hồ sơ chặn) để disable nút "Nộp hồ sơ ngay" /
 * "Tạo hồ sơ mới" trên UI mà không cần dựa vào quyết định của BE.
 */
export function useExistingApplicationBlocker() {
  const [state, setState] = useState<{
    loading: boolean
    canCreate: boolean
    blockingStatus: string | null
    message: string | null
  }>({ loading: true, canCreate: true, blockingStatus: null, message: null })

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const paged = await housingApplicationsApi.getMy({ pageIndex: 1, pageSize: 50 })
        if (cancelled) return
        const items = Array.isArray(paged?.items) ? paged.items : []
        const statuses = items
          .map((it) => (it?.applicationStatus ?? null) as string | null)
          .filter(Boolean) as string[]
        const canCreate = canCreateNewApplication(statuses)
        if (canCreate) {
          setState({ loading: false, canCreate: true, blockingStatus: null, message: null })
          return
        }
        const blocking =
          statuses.find((s) => BLOCKING_APPLICATION_STATUSES.includes(s as never)) || null
        const label = blocking ? APPLICATION_STATUS[blocking]?.label : null
        setState({
          loading: false,
          canCreate: false,
          blockingStatus: blocking,
          message: label
            ? `Bạn đang có hồ sơ ở trạng thái "${label}". Vui lòng chờ hồ sơ hoàn tất (trượt/đã hủy) trước khi tạo hồ sơ mới.`
            : 'Bạn đang có hồ sơ đang xử lý. Vui lòng chờ hồ sơ hoàn tất (trượt/đã hủy) trước khi tạo hồ sơ mới.',
        })
      } catch {
        // Mất kết nối / lỗi API: mặc định KHÔNG chặn để tránh làm khó user.
        if (!cancelled) setState({ loading: false, canCreate: true, blockingStatus: null, message: null })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return state
}
