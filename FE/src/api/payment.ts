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
  return null
}

export async function startVnPayPayment(orderInfo: string, amount: number): Promise<string> {
  const response = await paymentApi.createPaymentUrl({
    amount,
    orderInfo,
    orderType: 'other',
  })
  const url = extractPaymentUrl(response)
  const orderId = extractOrderId(response)
  if (orderId) sessionStorage.setItem('pendingPaymentOrderId', orderId)
  if (!url) throw new Error('Không nhận được URL thanh toán từ máy chủ.')
  return url
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
}
