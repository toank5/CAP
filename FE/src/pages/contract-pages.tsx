import { useEffect, useState, type ReactNode } from 'react'
import { FileText, Download, Wallet, Unlock, CheckCircle2, Clock, AlertTriangle, XCircle, Lock, Calendar, Banknote, TrendingUp, CircleDot } from 'lucide-react'
import {
  contractApi,
  CONTRACT_STATUS_LABEL,
  CONTRACT_STATUS_TONE,
  INSTALLMENT_STATUS_LABEL,
  INSTALLMENT_STATUS_TONE,
  parseContractStatus,
  parseInstallmentsEnvelope,
  summarizeInstallments,
  isManualUnlockTrigger,
  getEffectiveInstallmentDueDate,
  type ContractStatusDto,
  type PaymentInstallment,
  type ContractStatus,
} from '@/api/contracts'
import { parseApplicationDetail } from '@/api/housing-applications'
import { request } from '@/api/http'
import type { ApplicationDetailDto } from '@/types'
import { APPLICATION_STATUS } from '@/lib/constants'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { PageCard } from '@/components/layout/page-header'
import { SignContractSection } from '@/components/payment/payment-section'
import { navigate } from '@/hooks/useHashRoute'
import { formatError } from '@/lib/format-error'
import { getRole } from '@/router'
import { canSignAfterDeposit, isPhase1Paid } from '@/lib/deposit-pipeline'
import {
  emptyScheduleHasApartmentCopy,
  emptyScheduleNoApartmentCopy,
  payScheduleMissingError,
  payStatusNotReadyError,
  scheduleLoadErrorCopy,
  scheduleMismatchHint,
} from '@/lib/payment-schedule-copy'
import { extractOrderId, extractPaymentUrl, paymentApi, downloadContractPdf } from '@/api/payment'
import { housingApplicationsApi } from '@/api/housing-applications'
import { openVnPayPopupAndWait, vnPayResultMessage } from '@/lib/vnpay-popup'
import type { ApplicationSummaryDto } from '@/types'

function persistApplicationId(id: string, projectId?: string) {
  if (id) {
    sessionStorage.setItem('contractApplicationId', id)
    if (projectId) sessionStorage.setItem('contractProjectId', projectId)
  } else {
    sessionStorage.removeItem('contractApplicationId')
    sessionStorage.removeItem('contractProjectId')
  }
}

function readApplicationId(): string {
  return sessionStorage.getItem('contractApplicationId') ?? ''
}

function readProjectId(): string {
  return sessionStorage.getItem('contractProjectId') ?? ''
}

function formatAppStatusVi(code: string | null | undefined): string {
  if (!code) return '—'
  const key = code.trim().toUpperCase()
  if (APPLICATION_STATUS[key]?.label) return APPLICATION_STATUS[key].label
  if (APPLICATION_STATUS[code]?.label) return APPLICATION_STATUS[code].label
  if (key === 'DEPOSIT_PENDING' || key === 'PENDING_DEPOSIT') return 'Chờ đặt cọc'
  if (key === 'CONTRACT_PENDING' || key === 'PENDING_CONTRACT') return 'Chờ ký hợp đồng'
  if (key === 'CONTRACTING') return 'Đang ký hợp đồng'
  if (key === 'CONTRACT_SIGNED' || key === 'SIGNED') return 'Đã ký hợp đồng'
  if (key === 'DEPOSIT_PAID') return 'Đã đóng Đợt 1'
  if (key === 'SUBMITTED') return 'Đã nộp hồ sơ'
  if (key === 'APPROVED') return 'Đã phê duyệt'
  if (key === 'REVIEWING') return 'Đang thẩm định'
  if (key === 'NEED_MORE_DOCUMENTS') return 'Cần bổ sung hồ sơ'
  return code
}

function mapStatus(s: ContractStatusDto | null): ContractStatus {
  if (!s) return 'NOT_AVAILABLE'
  if (s.isSigned) return 'SIGNED'
  switch (s.applicationStatus) {
    case 'CONTRACT_SIGNED':
    case 'CONTRACTING':
    case 'PAID':
    case 'FINALIZED':
      return 'SIGNED'
    case 'PAYMENT_PENDING':
      return 'PAYMENT_PENDING'
    case 'PARTIALLY_PAID':
      return 'PARTIALLY_PAID'
    case 'CANCELED':
    case 'REJECTED':
      return 'CANCELED'
    default:
      return 'PENDING_SIGNATURE'
  }
}

function ContractStatusBadge({ status }: { status: ContractStatus }) {
  return <Badge variant={CONTRACT_STATUS_TONE[status]}>{CONTRACT_STATUS_LABEL[status]}</Badge>
}

