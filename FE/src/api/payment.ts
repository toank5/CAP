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

export interface CancellationPreviewDto {
  applicationId?: string
  totalPaid?: number
  depositAmount?: number
  forfeitedAmount?: number
  refundAmount?: number
  isDepositForfeited?: boolean
  penaltyPercentage?: number
  message?: string
  notes?: string
}

export interface CancelContractRequestDto {
  reason?: string | null
  isForcedRevocation?: boolean
  bankAccountNumber?: string | null
  bankName?: string | null
  accountHolderName?: string | null
}

export interface RejectCancellationRequestDto {
  reason?: string | null
}

export interface CancellationRequestItemDto {
  applicationId: string
  applicantName?: string
  citizenId?: string
  phoneNumber?: string
  apartmentCode?: string
  totalPaid?: number
  forfeitedAmount?: number
  refundAmount?: number
  reason?: string
  bankAccountNumber?: string
  bankName?: string
  accountHolderName?: string
  requestedAt?: string
  status?: string
}

export function parseCancellationRequests(data: unknown): CancellationRequestItemDto[] {
  if (Array.isArray(data)) return data as CancellationRequestItemDto[]
  if (data && typeof data === 'object') {
    const o = data as Record<string, unknown>
    const items = o.items ?? o.Items ?? o.data ?? o.Data ?? o.requests ?? o.Requests
    if (Array.isArray(items)) {
      return items.map((it) => {
        const x = it as Record<string, unknown>
        return {
          applicationId: String(x.applicationId ?? x.ApplicationId ?? ''),
          applicantName: (x.applicantName ?? x.ApplicantName ?? x.fullName ?? x.FullName) as string | undefined,
          citizenId: (x.citizenId ?? x.CitizenId) as string | undefined,
          phoneNumber: (x.phoneNumber ?? x.PhoneNumber) as string | undefined,
          apartmentCode: (x.apartmentCode ?? x.ApartmentCode ?? x.unitName ?? x.UnitName) as string | undefined,
          totalPaid: Number(x.totalPaid ?? x.TotalPaid ?? 0),
          forfeitedAmount: Number(x.forfeitedAmount ?? x.ForfeitedAmount ?? 0),
          refundAmount: Number(x.refundAmount ?? x.RefundAmount ?? 0),
          reason: (x.reason ?? x.Reason ?? x.cancelReason ?? x.CancelReason) as string | undefined,
          bankAccountNumber: (x.bankAccountNumber ?? x.BankAccountNumber) as string | undefined,
          bankName: (x.bankName ?? x.BankName) as string | undefined,
          accountHolderName: (x.accountHolderName ?? x.AccountHolderName) as string | undefined,
          requestedAt: (x.requestedAt ?? x.RequestedAt ?? x.createdAt ?? x.CreatedAt) as string | undefined,
          status: (x.status ?? x.Status ?? 'PENDING') as string | undefined,
        }
      })
    }
  }
  return []
}

export interface ApplicationProgressItem {
  applicationId: string
  applicantName?: string
  citizenId?: string
  apartmentUnitName?: string
  paidAmount?: number
  remainingAmount?: number
  accruedPenalty?: number
  overduePhasesCount: number
  isEligibleForForcedRevocation: boolean
  applicationStatus?: string
}

export function parsePaymentProgressItems(data: unknown): ApplicationProgressItem[] {
  const root = data && typeof data === 'object' ? (data as Record<string, unknown>) : {}
  const nested = (root.data ?? root.Data ?? root) as Record<string, unknown>
  const items = nested.items ?? nested.Items
  if (!Array.isArray(items)) return []
  return items.map((it) => {
    const x = it as Record<string, unknown>
    const overdue = Number(x.overduePhasesCount ?? x.OverduePhasesCount ?? 0)
    const eligible = Boolean(x.isEligibleForForcedRevocation ?? x.IsEligibleForForcedRevocation) || overdue >= 2
    return {
      applicationId: String(x.applicationId ?? x.ApplicationId ?? ''),
      applicantName: (x.applicantName ?? x.ApplicantName) as string | undefined,
      citizenId: (x.citizenId ?? x.CitizenId) as string | undefined,
      apartmentUnitName: (x.apartmentUnitName ?? x.ApartmentUnitName ?? x.slotCode ?? x.SlotCode) as string | undefined,
      paidAmount: Number(x.paidAmount ?? x.PaidAmount ?? 0),
      remainingAmount: Number(x.remainingAmount ?? x.RemainingAmount ?? 0),
      accruedPenalty: Number(x.accruedPenalty ?? x.AccruedPenalty ?? 0),
      overduePhasesCount: overdue,
      isEligibleForForcedRevocation: eligible,
      applicationStatus: (x.applicationStatus ?? x.ApplicationStatus) as string | undefined,
    }
  }).filter((it) => it.applicationId)
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

  /** Xem trước khoản phạt cọc và số tiền hoàn lại khi xin rút hồ sơ / hủy hợp đồng */
  getCancellationPreview: (applicationId: string) =>
    request<CancellationPreviewDto>(`/api/Payment/applications/${applicationId}/cancellation-preview`, { auth: true }),

  /** Người dân gửi yêu cầu xin rút hồ sơ / tự nguyện thanh lý hợp đồng (chấp nhận phạt cọc) */
  requestCancellation: (applicationId: string, body: CancelContractRequestDto) =>
    request<ApiResult>(`/api/Payment/applications/${applicationId}/request-cancellation`, {
      method: 'POST',
      body: JSON.stringify(body),
      auth: true,
    }),

  /** CĐT xem danh sách các yêu cầu xin rút hồ sơ của dự án */
  getCancellationRequests: (projectId: string) =>
    request<CancellationRequestItemDto[] | ApiResult>(`/api/Payment/projects/${projectId}/cancellation-requests`, { auth: true }),

  /** CĐT duyệt yêu cầu rút hồ sơ & hoàn trả tiền cho người dân */
  approveCancellation: (applicationId: string) =>
    request<ApiResult>(`/api/Payment/applications/${applicationId}/approve-cancellation`, {
      method: 'POST',
      auth: true,
    }),

  /** CĐT từ chối yêu cầu rút hồ sơ */
  rejectCancellation: (applicationId: string, body: RejectCancellationRequestDto) =>
    request<ApiResult>(`/api/Payment/applications/${applicationId}/reject-cancellation`, {
      method: 'POST',
      body: JSON.stringify(body),
      auth: true,
    }),

  /** CĐT / Hệ thống cưỡng chế thanh lý hợp đồng do nợ quá hạn >2 đợt hoặc vi phạm */
  cancelContract: (applicationId: string, body: CancelContractRequestDto) =>
    request<ApiResult>(`/api/Payment/applications/${applicationId}/cancel-contract`, {
      method: 'POST',
      body: JSON.stringify(body),
      auth: true,
    }),

  /** Xem tiến độ thu tiền tổng thể của dự án */
  getPaymentProgress: (projectId: string) =>
    request<ApiResult>(`/api/Payment/projects/${projectId}/payment-progress`, { auth: true }),

  /** CĐT mở đợt thanh toán theo tiến độ xây dựng */
  unlockPhase: (projectId: string, triggerEvent: string) =>
    request<ApiResult>(`/api/Payment/projects/${projectId}/unlock-phase`, {
      method: 'PATCH',
      body: JSON.stringify({ triggerEvent }),
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

