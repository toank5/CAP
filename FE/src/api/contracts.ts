import { request } from './http'
import { downloadContractPdf } from './payment'
import type { ApiResult } from '../types'

/**
 * Module API cho Hợp đồng mua bán + Lịch thanh toán.
 *
 * BE thật cung cấp:
 *  - GET  /api/contract-sign/{applicationId}/status         : Trạng thái ký HĐ nguyên tắc
 *  - POST /api/contract-sign/{applicationId}/sign           : Applicant đồng ý ký
 *  - GET  /api/Payment/installments/{applicationId}         : Danh sách đợt thanh toán
 *  - POST /api/Payment/installments/{installmentId}/pay    : Tạo URL thanh toán đợt
 *  - GET  /api/Payment/download-contract/{applicationId}   : Tải PDF hợp đồng
 *
 * Hợp đồng mua bán thật tồn tại ở DB thông qua ApplicationDetail (status CONTRACT_SIGNED).
 */

export type ContractStatus =
  | 'NOT_AVAILABLE'
  | 'PENDING_SIGNATURE'
  | 'SIGNED'
  | 'PAYMENT_PENDING'
  | 'PARTIALLY_PAID'
  | 'PAID'
  | 'FINALIZED'
  | 'CANCELED'

export interface ContractStatusDto {
  applicationId: string
  isSigned: boolean
  signedAt?: string | null
  pdfUrl?: string | null
  applicationStatus: string
}

export interface PaymentInstallment {
  installmentId: string
  applicationId: string
  ordinal: number
  label?: string | null
  amount: number
  dueDate: string
  status: InstallmentStatus        // FE display: PENDING → UNPAID
  _rawStatus: string              // BE raw: PENDING | OVERDUE | PAID | LOCKED | CANCELLED | PARTIAL
  paidAt?: string | null
  paidAmount?: number
  paymentOrderId?: string | null
  paymentUrl?: string | null
}

/** Status đợt thanh toán — mở rộng thêm LOCKED/CANCELLED theo PAY.MD. */
export type InstallmentStatus = 'LOCKED' | 'UNPAID' | 'PAID' | 'OVERDUE' | 'PARTIAL' | 'CANCELLED'

export interface ContractParty {
  id: string
  name: string
  role: 'BUYER' | 'DEVELOPER'
  signedAt?: string | null
  signatureUrl?: string | null
}

export interface ContractDto {
  applicationId: string
  applicationStatus: string
  isSigned: boolean
  signedAt?: string | null
  pdfUrl?: string | null
  installments: PaymentInstallment[]
}

export interface PaymentResponseDto {
  success?: boolean
  message?: string
  data?: {
    paymentUrl?: string
    orderId?: string
    amount?: number
  }
}

function pickArray(data: unknown): unknown[] {
  if (Array.isArray(data)) return data
  if (data && typeof data === 'object') {
    const o = data as Record<string, unknown>
    // BE trả { success, data: { applicationId, phases: [...] } } → unwrap 2 cấp.
    const inner = o.data ?? o.Data
    if (inner && typeof inner === 'object') {
      const io = inner as Record<string, unknown>
      const candidates = [
        io.phases,
        io.Phases,
        io.installments,
        io.Installments,
        io.items,
        io.Items,
      ]
      for (const c of candidates) {
        if (Array.isArray(c)) return c
      }
    }
    const top = [o.items, o.Items, o.phases, o.Phases, o.data, o.Data]
    for (const c of top) {
      if (Array.isArray(c)) return c
    }
  }
  return []
}