export function ContractsPage() {
  const role = getRole()
  const isApplicant = role === 'Applicant'
  const isDev = role === 'Housing Developer'
  const [applications, setApplications] = useState<ApplicationSummaryDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      let data: ApplicationSummaryDto[] = []
      if (isApplicant) {
        const res = await housingApplicationsApi.getMy({ pageIndex: 1, pageSize: 50 })
        data = Array.isArray((res as { items?: ApplicationSummaryDto[] }).items)
          ? (res as { items: ApplicationSummaryDto[] }).items
          : []
      } else if (isDev) {
        const res = await housingApplicationsApi.getDeveloperDashboard({ pageIndex: 1, pageSize: 50 })
        data = Array.isArray((res as { items?: ApplicationSummaryDto[] }).items)
          ? (res as { items: ApplicationSummaryDto[] }).items
          : []
      } else {
        const res = await housingApplicationsApi.getAll({ pageIndex: 1, pageSize: 50 })
        data = Array.isArray((res as { items?: ApplicationSummaryDto[] }).items)
          ? (res as { items: ApplicationSummaryDto[] }).items
          : []
      }
      // Hồ sơ từ chờ ký → đã ký → đã đặt cọc (và các trạng thái thanh toán tiếp theo)
      const eligible = data.filter((a) =>
        [
          'DEPOSIT_PENDING',
          'CONTRACT_PENDING',
          'CONTRACT_SIGNED',
          'DEPOSIT_PAID',
          'CONTRACTING',
          'INSTALLMENT_IN_PROGRESS',
          'PARTIALLY_PAID',
          'PAID',
          'FULLY_PAID',
          'FINALIZED',
        ].includes(a.applicationStatus),
      )
      setApplications(eligible)
    } catch (err) {
      setError(formatError(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [role])

  return (
    <div>
      <PageCard className="p-6">
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          {loading ? 'Đang tải...' : `${applications.length} hồ sơ có hợp đồng (chờ ký / đã ký / đã TT Đợt 1)`}
        </p>
        {error && <Alert variant="error">{error}</Alert>}
        {!loading && applications.length === 0 && (
          <Alert variant="info">
            {isDev
              ? 'Chưa có hồ sơ nào ở bước hợp đồng. Hồ sơ xuất hiện khi bạn chốt suất hoặc người dân trúng bốc thăm (chờ ký → ký → thanh toán Đợt 1, gồm tiền đặt cọc).'
              : isApplicant
                ? 'Chưa có hồ sơ nào ở bước hợp đồng. Hồ sơ xuất hiện khi chủ đầu tư chốt suất hoặc bạn trúng bốc thăm (chờ ký → ký → thanh toán Đợt 1, gồm tiền đặt cọc).'
                : 'Chưa có hồ sơ nào ở bước hợp đồng. Hồ sơ xuất hiện khi chủ đầu tư chốt suất hoặc người dân trúng bốc thăm (chờ ký → ký → thanh toán Đợt 1, gồm tiền đặt cọc).'}
          </Alert>
        )}
        <div className="grid gap-3">
          {applications.map((a) => (
            <button
              key={a.applicationId}
              type="button"
              className="glass-card flex w-full flex-wrap items-start justify-between gap-3 p-4 text-left transition hover:ring-2 hover:ring-primary/20"
              onClick={() => {
                persistApplicationId(a.applicationId, a.projectId)
                navigate('contract-detail')
              }}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-slate-400" />
                  <h3 className="font-semibold">{a.applicantFullName}</h3>
                </div>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Dự án: {a.projectName}
                </p>
                <p className="text-xs text-slate-400">
                  CCCD: {a.citizenId} · Trạng thái: {formatAppStatusVi(a.applicationStatus)}
                </p>
              </div>
              <Wallet className="h-5 w-5 text-emerald-500" />
            </button>
          ))}
        </div>
      </PageCard>
    </div>
  )
}

export function ContractCreatePage() {
  return (
    <div>
      <PageCard className="p-6">
        <Alert variant="info">
          <p className="font-semibold">Hợp đồng được tạo tự động từ hồ sơ trúng</p>
          <p className="mt-1 text-sm">
            Hệ thống sinh Hợp đồng mua bán nhà ở xã hội (Mẫu số 01 – TT 05/2024/TT-BXD)
            khi hồ sơ được chốt suất. Mở mục <strong>Hợp đồng</strong> và chọn hồ sơ để xem / ký.
          </p>
          <Button className="mt-3" variant="accent" onClick={() => navigate('contracts')}>
            Đi tới danh sách hợp đồng
          </Button>
        </Alert>
      </PageCard>
    </div>
  )
}

function DepositCountdown({
  signedAt,
  paid,
  expired,
}: {
  signedAt: string | null | undefined
  paid: boolean
  expired?: boolean
}) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (paid || expired || !signedAt) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [paid, expired, signedAt])

  if (paid) return null
  if (expired) {
    return (
      <span className="ml-2 inline-flex items-center gap-1 rounded-md bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
        ⛔ Đã hết hạn đặt cọc
      </span>
    )
  }
  if (!signedAt) return null

  const deadline = new Date(signedAt).getTime() + 168 * 60 * 60 * 1000 // 7 ngày = 168h (PAY.MD)
  const ms = deadline - now
  if (ms <= 0) {
    return (
      <span className="ml-2 inline-flex items-center gap-1 rounded-md bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
        ⛔ Đã hết hạn đặt cọc
      </span>
    )
  }
  const totalSec = Math.floor(ms / 1000)
  const days = Math.floor(totalSec / 86400)
  const hours = Math.floor((totalSec % 86400) / 3600)
  const minutes = Math.floor((totalSec % 3600) / 60)
  const seconds = totalSec % 60
  const urgent = ms < 24 * 60 * 60 * 1000 // < 24h → vàng
  const critical = ms < 6 * 60 * 60 * 1000 // < 6h → đỏ
  const tone = critical
    ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300'
    : urgent
      ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
      : 'bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300'
  return (
    <span
      className={`ml-2 inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold tabular-nums ${tone}`}
      title="Hạn 168h (7 ngày) kể từ khi ký hợp đồng"
    >
      ⏰ Còn {days > 0 ? `${days} ngày ` : ''}
      {String(hours).padStart(2, '0')}:{String(minutes).padStart(2, '0')}:
      {String(seconds).padStart(2, '0')} để đặt cọc
    </span>
  )
}

