import { request } from './http'
import { downloadContractPdf, paymentApi } from './payment'
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
  triggerEvent?: string | null
  amount: number
  dueDays?: number
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
      ; (window as any).__paymentsParsed = true
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
      x.ordinal ?? x.Ordinal ?? x.phaseOrder ?? x.PhaseOrder ?? x.phaseNo ?? x.PhaseNo ?? x.no ?? x.No ?? x.index ?? x.Index
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
      else ord = idx + 1
    }
    const labelVal =
      (x.phaseName as string | undefined) ??
      (x.PhaseName as string | undefined) ??
      (x.label as string | undefined) ??
      (x.Label as string | undefined) ??
      (x.name as string | undefined) ??
      (x.Name as string | undefined) ??
      null
    const triggerEvent =
      (x.triggerEvent as string | undefined) ??
      (x.TriggerEvent as string | undefined) ??
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
    const dueDaysRaw =
      x.dueDays ??
      x.DueDays ??
      x.days ??
      x.Days ??
      x.durationDays ??
      x.DurationDays ??
      x.paymentDuration ??
      x.PaymentDuration
    const dueDays = Number(dueDaysRaw) > 0 ? Number(dueDaysRaw) : 7

    const paidAt =
      (x.paidAt as string | undefined) ??
      (x.PaidAt as string | undefined) ??
      (x.paymentDate as string | undefined) ??
      (x.PaymentDate as string | undefined) ??
      (x.paidDate as string | undefined) ??
      (x.PaidDate as string | undefined) ??
      (x.transactionDate as string | undefined) ??
      (x.TransactionDate as string | undefined) ??
      (x.completedAt as string | undefined) ??
      (x.CompletedAt as string | undefined) ??
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
      triggerEvent,
      amount: Number(amount) || 0,
      dueDays,
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

export interface EffectiveInstallmentDueDate {
  targetDate: Date
  dueLabel: string
  daysLeft: number | null
  isOverdue: boolean
  countdownLabel: string | null
  paidDateLabel?: string
}

/**
 * Tính hạn chót thực tế cho từng đợt thanh toán theo quy tắc:
 * - Đợt 1: Bắt đầu từ ngày ký hợp đồng (signedAt) + số ngày hạn (mặc định 7 ngày).
 * - Đợt N (N > 1): Bắt đầu từ ngày thanh toán thành công (paidAt) của Đợt N-1 + số ngày hạn của Đợt N.
 * - Đợt chưa mở (LOCKED): Hiển thị "X ngày sau Đợt N-1 (dự kiến dd/MM/yyyy)" và không chạy countdown đếm ngược dồn dập.
 * - Đợt đã đóng (PAID): Hiển thị ngày đã hoàn tất thanh toán.
 */