export function parseInstallments(data: unknown): PaymentInstallment[] {
  const arr = pickArray(data)
  // Debug: 1 lần / page load, in raw payload để FE biết BE thật trả field gì.
  if (typeof window !== 'undefined' && arr.length > 0 && !(window as any).__paymentsParsed) {
    // eslint-disable-next-line no-console
    console.info('[parseInstallments] raw sample (đợt đầu):', JSON.stringify(arr[0], null, 2))
    ;(window as any).__paymentsParsed = true
  }
  return arr.map((it, idx) => {
    const x = it as Record<string, unknown>
    // BE đặt tên theo C# (PascalCase): PhaseId/PhaseNo/Amount/DueDate/Status/...
    const phaseId =
      (x.id as string | undefined) ??
      (x.Id as string | undefined) ??
      (x.phaseId as string | undefined) ??
      (x.PhaseId as string | undefined) ??
      (x.installmentId as string | undefined) ??
      (x.InstallmentId as string | undefined) ??
      ''
    const appId =
      (x.applicationId as string | undefined) ??
      (x.ApplicationId as string | undefined) ??
      ''
    // ordinal: thử nhiều key; fall-back "Đợt N" trong label; cuối cùng lấy idx+1 (theo vị trí array).
    let ordRaw: unknown =
      x.ordinal ?? x.Ordinal ?? x.phaseNo ?? x.PhaseNo ?? x.no ?? x.No ?? x.index ?? x.Index
    let ord = Number(ordRaw) || 0
    if (ord === 0) {
      const labelStr =
        (x.label as string | undefined) ??
        (x.Label as string | undefined) ??
        (x.name as string | undefined) ??
        (x.Name as string | undefined) ??
        ''
      const m = /đợt\s*(\d+)/i.exec(labelStr)
      if (m) ord = parseInt(m[1], 10)
      else if (arr.length <= 6) ord = idx + 1
    }
    const labelVal =
      (x.label as string | undefined) ??
      (x.Label as string | undefined) ??
      (x.name as string | undefined) ??
      (x.Name as string | undefined) ??
      null
    const amount =
      x.amount ?? x.Amount ?? x.value ?? x.Value ?? 0
    const dueDate =
      (x.dueDate as string | undefined) ??
      (x.DueDate as string | undefined) ??
      (x.dueAt as string | undefined) ??
      (x.DueAt as string | undefined) ??
      ''
    const statusRaw = String(
      x.status ?? x.Status ?? x.state ?? x.State ?? 'UNPAID',
    ).toUpperCase()
    const status = ((): InstallmentStatus => {
      // Map "PENDING" (BE) → "UNPAID" (FE display) theo PAY.MD.
      if (statusRaw === 'PENDING') return 'UNPAID'
      if (statusRaw === 'LOCKED') return 'LOCKED'
      if (statusRaw === 'PAID') return 'PAID'
      if (statusRaw === 'OVERDUE') return 'OVERDUE'
      if (statusRaw === 'CANCELLED' || statusRaw === 'CANCELED') return 'CANCELLED'
      if (statusRaw === 'PARTIAL') return 'PARTIAL'
      return 'UNPAID'
    })()
    const paidAt =
      (x.paidAt as string | undefined) ??
      (x.PaidAt as string | undefined) ??
      null
    const paidAmount =
      x.paidAmount ?? x.PaidAmount ?? undefined
    const paymentOrderId =
      (x.paymentOrderId as string | undefined) ??
      (x.PaymentOrderId as string | undefined) ??
      null
    const paymentUrl =
      (x.paymentUrl as string | undefined) ??
      (x.PaymentUrl as string | undefined) ??
      null
    return {
      installmentId: phaseId,
      applicationId: appId,
      ordinal: ord,
      label: labelVal,
      amount: Number(amount) || 0,
      dueDate,
      // FE display: PENDING → UNPAID
      status,
      // BE raw: dùng cho canPay logic (PENDING || OVERDUE → mở thanh toán)
      _rawStatus: statusRaw as 'PENDING' | 'OVERDUE' | 'PAID' | 'LOCKED' | 'CANCELLED' | 'PARTIAL' | string,
      paidAt,
      paidAmount:
        paidAmount !== undefined ? Number(paidAmount) || undefined : undefined,
      paymentOrderId,
      paymentUrl,
    }
  })
}

export function parseContractStatus(data: unknown): ContractStatusDto | null {
  if (!data || typeof data !== 'object') return null
  const o = data as Record<string, unknown>
  const nested = o.data ?? o.Data
  if (nested && typeof nested === 'object') return nested as ContractStatusDto
  return data as ContractStatusDto
}

