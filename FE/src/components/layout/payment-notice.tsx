import { consumePaymentNotice, paymentNoticeMessage } from '@/router'
import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { paymentApi } from '@/api/payment'
import type { PaymentInfoDto } from '@/types'

function unwrapPayment(data: unknown): PaymentInfoDto | null {
  if (!data || typeof data !== 'object') return null
  const o = data as Record<string, unknown>
  const nested = o.data ?? o.Data
  return (nested && typeof nested === 'object' ? nested : o) as PaymentInfoDto
}

export function PaymentNotice() {
  const [notice, setNotice] = useState(() => consumePaymentNotice())
  const [detail, setDetail] = useState('')

  useEffect(() => {
    const n = consumePaymentNotice()
    setNotice(n)
    if (!n) return

    const orderId = sessionStorage.getItem('pendingPaymentOrderId')
    if (!orderId) return

    void paymentApi.getPaymentInfo(orderId)
      .then((data) => {
        const info = unwrapPayment(data)
        if (!info) return
        const amount = Number(info.amount).toLocaleString('vi-VN')
        setDetail(` · ${info.orderId} · ${amount} VNĐ · ${info.status ?? ''}`)
        sessionStorage.removeItem('pendingPaymentOrderId')
      })
      .catch(() => {
        sessionStorage.removeItem('pendingPaymentOrderId')
      })
  }, [])

  if (!notice) return null
  const msg = paymentNoticeMessage(notice)

  return (
    <div
      className={`mb-6 flex items-center justify-between rounded-xl border px-4 py-3 text-sm ${
        notice === 'success'
          ? 'border-success/30 bg-success/10 text-green-800'
          : notice === 'cancelled'
            ? 'border-amber-200 bg-amber-50 text-amber-800'
            : 'border-red-200 bg-red-50 text-red-700'
      }`}
    >
      <span>{msg.text}{detail}</span>
      <button type="button" onClick={() => setNotice(null)} aria-label="Đóng">
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