export function getEffectiveInstallmentDueDate(
  inst: PaymentInstallment,
  allInstallments: PaymentInstallment[] = [],
  signedAt?: string | null,
): EffectiveInstallmentDueDate {
  const sorted = [...allInstallments].sort((a, b) => a.ordinal - b.ordinal)
  const dueDays = inst.dueDays && inst.dueDays > 0 ? inst.dueDays : 7

  const formatVnDate = (d: Date) =>
    d.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })

  // 1. Trạng thái ĐÃ THANH TOÁN (PAID)
  if (inst.status === 'PAID') {
    const paidD = inst.paidAt ? new Date(inst.paidAt) : null
    const validPaidD = paidD && !Number.isNaN(paidD.getTime()) ? paidD : null
    const dueD = inst.dueDate ? new Date(inst.dueDate) : validPaidD || new Date()
    const validDueD = !Number.isNaN(dueD.getTime()) ? dueD : new Date()

    return {
      targetDate: validDueD,
      dueLabel: formatVnDate(validDueD),
      daysLeft: null,
      isOverdue: false,
      countdownLabel: null,
      paidDateLabel: validPaidD ? formatVnDate(validPaidD) : undefined,
    }
  }

  // 2. Trạng thái ĐÃ HỦY (CANCELLED)
  if (inst.status === 'CANCELLED') {
    const dueD = inst.dueDate ? new Date(inst.dueDate) : new Date()
    const validDueD = !Number.isNaN(dueD.getTime()) ? dueD : new Date()
    return {
      targetDate: validDueD,
      dueLabel: formatVnDate(validDueD),
      daysLeft: null,
      isOverdue: false,
      countdownLabel: null,
    }
  }

  // 3. Tính toán mốc cơ sở (Base time) từ đợt đã thanh toán gần nhất trước đợt hiện tại
  let baseTime: number | null = null
  let baseOrdinal = 0

  for (let ord = inst.ordinal - 1; ord >= 1; ord--) {
    const prev = sorted.find((p) => p.ordinal === ord)
    if (prev && prev.status === 'PAID') {
      if (prev.paidAt) {
        const pDate = new Date(prev.paidAt).getTime()
        if (!Number.isNaN(pDate)) {
          baseTime = pDate
          baseOrdinal = ord
          break
        }
      }
      // Nếu không có paidAt nhưng status là PAID, fallback về dueDate của đợt đó
      if (prev.dueDate) {
        const dDate = new Date(prev.dueDate).getTime()
        if (!Number.isNaN(dDate)) {
          baseTime = dDate
          baseOrdinal = ord
          break
        }
      }
    }
  }

  // Nếu chưa có đợt nào trước đó hoàn tất:
  if (baseTime == null) {
    if (signedAt) {
      const sDate = new Date(signedAt).getTime()
      if (!Number.isNaN(sDate)) {
        baseTime = sDate
        baseOrdinal = 0
      }
    }
    if (baseTime == null) {
      const firstInst = sorted.find((p) => p.ordinal === 1)
      if (firstInst?.dueDate) {
        const fDate = new Date(firstInst.dueDate).getTime()
        if (!Number.isNaN(fDate)) {
          baseTime = fDate - (firstInst.dueDays || 7) * 86400000
          baseOrdinal = 0
        }
      }
    }
    if (baseTime == null) {
      baseTime = Date.now()
      baseOrdinal = 0
    }
  }

  // Tính tổng số ngày cộng dồn từ baseOrdinal + 1 đến inst.ordinal
  let accumulatedDays = 0
  for (let ord = baseOrdinal + 1; ord <= inst.ordinal; ord++) {
    const stepInst = sorted.find((p) => p.ordinal === ord)
    const stepDays = stepInst?.dueDays && stepInst.dueDays > 0 ? stepInst.dueDays : 7
    accumulatedDays += stepDays
  }

  const calculatedDeadline = new Date(baseTime + accumulatedDays * 86400000)

  // 4. Nếu là đợt KHÓA (LOCKED): chưa mở thanh toán
  if (inst.status === 'LOCKED') {
    const prevOrd = inst.ordinal > 1 ? inst.ordinal - 1 : 1
    return {
      targetDate: calculatedDeadline,
      dueLabel: `${dueDays} ngày sau Đợt ${prevOrd} (dự kiến ${formatVnDate(calculatedDeadline)})`,
      daysLeft: null,
      isOverdue: false,
      countdownLabel: null,
    }
  }

  // 5. Nếu là đợt ĐANG MỞ (UNPAID / OVERDUE / PARTIAL)
  const now = Date.now()
  const msLeft = calculatedDeadline.getTime() - now
  const daysLeft = Math.ceil(msLeft / 86400000)
  const isOverdue = daysLeft < 0

  let countdownLabel: string | null = null
  if (isOverdue) {
    countdownLabel = `Quá hạn ${Math.abs(daysLeft)} ngày`
  } else if (daysLeft >= 0) {
    countdownLabel = `Còn ${daysLeft} ngày`
  }

  return {
    targetDate: calculatedDeadline,
    dueLabel: formatVnDate(calculatedDeadline),
    daysLeft,
    isOverdue,
    countdownLabel,
  }
}

export function parseContractStatus(data: unknown): ContractStatusDto | null {
  if (!data || typeof data !== 'object') return null
  const o = data as Record<string, unknown>
  const nested = o.data ?? o.Data
  const src = (nested && typeof nested === 'object' ? nested : o) as Record<string, unknown>
  const applicationId = String(src.applicationId ?? src.ApplicationId ?? '')
  const applicationStatus = String(src.applicationStatus ?? src.ApplicationStatus ?? '')
  const isSignedRaw = src.isSigned ?? src.IsSigned
  if (!applicationId && !applicationStatus && isSignedRaw == null) return null
  const signedAt = src.signedAt ?? src.SignedAt
  const pdfUrl = src.pdfUrl ?? src.PdfUrl
  return {
    applicationId,
    isSigned: Boolean(isSignedRaw),
    signedAt: typeof signedAt === 'string' ? signedAt : signedAt == null ? null : String(signedAt),
    pdfUrl: typeof pdfUrl === 'string' ? pdfUrl : pdfUrl == null ? null : String(pdfUrl),
    applicationStatus,
  }
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
   * Chủ đầu tư mở đợt thanh toán theo mốc đã cấu hình trên đợt đó.
   * BE: POST /api/housing-developer/projects/{projectId}/unlock-phase
   * body: { triggerEvent }
   */
  unlockPhase(projectId: string, triggerEvent: string) {
    return paymentApi.unlockPhase(projectId, triggerEvent)
  },
}

export type UnlockPhaseTrigger =
  | 'ON_LOTTERY_WON'
  | 'ON_CONTRACT_SIGNED'
  | 'CONSTRUCTION_ROUGH_FLOOR'
  | 'ROOFING_COMPLETED'
  | 'HANDOVER'
  | 'RED_BOOK_ISSUED'

export const UNLOCK_PHASE_LABEL: Record<UnlockPhaseTrigger, string> = {
  ON_LOTTERY_WON: 'Khi được cấp nhà',
  ON_CONTRACT_SIGNED: 'Sau khi ký hợp đồng',
  CONSTRUCTION_ROUGH_FLOOR: 'Hoàn thành phần thô',
  ROOFING_COMPLETED: 'Cất nóc',
  HANDOVER: 'Bàn giao nhà',
  RED_BOOK_ISSUED: 'Cấp sổ hồng',
}

export function isManualUnlockTrigger(trigger?: string | null): boolean {
  if (!trigger) return false
  const t = trigger.toUpperCase()
  return t !== 'ON_LOTTERY_WON' && t !== 'ON_APPROVED'
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
  LOCKED: 'Chờ chủ đầu tư mở',
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