function InstallmentRow({
  inst,
  onPaid,
  signedAt,
  totalAmount,
  applicationId,
  applicationStatus,
  installments,
  projectId,
  onUnlocked,
}: {
  inst: PaymentInstallment
  onPaid: () => void
  signedAt: string | null
  totalAmount: number
  applicationId: string
  applicationStatus: string
  installments: PaymentInstallment[]
  projectId?: string
  onUnlocked?: () => void
}) {
  const [paying, setPaying] = useState(false)
  const [unlocking, setUnlocking] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const effective = getEffectiveInstallmentDueDate(inst, installments, signedAt)
  const isPaid = inst.status === 'PAID'
  const isLocked = inst.status === 'LOCKED'
  const isCancelled = inst.status === 'CANCELLED'
  const isOverdue = !isPaid && !isLocked && !isCancelled && effective.isOverdue
  const isDeposit = inst.ordinal === 1
  const tone = INSTALLMENT_STATUS_TONE[inst.status]
  const role = getRole()

  // Đợt cho phép thanh toán khi:
  // - Đợt 1: create-payment-url (luồng đặt cọc trước ký) HOẶC
  // - Đợt đang PENDING/OVERDUE (BE raw status) VÀ tất cả đợt trước đã PAID
  const allPrevPaid =
    inst.ordinal === 1 ||
    installments
      .filter((p) => p.ordinal < inst.ordinal)
      .every((p) => p.status === 'PAID')

  const canPay =
    role === 'Applicant' &&
    (inst._rawStatus === 'PENDING' || inst._rawStatus === 'OVERDUE' || inst.status === 'UNPAID') &&
    allPrevPaid

  // PENDING (BE raw) → FE display UNPAID
  const isPending = inst._rawStatus === 'PENDING'

  const phasePct = totalAmount > 0 ? Math.round((inst.amount / totalAmount) * 100) : 0

  const handlePay = async () => {
    setPaying(true)
    setMsg(null)
    try {
      let paymentUrl: string | null = null
      let orderId: string | null = null

      // CHỌN ĐÚNG API theo applicationStatus:
      // - Đợt 1 + APPROVED/DEPOSIT_PENDING/CONTRACT_PENDING: create-payment-url
      // - Đợt 1 + CONTRACT_SIGNED: create-payment-url (installments chưa có trong DB)
      // - Đợt 2–6 (PENDING/OVERDUE): installments/{id}/pay
      const isDeposit1PreSign =
        inst.ordinal === 1 &&
        (applicationStatus === 'APPROVED' ||
          applicationStatus === 'APPROVED_BY_TIMEOUT' ||
          applicationStatus === 'DEPOSIT_PENDING' ||
          applicationStatus === 'CONTRACT_PENDING')
      const isDeposit1PostSign = inst.ordinal === 1 && applicationStatus === 'CONTRACT_SIGNED'

      if (isDeposit1PreSign || isDeposit1PostSign) {
        // Đợt 1 (trước hoặc sau ký): gọi create-payment-url.
        const res = await paymentApi.createPaymentUrl({
          ApplicationId: applicationId,
          Ordinal: 1,
          ReturnUrl: `${window.location.origin}/contracts`,
        })
        paymentUrl = extractPaymentUrl(res)
        orderId = extractOrderId(res)
      } else {
        // Đợt 2–6 (PENDING/OVERDUE): gọi installments/{id}/pay.
        const res = await contractApi.payInstallment(
          inst.installmentId,
          `${window.location.origin}/contracts`,
        )
        paymentUrl = extractPaymentUrl(res)
        orderId = extractOrderId(res)
      }

      if (paymentUrl && orderId) {
        setMsg({ type: 'success', text: 'Đã mở cổng VNPay — đang chờ kết quả…' })
        const result = await openVnPayPopupAndWait(paymentUrl, orderId)
        setMsg(vnPayResultMessage(result))
        if (result === 'success') onPaid()
        return
      }
      if (paymentUrl) {
        window.location.href = paymentUrl
        return
      }
      setMsg({ type: 'success', text: 'Đã tạo giao dịch thanh toán.' })
      onPaid()
    } catch (err) {
      // Debug: log raw error để xem response body
      // eslint-disable-next-line no-console
      console.warn('[handlePay] error:', err)
      // Nhận diện lỗi BE chưa sinh installment (installment not found / not generated).
      const msg = formatError(err)
      const isNotFound =
        /not\s*found|not\s*exist|không\s*tìm\s*thấy|không\s*tồn\s*tại|installment/i.test(msg) ||
        (err instanceof Error && String(err.message).includes('404'))
      if (isNotFound) {
        setMsg({
          type: 'error',
          text: payScheduleMissingError(role),
        })
      } else if (/trạng thái thích hợp|status.*not\s*suitable|invalid.*status|400\b/i.test(msg)) {
        // BE trả 400 → application chưa ở status phù hợp để thanh toán.
        setMsg({
          type: 'error',
          text: payStatusNotReadyError(role),
        })
      } else {
        setMsg({ type: 'error', text: msg })
      }
    } finally {
      setPaying(false)
    }
  }

  const handleUnlockDirect = async () => {
    if (!projectId || !inst.triggerEvent || unlocking) return
    setUnlocking(true)
    setMsg(null)
    try {
      await contractApi.unlockPhase(projectId, inst.triggerEvent)
      setMsg({
        type: 'success',
        text: `Đã mở ${inst.label || `Đợt ${inst.ordinal}`}. Người mua nhà hiện có thể thanh toán đợt này.`,
      })
      onUnlocked?.()
    } catch (err) {
      setMsg({ type: 'error', text: formatError(err) })
    } finally {
      setUnlocking(false)
    }
  }

  const borderClass = isPaid
    ? 'border-emerald-300 dark:border-emerald-700/60'
    : isOverdue
      ? 'border-rose-300 dark:border-rose-700/60'
      : isLocked
        ? 'border-slate-200 dark:border-slate-700'
        : isCancelled
          ? 'border-slate-200 dark:border-slate-700 opacity-70'
          : 'border-amber-300 dark:border-amber-700/60'

  const toneBadgeText = isPaid
    ? 'Đã đóng'
    : isOverdue
      ? 'Quá hạn'
      : isLocked
        ? 'Chưa mở'
        : isPending
          ? 'Chưa thanh toán'
          : INSTALLMENT_STATUS_LABEL[inst.status]

  const badgeTone = isPaid ? 'success' : isOverdue ? 'danger' : isLocked ? 'secondary' : tone

  return (
    <div
      className={`rounded-xl border-l-4 border ${borderClass} bg-white p-4 shadow-sm transition hover:shadow-md dark:bg-slate-900/40`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        {/* Left: ordinal + info */}
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-base font-bold ${isPaid
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
              : isOverdue
                ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
                : isLocked
                  ? 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                  : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
              }`}
            aria-hidden
          >
            {inst.ordinal}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold text-slate-900 dark:text-slate-100">
                {inst.label || `Đợt ${inst.ordinal}`}
              </p>
              <Badge variant={badgeTone}>{toneBadgeText}</Badge>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                Hạn: {effective.dueLabel}
              </span>
              {effective.paidDateLabel && (
                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                  ✓ Hoàn tất: {effective.paidDateLabel}
                </span>
              )}
              {effective.countdownLabel && (
                <span
                  className={`inline-flex items-center gap-1 font-medium ${isOverdue ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'
                    }`}
                >
                  <Clock className="h-3.5 w-3.5" />
                  {effective.countdownLabel}
                </span>
              )}
              {isDeposit && (
                <DepositCountdown
                  signedAt={signedAt}
                  paid={isPaid}
                  expired={isCancelled || isOverdue}
                />
              )}
            </div>
          </div>
        </div>

        {/* Right: amount + action */}
        <div className="flex flex-col items-end gap-1">
          <p className="text-lg font-bold text-slate-900 dark:text-slate-100 tabular-nums">
            {Number(inst.amount).toLocaleString('vi-VN')}
            <span className="ml-1 text-xs font-medium text-slate-500 dark:text-slate-400">VNĐ</span>
          </p>
          {inst.paidAmount != null && inst.paidAmount > 0 && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 tabular-nums">
              Đã đóng: {Number(inst.paidAmount).toLocaleString('vi-VN')} VNĐ
            </p>
          )}
          {canPay && (
            <Button variant="accent" size="sm" disabled={paying} onClick={() => void handlePay()} className="mt-1">
              {paying ? 'Đang xử lý...' : 'Thanh toán'}
            </Button>
          )}
          {role === 'Housing Developer' && isLocked && isManualUnlockTrigger(inst.triggerEvent) && projectId && (
            <div className="mt-1 flex flex-col items-end">
              {allPrevPaid ? (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={unlocking}
                  onClick={() => void handleUnlockDirect()}
                  className="border-indigo-300 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-600 dark:text-indigo-300 dark:hover:bg-indigo-950 text-xs gap-1 font-medium"
                >
                  <Unlock className="h-3.5 w-3.5" />
                  {unlocking ? 'Đang mở...' : `Mở ${inst.label || `Đợt ${inst.ordinal}`}`}
                </Button>
              ) : (
                <span className="text-[11px] italic text-slate-400 dark:text-slate-500">
                  🔒 Cần Đợt {inst.ordinal - 1} hoàn tất trước
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mini bar: phần trăm đợt này vs tổng */}
      <div className="mt-3">
        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
          <span>Tỉ trọng đợt trong tổng giá</span>
          <span className="font-medium tabular-nums">{phasePct}%</span>
        </div>
        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div
            className={`h-full rounded-full ${isPaid
              ? 'bg-emerald-500'
              : isOverdue
                ? 'bg-rose-500'
                : isLocked
                  ? 'bg-slate-300 dark:bg-slate-600'
                  : 'bg-amber-400'
              }`}
            style={{ width: `${phasePct}%` }}
          />
        </div>
      </div>

      {msg && (
        <Alert variant={msg.type === 'error' ? 'error' : 'success'} className="mt-3">
          {msg.text}
        </Alert>
      )}
    </div>
  )
}

function InfoRow({ label, value, mono }: { label: string; value: ReactNode; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</span>
      <span className={`text-sm ${mono ? 'font-mono' : 'font-medium'} text-slate-900 dark:text-slate-100 break-all`}>
        {value || <span className="text-slate-400">—</span>}
      </span>
    </div>
  )
}

function PaymentProgressCard({
  installments,
  paid,
  remaining,
  progress,
  contractPrice,
  officialPrice,
  housePrice,
}: {
  installments: PaymentInstallment[]
  paid: number
  remaining: number
  progress: number
  contractPrice: number | null
  officialPrice: number | null
  housePrice: number | null
}) {
  const sumPhases = installments.reduce((s, i) => s + (i.amount || 0), 0)
  const totalRef =
    contractPrice != null
      ? contractPrice
      : officialPrice != null
        ? officialPrice
        : housePrice != null
          ? housePrice
          : sumPhases
  const paidCount = installments.filter((i) => i.status === 'PAID').length
  const fmt = (n: number) => `${n.toLocaleString('vi-VN')} VNĐ`

  const pct = Math.max(0, Math.min(100, Number(progress) || 0))

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-indigo-50 via-white to-emerald-50 dark:border-slate-700 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400">
              <TrendingUp className="h-4 w-4" />
              Tiến độ thanh toán
            </div>
            <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {pct}%
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {paidCount}/{installments.length} đợt đã hoàn thành
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500 dark:text-slate-400">Tổng giá nhà</p>
            <p className="mt-1 text-base font-semibold text-slate-900 dark:text-slate-100">
              {fmt(totalRef)}
            </p>
          </div>
        </div>

        {/* Progress bar lớn + tick mark mỗi đợt */}
        <div className="mt-5">
          <div className="relative h-3 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-emerald-500 to-emerald-400 transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          {/* Tick marks (chia đều theo số đợt) */}
          {installments.length > 1 && (
            <div className="mt-1 grid w-full" style={{ gridTemplateColumns: `repeat(${installments.length}, minmax(0, 1fr))` }}>
              {installments.map((inst, idx) => {
                const isPaid = inst.status === 'PAID'
                return (
                  <div key={inst.installmentId} className="text-center">
                    <span className={`inline-block h-1.5 w-1.5 rounded-full ${isPaid ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                    {idx === installments.length - 1 ? null : null}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-white/70 p-3 ring-1 ring-slate-200 dark:bg-slate-900/50 dark:ring-slate-700">
            <p className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              Đã đóng
            </p>
            <p className="mt-1 text-base font-semibold text-emerald-700 dark:text-emerald-400">
              {fmt(paid)}
            </p>
          </div>
          <div className="rounded-xl bg-white/70 p-3 ring-1 ring-slate-200 dark:bg-slate-900/50 dark:ring-slate-700">
            <p className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              Còn lại
            </p>
            <p className="mt-1 text-base font-semibold text-amber-700 dark:text-amber-400">
              {fmt(remaining)}
            </p>
          </div>
          <div className="col-span-2 rounded-xl bg-white/70 p-3 ring-1 ring-slate-200 sm:col-span-1 dark:bg-slate-900/50 dark:ring-slate-700">
            <p className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <Banknote className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
              Số đợt
            </p>
            <p className="mt-1 text-base font-semibold text-indigo-700 dark:text-indigo-400">
              {installments.length} đợt theo lịch chủ đầu tư
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function InstallmentTimeline({
  installments,
  signedAt,
  onPaid,
  totalAmount,
  applicationId,
  applicationStatus,
  projectId,
  onUnlocked,
}: {
  installments: PaymentInstallment[]
  signedAt: string | null
  onPaid: () => void
  totalAmount: number
  applicationId: string
  applicationStatus: string
  projectId?: string
  onUnlocked?: () => void
}) {
  return (
    <ol className="relative space-y-3 border-l-2 border-dashed border-slate-200 pl-6 dark:border-slate-700 sm:pl-8">
      {installments.map((inst) => (
        <li key={inst.installmentId} className="relative">
          <InstallmentTimelineDot inst={inst} installments={installments} signedAt={signedAt} />
          <InstallmentRow
            inst={inst}
            signedAt={signedAt}
            onPaid={onPaid}
            totalAmount={totalAmount}
            applicationId={applicationId}
            applicationStatus={applicationStatus}
            installments={installments}
            projectId={projectId}
            onUnlocked={onUnlocked}
          />
        </li>
      ))}
    </ol>
  )
}

function InstallmentTimelineDot({
  inst,
  installments,
  signedAt,
}: {
  inst: PaymentInstallment
  installments?: PaymentInstallment[]
  signedAt?: string | null
}) {
  const isPaid = inst.status === 'PAID'
  const isCancelled = inst.status === 'CANCELLED'
  const isLocked = inst.status === 'LOCKED'
  const effective = installments ? getEffectiveInstallmentDueDate(inst, installments, signedAt) : null
  const isOverdue = !isPaid && !isLocked && !isCancelled && (inst.status === 'OVERDUE' || (effective?.isOverdue ?? false))

  let bg = 'bg-slate-100 dark:bg-slate-800'
  let ring = 'ring-white dark:ring-slate-900'
  let Icon: typeof CheckCircle2 = CircleDot
  let iconColor = 'text-slate-400'

  if (isPaid) {
    bg = 'bg-emerald-500'
    Icon = CheckCircle2
    iconColor = 'text-white'
  } else if (isCancelled) {
    bg = 'bg-slate-400'
    Icon = XCircle
    iconColor = 'text-white'
  } else if (isLocked) {
    bg = 'bg-slate-200 dark:bg-slate-700'
    Icon = Lock
    iconColor = 'text-slate-500 dark:text-slate-400'
  } else if (isOverdue) {
    bg = 'bg-rose-500'
    Icon = AlertTriangle
    iconColor = 'text-white'
  } else {
    bg = 'bg-amber-100 dark:bg-amber-900/40'
    Icon = Clock
    iconColor = 'text-amber-600 dark:text-amber-400'
  }

  return (
    <div
      className={`absolute -left-[37px] flex h-7 w-7 items-center justify-center rounded-full ring-4 ${bg} ${ring} sm:-left-[45px]`}
      aria-hidden
    >
      <Icon className={`h-3.5 w-3.5 ${iconColor}`} />
    </div>
  )
}

/**
 * Tạo 6 đợt fallback khi API /api/Payment/installments/{id} lỗi.
 * Theo PAY.MD: Đợt 1=10%, Đợt 2=20%, Đợt 3=20%, Đợt 4=20%,
 * Đợt 5=25%+2%PBT, Đợt 6=5%.
 * Hạn đợt 1 = signedAt + 168h (7 ngày), các đợt sau +60 ngày mỗi đợt.
 */

function ApplicationSummaryCard({
  appDetail,
  status,
  installments,
}: {
  appDetail: ApplicationDetailDto | null
  status: ContractStatusDto | null
  installments: PaymentInstallment[]
}) {
  // parseApplicationDetail chuẩn hoá các field apartment (xem FE/src/api/housing-applications.ts).
  // Type gốc ApplicationDetailDto không khai báo các field runtime này nên cast qua unknown.
  const apt = appDetail as unknown as {
    apartmentArea?: number | null
    apartmentUnitName?: string | null
    apartmentCode?: string | null
    apartmentPrice?: number | null
  } | null
  const sumPhases = installments.reduce((s, i) => s + (i.amount || 0), 0)
  const basePrice = apt?.apartmentPrice ?? null
  const apartmentArea = apt?.apartmentArea ?? null
  const apartmentCode = apt?.apartmentUnitName ?? apt?.apartmentCode ?? null

  return (
    <div className="rounded-xl border border-slate-200 bg-white/70 p-4 dark:border-slate-700 dark:bg-slate-900/40">
      <div className="mb-3 flex items-center gap-2">
        <FileText className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
        <h4 className="font-semibold">Thông tin hồ sơ mua nhà</h4>
      </div>

      <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
        <InfoRow label="Mã hồ sơ" value={appDetail?.applicationId} mono />
        <InfoRow
          label="Trạng thái hồ sơ"
          value={formatAppStatusVi(appDetail?.applicationStatus ?? status?.applicationStatus)}
        />
        <InfoRow label="Dự án" value={appDetail?.projectName} />
        <InfoRow label="Mã dự án" value={appDetail?.projectId} mono />
        <InfoRow label="Người mua" value={appDetail?.fullName} />
        <InfoRow label="CCCD/CMND" value={appDetail?.citizenId} mono />
        <InfoRow label="Số căn hộ" value={apartmentCode} mono />
        <InfoRow
          label="Diện tích"
          value={apartmentArea != null ? `${apartmentArea} m²` : null}
        />
        <InfoRow
          label="Giá niêm yết căn"
          value={basePrice != null ? `${basePrice.toLocaleString('vi-VN')} VNĐ` : null}
        />
        <InfoRow
          label={`Tổng ${installments.length > 0 ? `${installments.length} đợt` : 'các đợt'} phải trả`}
          value={sumPhases > 0 ? `${sumPhases.toLocaleString('vi-VN')} VNĐ` : null}
        />
        <InfoRow
          label="Ngày nộp hồ sơ"
          value={appDetail?.submittedAt ? new Date(appDetail.submittedAt).toLocaleDateString('vi-VN') : null}
        />
        <InfoRow
          label="Ngày quyết định"
          value={
            appDetail?.finalDecisionDate
              ? new Date(appDetail.finalDecisionDate).toLocaleDateString('vi-VN')
              : null
          }
        />
        <InfoRow
          label="Ký HĐ lúc"
          value={status?.signedAt ? new Date(status.signedAt).toLocaleString('vi-VN') : null}
        />
      </div>
    </div>
  )
}

export function ContractDetailPage() {
  const id = readApplicationId()
  const role = getRole()
  const [status, setStatus] = useState<ContractStatusDto | null>(null)
  const [installments, setInstallments] = useState<PaymentInstallment[]>([])
  const [installmentsError, setInstallmentsError] = useState(false)
  const [officialPrice, setOfficialPrice] = useState<number | null>(null)
  const [housePrice, setHousePrice] = useState<number | null>(null)
  const [contractPrice, setContractPrice] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [appDetail, setAppDetail] = useState<ApplicationDetailDto | null>(null)

  const reload = async () => {
    if (!id) return
    setLoading(true)
    setError('')
    let appDetailSnapshot: import('../types').ApplicationDetailDto | null = null

    try {
      try {
        const s = await contractApi.getStatus(id)
        setStatus(parseContractStatus(s))
      } catch {
        setStatus(null)
      }
      // Load appDetail trước — dùng làm fallback cho installments nếu API lỗi.
      try {
        const d = await request<unknown>(`/api/housing-applications/${id}`, { auth: true })
        appDetailSnapshot = parseApplicationDetail(d) ?? null
        setAppDetail(appDetailSnapshot)
      } catch {
        appDetailSnapshot = null
        setAppDetail(null)
      }
      try {
        const i = await contractApi.getInstallments(id)
        const env = parseInstallmentsEnvelope(i)
        setInstallments(env.installments)
        setInstallmentsError(false)
        setOfficialPrice(env.officialPrice ?? null)
        setHousePrice(env.housePrice ?? null)
        setContractPrice(env.contractPrice ?? null)
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[contract] getInstallments failed:', err)
        // Không dùng dữ liệu giả lập — báo lỗi rõ ràng để CĐT kiểm tra BE.
        setInstallments([])
        setInstallmentsError(true)
        setHousePrice(null)
        setContractPrice(null)
        setOfficialPrice(null)
      }
    } catch (err) {
      setError(formatError(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void reload() }, [id])

  const signContract = async () => {
    if (!id || busy) return
    setBusy(true)
    setMsg(null)
    try {
      await contractApi.sign(id)
      await reload()
      setMsg({ type: 'success', text: 'Đồng ý điều khoản hợp đồng thành công.' })
    } catch (err) {
      setMsg({ type: 'error', text: formatError(err) })
    } finally {
      setBusy(false)
    }
  }

  if (!id) {
    return (
      <PageCard className="p-6">
        <Alert variant="error">Không tìm thấy hồ sơ. Vui lòng chọn từ danh sách hợp đồng.</Alert>
        <Button className="mt-3" variant="outline" onClick={() => navigate('contracts')}>
          ← Danh sách hợp đồng
        </Button>
      </PageCard>
    )
  }

  if (loading) {
    return (
      <PageCard className="p-6"><p className="text-sm text-slate-500 dark:text-slate-400">Đang tải...</p></PageCard>
    )
  }

  if (error) {
    return (
      <PageCard className="p-6"><Alert variant="error">{error}</Alert></PageCard>
    )
  }

  const derivedStatus = mapStatus(status)
  const { paid, remaining, progress } = summarizeInstallments(installments)
  const hasApartment = appDetail?.apartmentId != null
  const effectiveStatus = status?.applicationStatus || appDetail?.applicationStatus || ''
  const deposit1Paid = isPhase1Paid(installments, effectiveStatus)
  const canSign =
    role === 'Applicant' &&
    !status?.isSigned &&
    canSignAfterDeposit({
      applicationStatus: effectiveStatus,
      hasApartment,
      depositPaid: deposit1Paid,
    })
  const projectId = readProjectId() || appDetail?.projectId || ''

  return (
    <div>
      <PageCard className="space-y-6 p-6">
        <Button variant="ghost" size="sm" className="-ml-2 mb-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100" onClick={() => navigate('contracts')}>
          ← Danh sách hợp đồng
        </Button>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <ContractStatusBadge status={derivedStatus} />
        </div>

        {/* Thông tin hồ sơ đầy đủ (mã hồ sơ, căn hộ, dự án, giá) */}
        <ApplicationSummaryCard appDetail={appDetail} status={status} installments={installments} />

        {msg && <Alert variant={msg.type === 'error' ? 'error' : 'success'}>{msg.text}</Alert>}

        {/* Ký hợp đồng: đọc PDF rồi mới ký */}
        <SignContractSection
          canSign={canSign}
          signing={busy}
          onSign={() => void signContract()}
          applicationId={id}
          applicationStatus={effectiveStatus}
        />
        {role === 'Applicant' && deposit1Paid && !hasApartment && !status?.isSigned && (
          <Alert variant="info">
            Đã đóng cọc Đợt 1. Chủ đầu tư cần gán căn hộ cụ thể trước khi bạn ký hợp đồng.
          </Alert>
        )}

        {/* Tải PDF: hiện từ CONTRACT_PENDING trở đi, dùng fetch blob + JWT */}
        {(status?.applicationStatus === 'CONTRACT_PENDING' || status?.applicationStatus === 'CONTRACT_SIGNED' || status?.applicationStatus === 'CONTRACTING' || status?.applicationStatus === 'PARTIALLY_PAID' || status?.applicationStatus === 'PAID' || status?.applicationStatus === 'FULLY_PAID') && (
          <Button
            variant="outline"
            onClick={async () => {
              try {
                await downloadContractPdf(id)
              } catch (err) {
                setMsg({ type: 'error', text: formatError(err) })
              }
            }}
          >
            <Download className="mr-1.5 h-4 w-4" /> Tải PDF hợp đồng
          </Button>
        )}

        {/* Tiến độ thanh toán + Lịch thanh toán */}
        {installmentsError && (
          <section>
            <div className="rounded-md border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-700 dark:bg-yellow-900/20">
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                {scheduleLoadErrorCopy(role).title}
              </p>
              <p className="mt-1 text-xs text-yellow-700 dark:text-yellow-400">
                {scheduleLoadErrorCopy(role).body}
              </p>
              <button
                onClick={() => void reload()}
                className="mt-2 text-xs text-yellow-700 underline hover:no-underline dark:text-yellow-300"
              >
                Thử lại
              </button>
            </div>
          </section>
        )}

        {!installmentsError && installments.length > 0 && (
          <section className="space-y-5">
            <PaymentProgressCard
              installments={installments}
              paid={paid}
              remaining={remaining}
              progress={progress}
              contractPrice={contractPrice}
              officialPrice={officialPrice}
              housePrice={housePrice}
            />

            <div>
              <div className="mb-3 flex items-baseline justify-between">
                <h4 className="text-base font-semibold">Lịch thanh toán</h4>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {installments.length} đợt theo lịch chủ đầu tư
                </span>
              </div>

              {/* Cảnh báo BE nếu sum(đợt) không khớp giá nhà */}
              {(() => {
                const sumPhases = installments.reduce((s, i) => s + (i.amount || 0), 0)
                const ref =
                  contractPrice != null
                    ? contractPrice
                    : housePrice != null
                      ? housePrice
                      : null
                if (ref == null) return null
                const diff = Math.abs(sumPhases - ref)
                const mismatch = diff > 1000
                if (!mismatch) return null
                return (
                  <Alert variant="warning" className="mb-4">
                    <div>
                      <p className="font-medium">
                        Số tiền lịch thanh toán không khớp giá nhà chính thức.
                      </p>
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                        Tổng {installments.length > 0 ? `${installments.length} đợt` : 'các đợt'}: <b>{sumPhases.toLocaleString('vi-VN')}</b> VNĐ —
                        Giá nhà: <b>{ref.toLocaleString('vi-VN')}</b> VNĐ
                        {(sumPhases - ref > 0 ? '+' : '') + (sumPhases - ref).toLocaleString('vi-VN')} VNĐ).
                        {scheduleMismatchHint(role)}
                      </p>
                    </div>
                  </Alert>
                )
              })()}

              <InstallmentTimeline
                installments={installments}
                signedAt={status?.signedAt ?? null}
                onPaid={() => void reload()}
                totalAmount={
                  contractPrice != null
                    ? contractPrice
                    : officialPrice != null
                      ? officialPrice
                      : housePrice != null
                        ? housePrice
                        : installments.reduce((s, i) => s + (i.amount || 0), 0)
                }
                applicationId={id}
                applicationStatus={status?.applicationStatus ?? appDetail?.applicationStatus ?? ''}
                projectId={projectId}
                onUnlocked={() => void reload()}
              />
            </div>
          </section>
        )}

        {!installmentsError && installments.length === 0 && hasApartment && (
          <Alert variant="warning">
            <div className="space-y-2">
              <p className="font-medium">
                {emptyScheduleHasApartmentCopy(role).title}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {emptyScheduleHasApartmentCopy(role).body}{' '}
                (Mã hồ sơ: <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">{id.slice(0, 8)}…</code>)
              </p>
              <Button size="sm" variant="outline" onClick={() => void reload()}>
                Tải lại
              </Button>
            </div>
          </Alert>
        )}

        {!installmentsError && installments.length === 0 && !hasApartment && (
          <Alert variant="info">
            <strong>{emptyScheduleNoApartmentCopy(role).title}.</strong>{' '}
            {emptyScheduleNoApartmentCopy(role).body}
          </Alert>
        )}
      </PageCard>
    </div>
  )
}
