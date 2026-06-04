import { request } from './http'
import type { ApiResult, CreatePaymentDto, PaymentResponseDto } from '../types'

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