export const contractApi = {
  getStatus(applicationId: string) {
    return request<ApiResult>(`/api/contract-sign/${applicationId}/status`, { auth: true })
  },

  sign(applicationId: string) {
    return request<ApiResult>(`/api/contract-sign/${applicationId}/sign`, {
      method: 'POST',
      auth: true,
    })
  },

  getInstallments(applicationId: string) {
    return request<ApiResult>(`/api/Payment/installments/${applicationId}`, { auth: true })
  },

  payInstallment(installmentId: string, returnUrl?: string) {
    const body = returnUrl ? JSON.stringify({ returnUrl }) : undefined
    return request<PaymentResponseDto>(
      `/api/Payment/installments/${installmentId}/pay`,
      { method: 'POST', body, auth: true },
    )
  },

  downloadContract(applicationId: string) {
    return request<ApiResult>(`/api/Payment/download-contract/${applicationId}`, { auth: true })
  },

  /** Tải PDF hợp đồng — fetch blob + Bearer (KHÔNG dùng request JSON vì endpoint trả file). */
  downloadContractBlob(applicationId: string): Promise<void> {
    return downloadContractPdf(applicationId)
  },

  /**
   * CĐT mở (unlock) đợt thanh toán theo tiến độ xây dựng (PAY.MD Đợt 3-6).
   * BE: POST /api/housing-developer/projects/{projectId}/unlock-phase
   * body: { triggerEvent: 'CONSTRUCTION_ROUGH_FLOOR' | 'ROOFING_COMPLETED' | 'HANDOVER' | 'RED_BOOK_ISSUED' }
   */
  unlockPhase(projectId: string, triggerEvent: UnlockPhaseTrigger) {
    return request<ApiResult>(
      `/api/housing-developer/projects/${projectId}/unlock-phase`,
      { method: 'POST', body: JSON.stringify({ triggerEvent }), auth: true },
    )
  },
}

export type UnlockPhaseTrigger =
  | 'CONSTRUCTION_ROUGH_FLOOR' // Đợt 3 (20%) — Xây thô
  | 'ROOFING_COMPLETED'        // Đợt 4 (20%) — Cất nóc
  | 'HANDOVER'                 // Đợt 5 (25% + 2% PBT) — Bàn giao
  | 'RED_BOOK_ISSUED'          // Đợt 6 (5%) — Sổ hồng

export const UNLOCK_PHASE_LABEL: Record<UnlockPhaseTrigger, string> = {
  CONSTRUCTION_ROUGH_FLOOR: 'Xây thô (mở Đợt 3)',
  ROOFING_COMPLETED: 'Cất nóc (mở Đợt 4)',
  HANDOVER: 'Bàn giao (mở Đợt 5)',
  RED_BOOK_ISSUED: 'Cấp sổ hồng (mở Đợt 6)',
}

/** Mapping phase → ordinal của đợt được unlock */
export const UNLOCK_PHASE_ORDINAL: Record<UnlockPhaseTrigger, number> = {
  CONSTRUCTION_ROUGH_FLOOR: 3,
  ROOFING_COMPLETED: 4,
  HANDOVER: 5,
  RED_BOOK_ISSUED: 6,
}

export const CONTRACT_STATUS_LABEL: Record<ContractStatus, string> = {
  NOT_AVAILABLE: 'Chưa có hợp đồng',
  PENDING_SIGNATURE: 'Chờ ký',
  SIGNED: 'Đã ký',
  PAYMENT_PENDING: 'Chờ thanh toán',
  PARTIALLY_PAID: 'Thanh toán một phần',
  PAID: 'Đã thanh toán đủ',
  FINALIZED: 'Hoàn tất',
  CANCELED: 'Đã hủy',
}

export const CONTRACT_STATUS_TONE: Record<
  ContractStatus,
  'default' | 'success' | 'warning' | 'danger' | 'secondary'
> = {
  NOT_AVAILABLE: 'secondary',
  PENDING_SIGNATURE: 'warning',
  SIGNED: 'default',
  PAYMENT_PENDING: 'warning',
  PARTIALLY_PAID: 'warning',
  PAID: 'success',
  FINALIZED: 'success',
  CANCELED: 'danger',
}

export const INSTALLMENT_STATUS_LABEL: Record<InstallmentStatus, string> = {
  LOCKED: 'Chờ mở',
  UNPAID: 'Chưa thanh toán',
  PAID: 'Đã thanh toán',
  OVERDUE: 'Quá hạn',
  PARTIAL: 'Thanh toán một phần',
  CANCELLED: 'Đã hủy',
}

