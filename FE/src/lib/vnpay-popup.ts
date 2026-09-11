import { paymentApi } from '@/api/payment'

export type VnPayWaitResult = 'success' | 'failed' | 'cancelled' | 'timeout' | 'popup_blocked'

function unwrapStatus(data: unknown): string {
  if (!data || typeof data !== 'object') return ''
  const o = data as Record<string, unknown>
  const nested = o.data ?? o.Data
  const src = (nested && typeof nested === 'object' ? nested : o) as Record<string, unknown>
  if (src.isPaid === true || src.IsPaid === true) return 'PAID'
  return String(
    src.status ??
    src.Status ??
    src.paymentStatus ??
    src.PaymentStatus ??
    src.vnp_TransactionStatus ??
    src.transactionStatus ??
    src.vnp_ResponseCode ??
    src.responseCode ??
    ''
  ).trim()
}

function classifyStatus(status: string): VnPayWaitResult | null {
  const s = status.toLowerCase()
  if (s === 'paid' || s === 'success' || s === '00' || s === 'completed' || s === 'successful') return 'success'
  if (s === 'cancelled' || s === 'canceled' || s === '24') return 'cancelled'
  if (s === 'failed' || s === 'fail' || (s.length === 2 && s !== '00' && /^\d+$/.test(s))) return 'failed'
  return null // Pending / unknown → keep polling
}

/**
 * Mở VNPay trong popup (giống mobile: không phụ thuộc redirect về FE).
 * Poll payment-info theo orderId đến khi Paid/Failed/Cancelled hoặc hết giờ.
 */
export async function openVnPayPopupAndWait(
  paymentUrl: string,
  orderId: string,
  options?: {
    timeoutMs?: number
    intervalMs?: number
    onStatus?: (rawStatus: string) => void
  },
): Promise<VnPayWaitResult> {
  const timeoutMs = options?.timeoutMs ?? 5 * 60 * 1000
  const intervalMs = options?.intervalMs ?? 2000

  const popup = window.open(paymentUrl, 'rhs_vnpay', 'width=920,height=720,menubar=no,toolbar=no')
  if (!popup) {
    // Popup bị chặn → fallback full-page (hành vi cũ)
    window.location.href = paymentUrl
    return 'popup_blocked'
  }

  const started = Date.now()

  return new Promise((resolve) => {
    let settled = false
    const finish = (result: VnPayWaitResult) => {
      if (settled) return
      settled = true
      window.clearInterval(timer)
      window.removeEventListener('message', onMessage)
      try {
        if (!popup.closed) popup.close()
      } catch {
        /* ignore */
      }
      resolve(result)
    }

    const onMessage = async (event: MessageEvent) => {
      if (event.data && event.data.type === 'VNPAY_CALLBACK_DONE') {
        const isSuccess = event.data.success || event.data.responseCode === '00'
        if (event.data.search) {
          try {
            await paymentApi.getPaymentCallback(event.data.search)
          } catch {
            // ignore
          }
        }
        finish(isSuccess ? 'success' : 'failed')
      }
    }
    window.addEventListener('message', onMessage)

    const tick = async () => {
      if (Date.now() - started > timeoutMs) {
        finish('timeout')
        return
      }
      try {
        const data = await paymentApi.getPaymentInfo(orderId)
        const raw = unwrapStatus(data)
        if (raw) options?.onStatus?.(raw)
        const classified = classifyStatus(raw)
        if (classified) {
          finish(classified)
          return
        }
      } catch {
        // mạng tạm lỗi — tiếp tục poll
      }

      // Nếu người dùng đã đóng popup bằng tay, thử check lần cuối
      if (popup.closed && !settled) {
        try {
          const checkData = await paymentApi.getPaymentInfo(orderId)
          const raw = unwrapStatus(checkData)
          const classified = classifyStatus(raw)
          if (classified === 'success') {
            finish('success')
            return
          }
        } catch {
          // ignore
        }
      }
    }

    void tick()
    const timer = window.setInterval(() => {
      void tick()
    }, intervalMs)
  })
}

export function vnPayResultMessage(result: VnPayWaitResult): { type: 'success' | 'error'; text: string } {
  switch (result) {
    case 'success':
      return { type: 'success', text: 'Thanh toán thành công. Trạng thái hồ sơ sẽ được cập nhật.' }
    case 'cancelled':
      return { type: 'error', text: 'Giao dịch đã bị hủy trên cổng VNPay.' }
    case 'failed':
      return { type: 'error', text: 'Thanh toán thất bại. Vui lòng thử lại.' }
    case 'timeout':
      return {
        type: 'error',
        text: 'Hết thời gian chờ xác nhận. Nếu đã trừ tiền, mở Lịch sử thanh toán hoặc tải lại hồ sơ.',
      }
    case 'popup_blocked':
      return {
        type: 'success',
        text: 'Đã mở cổng VNPay (toàn trang). Sau khi thanh toán, quay lại trang hồ sơ / thanh toán để kiểm tra.',
      }
  }
}
