import { request } from './http'
import type { ApiResult, CreatePaymentDto, PaymentResponseDto } from '../types'

export function extractPaymentUrl(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null
  const o = data as Record<string, unknown>
  const nested = o.data ?? o.Data
  if (nested && typeof nested === 'object') {
    const n = nested as Record<string, unknown>
    const url = n.paymentUrl ?? n.PaymentUrl
    if (typeof url === 'string' && url) return url
  }
  const direct = o.paymentUrl ?? o.PaymentUrl
  if (typeof direct === 'string' && direct) return direct
  return null
}

export function extractOrderId(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null
  const o = data as Record<string, unknown>
  const nested = o.data ?? o.Data
  if (nested && typeof nested === 'object') {
    const n = nested as Record<string, unknown>
    const id = n.orderId ?? n.OrderId
    if (typeof id === 'string' && id) return id
  }
  const top = o.orderId ?? o.OrderId
  if (typeof top === 'string' && top) return top
  return null
}

export async function startVnPayPayment(
  applicationId: string,
  orderInfo?: string,
): Promise<{ url: string; orderId: string }> {
  const response = await paymentApi.createPaymentUrl({
    ApplicationId: applicationId,
    OrderInfo: orderInfo,
  })
  const url = extractPaymentUrl(response)
  const orderId = extractOrderId(response)
  if (orderId) sessionStorage.setItem('pendingPaymentOrderId', orderId)
  if (!url) throw new Error('Không nhận được URL thanh toán từ máy chủ.')
  if (!orderId) throw new Error('Không nhận được mã đơn hàng từ máy chủ.')
  return { url, orderId }
}

export const paymentApi = {
  createPaymentUrl: (body: CreatePaymentDto) =>
    request<PaymentResponseDto>('/api/Payment/create-payment-url', {
      method: 'POST',
      body: JSON.stringify(body),
      auth: true,
    }),

  getPaymentCallback: () =>
    request<ApiResult>('/api/Payment/payment-callback', { auth: true }),

  getPaymentInfo: (orderId: string) =>
    request<ApiResult>(`/api/Payment/payment-info/${orderId}`, { auth: true }),

  getMyPayments: () =>
    request<ApiResult>('/api/Payment/my-payments', { auth: true }),

  getDepositResult: (orderId: string) =>
    request<ApiResult>(`/api/Payment/deposit-result/${orderId}`, { auth: true }),

  /** Lấy dashboard thanh toán dành cho SXD — các đợt cuối và Red Book cần xác nhận */
  getSxdPaymentDashboard: () =>
    request<ApiResult>('/api/Payment/sxd-dashboard', { auth: true }),

  /** SXD phê duyệt/xác nhận một đợt thanh toán cụ thể */
  sxdApproveInstallment: (installmentId: string, body: { action: 'APPROVE' | 'REJECT'; note?: string }) =>
    request<ApiResult>(`/api/Payment/installments/${installmentId}/sxd-approve`, {
      method: 'PATCH',
      body: JSON.stringify(body),
      auth: true,
    }),
}

/** Tải PDF hợp đồng — dùng fetch blob + Bearer (KHÔNG dùng request JSON vì endpoint trả file). */
export async function downloadContractPdf(applicationId: string): Promise<void> {
  const token = sessionStorage.getItem('accessToken')
  if (!token) throw new Error('Chưa đăng nhập.')
  const res = await fetch(
    `${import.meta.env.VITE_API_BASE_URL ?? ''}/api/Payment/download-contract/${applicationId}`,
    { headers: { Authorization: `Bearer ${token}` } },
  )
  if (!res.ok) throw new Error(`Không tải được PDF (HTTP ${res.status})`)
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `hop-dong-${applicationId.slice(0, 8)}.pdf`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