export const INSTALLMENT_STATUS_TONE: Record<
  InstallmentStatus,
  'default' | 'success' | 'warning' | 'danger' | 'secondary'
> = {
  LOCKED: 'secondary',
  UNPAID: 'secondary',
  PAID: 'success',
  OVERDUE: 'danger',
  PARTIAL: 'warning',
  CANCELLED: 'danger',
}

export function summarizeInstallments(items: PaymentInstallment[]): {
  paid: number
  remaining: number
  total: number
  paidCount: number
  totalCount: number
  progress: number
} {
  const total = items.reduce((s, i) => s + i.amount, 0)
  const paid = items.reduce(
    (s, i) => s + (i.paidAmount ?? (i.status === 'PAID' ? i.amount : 0)),
    0,
  )
  const paidCount = items.filter((i) => i.status === 'PAID').length
  return {
    paid,
    remaining: total - paid,
    total,
    paidCount,
    totalCount: items.length,
    progress: total > 0 ? Math.round((paid / total) * 100) : 0,
  }
}

/**
 * BE có thể trả thêm các field ở envelope `data`:
 *   - housePrice / HousePrice: giá căn theo Apartment (catalog)
 *   - contractPrice / ContractPrice / totalPrice / TotalPrice: giá bán chính thức tính 6 đợt
 *   - apartmentId / ApartmentId / apartmentCode / ApartmentCode
 *
 * FE dùng các field này để hiển thị "Giá nhà chính thức" và cảnh báo khi
 * sum(phase.amounts) ≠ contractPrice.
 */
export interface InstallmentsEnvelope {
  installments: PaymentInstallment[]
  housePrice?: number | null
  contractPrice?: number | null
  officialPrice?: number | null
  apartmentId?: string | null
  apartmentCode?: string | null
}

function num(v: unknown): number | undefined {
  if (typeof v === 'number' && !Number.isNaN(v)) return v
  if (typeof v === 'string') {
    const n = Number(v.replace(/[^\d.-]/g, ''))
    return Number.isFinite(n) ? n : undefined
  }
  return undefined
}

export function parseInstallmentsEnvelope(raw: unknown): InstallmentsEnvelope {
  const installments = parseInstallments(raw)
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const inner = (o.data ?? o.Data) as Record<string, unknown> | undefined
  const src = inner ?? o
  const housePrice =
    num(src.housePrice) ?? num(src.HousePrice) ?? num(src.listPrice) ?? num(src.ListPrice) ?? null
  const contractPrice =
    num(src.contractPrice) ??
    num(src.ContractPrice) ??
    num(src.totalPrice) ??
    num(src.TotalPrice) ??
    num(src.officialPrice) ??
    num(src.OfficialPrice) ??
    null
  const officialPrice = contractPrice ?? housePrice ?? null
  const apartmentId =
    (src.apartmentId as string | undefined) ??
    (src.ApartmentId as string | undefined) ??
    null
  const apartmentCode =
    (src.apartmentCode as string | undefined) ??
    (src.ApartmentCode as string | undefined) ??
    (src.unitCode as string | undefined) ??
    (src.UnitCode as string | undefined) ??
    null
  return {
    installments,
    housePrice: housePrice ?? null,
    contractPrice: contractPrice ?? null,
    officialPrice,
    apartmentId,
    apartmentCode,
  }
}

// Aliases giữ tương thích với code cũ
export const summarizeContract = summarizeInstallments
export type { ContractDto as ContractLegacyDto }
export type { ContractStatus as ContractLegacyStatus }
export function parseContracts(data: unknown): ContractDto[] {
  if (!data) return []
  if (Array.isArray(data)) return data as ContractDto[]
  if (typeof data === 'object') {
    const o = data as Record<string, unknown>
    const items = o.items ?? o.Items ?? o.data ?? o.Data
    if (Array.isArray(items)) return items as ContractDto[]
  }
  return []
}
export function parseContract(data: unknown): ContractDto | null {
  if (!data || typeof data !== 'object') return null
  return data as ContractDto
}
