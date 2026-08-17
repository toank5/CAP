import { useEffect, useState, type ReactNode } from 'react'
import { FileText, PenLine, Download, Wallet, Unlock, Hammer, HardHat, KeyRound, BookOpen, CheckCircle2, Clock, AlertTriangle, XCircle, Lock, Calendar, Banknote, TrendingUp, CircleDot } from 'lucide-react'
import {
  contractApi,
  CONTRACT_STATUS_LABEL,
  CONTRACT_STATUS_TONE,
  INSTALLMENT_STATUS_LABEL,
  INSTALLMENT_STATUS_TONE,
  parseContractStatus,
  parseInstallmentsEnvelope,
  summarizeInstallments,
  UNLOCK_PHASE_LABEL,
  UNLOCK_PHASE_ORDINAL,
  type ContractStatusDto,
  type PaymentInstallment,
  type ContractStatus,
  type UnlockPhaseTrigger,
} from '@/api/contracts'
import { parseApplicationDetail } from '@/api/housing-applications'
import { request } from '@/api/http'
import type { ApplicationDetailDto } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { PageCard, PageHeader } from '@/components/layout/page-header'
import { navigate } from '@/hooks/useHashRoute'
import { formatError } from '@/lib/format-error'
import { getRole } from '@/router'
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
      <PageHeader routeId="contracts" />
      <PageCard className="p-6">
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          {loading ? 'Đang tải...' : `${applications.length} hồ sơ có hợp đồng (chờ ký / đã ký / đã TT Đợt 1)`}
        </p>
        {error && <Alert variant="error">{error}</Alert>}
        {!loading && applications.length === 0 && (
          <Alert variant="info">
            Chưa có hồ sơ nào ở bước hợp đồng. Hồ sơ xuất hiện khi CĐT chốt suất hoặc trúng bốc thăm
            (<strong> chờ ký</strong> → ký → thanh toán Đợt 1).
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
                  CCCD: {a.citizenId} · Trạng thái: {a.applicationStatus}
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
      <PageHeader routeId="contract-create" />
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

/**
 * Thanh điều khiển của CĐT: mở (unlock) Đợt 3-6 theo tiến độ xây dựng.
 * Hiển thị sau khi người dân đã ký HĐ (signedAt có).
 * Quy tắc nghiệp vụ (PAY.MD):
 *   - Đợt trước phải PAID thì mới được mở đợt sau.
 *   - Đợt đã PAID/CANCELLED thì nút bị disable.
 */
function DeveloperUnlockBar({
  projectId,
  installments,
  onUnlocked,
}: {
  projectId: string
  installments: PaymentInstallment[]
  onUnlocked: () => void
}) {
  const [busy, setBusy] = useState<UnlockPhaseTrigger | ''>('')
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const phases: { trigger: UnlockPhaseTrigger; icon: typeof Hammer; ordinal: number }[] = [
    { trigger: 'CONSTRUCTION_ROUGH_FLOOR', icon: Hammer, ordinal: 3 },
    { trigger: 'ROOFING_COMPLETED', icon: HardHat, ordinal: 4 },
    { trigger: 'HANDOVER', icon: KeyRound, ordinal: 5 },
    { trigger: 'RED_BOOK_ISSUED', icon: BookOpen, ordinal: 6 },
  ]

  const isPrevPaid = (ordinal: number): boolean => {
    if (ordinal <= 1) return true // Đợt 3 cần Đợt 2 PAID; ordinal=3 → check ordinal=2
    const prev = installments.find((i) => i.ordinal === ordinal - 1)
    return !prev || prev.status === 'PAID'
  }
  const findInst = (ordinal: number) => installments.find((i) => i.ordinal === ordinal)

  const handleUnlock = async (trigger: UnlockPhaseTrigger) => {
    if (!projectId || busy) return
    const ordinal = UNLOCK_PHASE_ORDINAL[trigger]
    const inst = findInst(ordinal)
    if (inst?.status === 'PAID' || inst?.status === 'CANCELLED') return
    if (!isPrevPaid(ordinal)) {
      setMsg({ type: 'error', text: `Đợt ${ordinal - 1} chưa thanh toán — không thể mở Đợt ${ordinal}.` })
      return
    }
    setBusy(trigger)
    setMsg(null)
    try {
      await contractApi.unlockPhase(projectId, trigger)
      await onUnlocked()
      setMsg({ type: 'success', text: `Đã mở Đợt ${ordinal} (${UNLOCK_PHASE_LABEL[trigger]}).` })
    } catch (err) {
      setMsg({ type: 'error', text: formatError(err) })
    } finally {
      setBusy('')
    }
  }

  return (
    <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 dark:border-indigo-800 dark:bg-indigo-950/20">
      <div className="mb-2 flex items-center gap-2">
        <Unlock className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
        <h4 className="font-semibold">Mở đợt thanh toán theo tiến độ (CĐT)</h4>
      </div>
      <p className="mb-3 text-xs text-slate-600 dark:text-slate-400">
        Bấm mở khi đến mốc tiến độ tương ứng. Đợt trước phải được người dân thanh toán trước.
      </p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {phases.map(({ trigger, icon: Icon, ordinal }) => {
          const inst = findInst(ordinal)
          const opened = !!inst // BE chỉ trả về khi unlock xong
          const paid = inst?.status === 'PAID'
          const cancelled = inst?.status === 'CANCELLED'
          const disabled = !projectId || paid || cancelled || !isPrevPaid(ordinal) || !!busy
          const label = `Đợt ${ordinal}`
          const sub = UNLOCK_PHASE_LABEL[trigger]
          return (
            <button
              key={trigger}
              type="button"
              disabled={disabled}
              onClick={() => void handleUnlock(trigger)}
              className={`flex flex-col items-start gap-1 rounded-lg border p-3 text-left text-sm transition ${
                paid
                  ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30'
                  : disabled
                    ? 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-700 dark:bg-slate-800/40'
                    : 'border-indigo-200 bg-white hover:border-indigo-400 hover:bg-indigo-50 dark:border-indigo-800 dark:bg-slate-900 dark:hover:bg-indigo-950/40'
              }`}
            >
              <span className="flex items-center gap-2 font-semibold">
                <Icon className="h-4 w-4" />
                {label}
              </span>
              <span className="text-xs">{sub}</span>
              <span className="text-[11px]">
                {paid ? '✓ Đã thanh toán' : cancelled ? '✗ Đã hủy' : opened ? '⏳ Chờ thanh toán' : '🔒 Chưa mở'}
              </span>
            </button>
          )
        })}
      </div>
      {msg && <Alert variant={msg.type === 'error' ? 'error' : 'success'} className="mt-3">{msg.text}</Alert>}
    </div>
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
}: {
  inst: PaymentInstallment
  onPaid: () => void
  signedAt: string | null
  totalAmount: number
  applicationId: string
  applicationStatus: string
  installments: PaymentInstallment[]
}) {
  const [paying, setPaying] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const isOverdue = inst.status !== 'PAID' && new Date(inst.dueDate) < new Date()
  const isDeposit = inst.ordinal === 1
  const tone = INSTALLMENT_STATUS_TONE[inst.status]
  const role = getRole()

  // Đợt cho phép thanh toán khi:
  // - Đợt 1: create-payment-url (luồng đặt cọc trước ký) HOẶC
  // - Đợt đang PENDING/OVERDUE (BE raw status) VÀ tất cả đợt trước đã PAID
  const allPrevPaid =
    inst.ordinal === 1 ||
    installments.every((p) => p.ordinal < inst.ordinal || p.status === 'PAID')
  const canPay =
    role === 'Applicant' &&
    (inst._rawStatus === 'PENDING' || inst._rawStatus === 'OVERDUE') &&
    allPrevPaid

  const isPaid = inst.status === 'PAID'
  const isLocked = inst.status === 'LOCKED'
  const isCancelled = inst.status === 'CANCELLED'
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
          text: 'Lỗi đồng bộ: hệ thống chưa tạo lịch thanh toán cho hồ sơ này. Vui lòng liên hệ CĐT hoặc thử lại sau.',
        })
      } else if (/trạng thái thích hợp|status.*not\s*suitable|invalid.*status|400\b/i.test(msg)) {
        // BE trả 400 → application chưa ở status phù hợp để thanh toán.
        // Theo flow: cần DEPOSIT_PENDING / CONTRACT_PENDING / CONTRACTING.
        setMsg({
          type: 'error',
          text: 'Hồ sơ chưa ở trạng thái cho phép thanh toán. Vui lòng kiểm tra: đã được CĐT gán căn và phê duyệt chưa?',
        })
      } else {
        setMsg({ type: 'error', text: msg })
      }
    } finally {
      setPaying(false)
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
    : isPending
    ? 'Chưa thanh toán'
    : INSTALLMENT_STATUS_LABEL[inst.status]

  const badgeTone = isOverdue ? 'danger' : tone

  const dueDate = new Date(inst.dueDate)
  const dueLabel = dueDate.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
  const daysLeft = Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  const countdownLabel =
    isPaid
      ? null
      : isOverdue
      ? `Quá hạn ${Math.abs(daysLeft)} ngày`
      : daysLeft >= 0
      ? `Còn ${daysLeft} ngày`
      : null

  return (
    <div
      className={`rounded-xl border-l-4 border ${borderClass} bg-white p-4 shadow-sm transition hover:shadow-md dark:bg-slate-900/40`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        {/* Left: ordinal + info */}
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-base font-bold ${
              isPaid
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
                Hạn: {dueLabel}
              </span>
              {countdownLabel && (
                <span
                  className={`inline-flex items-center gap-1 font-medium ${
                    isOverdue ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'
                  }`}
                >
                  <Clock className="h-3.5 w-3.5" />
                  {countdownLabel}
                </span>
              )}
              {isDeposit && (
                <DepositCountdown
                  signedAt={signedAt}
                  paid={isPaid}
                  expired={isCancelled || inst.status === 'OVERDUE'}
                />
              )}
            </div>
            {inst.ordinal === 5 && (
              <p className="mt-1.5 text-[11px] text-amber-700 dark:text-amber-400">
                Bao gồm 25% tiền bàn giao + 2% phí bảo trì (PBT theo Luật Nhà ở)
              </p>
            )}
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
            className={`h-full rounded-full ${
              isPaid
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
  const hp = housePrice ?? contractPrice
  const pbt =
    hp != null && sumPhases > hp
      ? Math.max(0, sumPhases - hp)
      : hp != null
      ? Math.round((hp * 0.02) / 1000) * 1000
      : null
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
            {pbt != null && (
              <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                bao gồm 2% PBT ({fmt(pbt)})
              </p>
            )}
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
              {installments.length} đợt theo Luật Nhà ở
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
}: {
  installments: PaymentInstallment[]
  signedAt: string | null
  onPaid: () => void
  totalAmount: number
  applicationId: string
  applicationStatus: string
}) {
  return (
    <ol className="relative space-y-3 border-l-2 border-dashed border-slate-200 pl-6 dark:border-slate-700 sm:pl-8">
      {installments.map((inst) => (
        <li key={inst.installmentId} className="relative">
          <InstallmentTimelineDot inst={inst} />
          <InstallmentRow
            inst={inst}
            signedAt={signedAt}
            onPaid={onPaid}
            totalAmount={totalAmount}
            applicationId={applicationId}
            applicationStatus={applicationStatus}
            installments={installments}
          />
        </li>
      ))}
    </ol>
  )
}

function InstallmentTimelineDot({ inst }: { inst: PaymentInstallment }) {
  const isPaid = inst.status === 'PAID'
  const isOverdue = inst.status !== 'PAID' && new Date(inst.dueDate) < new Date()
  const isCancelled = inst.status === 'CANCELLED'
  const isLocked = inst.status === 'LOCKED'

  let bg = 'bg-slate-100 dark:bg-slate-800'
  let ring = 'ring-white dark:ring-slate-900'
  let Icon: typeof CheckCircle2 = CircleDot
  let iconColor = 'text-slate-400'

  if (isPaid) {
    bg = 'bg-emerald-500'
    Icon = CheckCircle2
    iconColor = 'text-white'
  } else if (isOverdue) {
    bg = 'bg-rose-500'
    Icon = AlertTriangle
    iconColor = 'text-white'
  } else if (isCancelled) {
    bg = 'bg-slate-400'
    Icon = XCircle
    iconColor = 'text-white'
  } else if (isLocked) {
    bg = 'bg-slate-200 dark:bg-slate-700'
    Icon = Lock
    iconColor = 'text-slate-500 dark:text-slate-400'
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
  const pbt =
    basePrice != null && sumPhases > basePrice
      ? Math.max(0, sumPhases - basePrice)
      : basePrice != null
      ? Math.round((basePrice * 0.02) / 1000) * 1000
      : null
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
        <InfoRow label="Trạng thái hồ sơ" value={appDetail?.applicationStatus ?? status?.applicationStatus} />
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
          label="Tổng 6 đợt phải trả"
          value={sumPhases > 0 ? `${sumPhases.toLocaleString('vi-VN')} VNĐ` : null}
        />
        {pbt != null && (
          <InfoRow
            label="Phí bảo trì 2% (PBT)"
            value={`${pbt.toLocaleString('vi-VN')} VNĐ`}
          />
        )}
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
      <div>
        <PageHeader routeId="contract-detail" />
        <PageCard className="p-6">
          <Alert variant="error">Không tìm thấy hồ sơ. Vui lòng chọn từ danh sách hợp đồng.</Alert>
          <Button className="mt-3" variant="outline" onClick={() => navigate('contracts')}>
            ← Danh sách hợp đồng
          </Button>
        </PageCard>
      </div>
    )
  }

  if (loading) {
    return (
      <div>
        <PageHeader routeId="contract-detail" />
        <PageCard className="p-6"><p className="text-sm text-slate-500 dark:text-slate-400">Đang tải...</p></PageCard>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <PageHeader routeId="contract-detail" />
        <PageCard className="p-6"><Alert variant="error">{error}</Alert></PageCard>
      </div>
    )
  }

  const derivedStatus = mapStatus(status)
  const { paid, remaining, progress } = summarizeInstallments(installments)
  const hasApartment = appDetail?.apartmentId != null
  // Ký: Applicant && (CONTRACT_PENDING || DEPOSIT_PENDING || CONTRACTING) && chưa ký
  // && căn đã gán (phases sẽ sinh sau khi gán căn).
  // Nếu chưa gán căn → hiện banner thay vì nút.
  const canSign =
    role === 'Applicant' &&
    !status?.isSigned &&
    (
      status?.applicationStatus === 'CONTRACT_PENDING' ||
      status?.applicationStatus === 'DEPOSIT_PENDING' ||
      status?.applicationStatus === 'CONTRACTING'
    ) &&
    hasApartment
  const projectId = readProjectId()
  const canDeveloperUnlock =
    role === 'Housing Developer' && !!projectId && !!status?.isSigned

  return (
    <div>
      <PageHeader routeId="contract-detail" />
      <PageCard className="space-y-6 p-6">
        <Button variant="ghost" className="mb-2" onClick={() => navigate('contracts')}>← Danh sách hợp đồng</Button>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <ContractStatusBadge status={derivedStatus} />
        </div>

        {/* Thông tin hồ sơ đầy đủ (mã hồ sơ, căn hộ, dự án, giá) */}
        <ApplicationSummaryCard appDetail={appDetail} status={status} installments={installments} />

        {msg && <Alert variant={msg.type === 'error' ? 'error' : 'success'}>{msg.text}</Alert>}

        {/* Ký hợp đồng */}
        {canSign && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-800 dark:bg-amber-950/30">
            <h4 className="mb-2 font-semibold">Bạn cần đồng ý điều khoản hợp đồng mua bán nhà ở xã hội</h4>
            <p className="mb-3 text-sm text-slate-700 dark:text-slate-300">
              Bằng việc bấm «Đồng ý», bạn xác nhận đã đọc và đồng ý với các điều khoản mua bán nhà ở xã hội.
            </p>
            <Button variant="accent" disabled={busy} onClick={() => void signContract()}>
              <PenLine className="mr-1.5 h-4 w-4" />{busy ? 'Đang ký...' : 'Đồng ý điều khoản'}
            </Button>
          </div>
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

        {/* CĐT: mở đợt 3-6 theo tiến độ */}
        {canDeveloperUnlock && (
          <DeveloperUnlockBar
            projectId={projectId}
            installments={installments}
            onUnlocked={() => void reload()}
          />
        )}

        {/* Tiến độ thanh toán + Lịch thanh toán */}
        {installmentsError && (
          <section>
            <div className="rounded-md border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-700 dark:bg-yellow-900/20">
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                Chưa tải được lịch thanh toán chính thức từ hệ thống.
              </p>
              <p className="mt-1 text-xs text-yellow-700 dark:text-yellow-400">
                Hồ sơ có thể chưa được tạo đợt thanh toán hoặc backend đang gặp sự cố.
                Vui lòng liên hệ CĐT hoặc thử lại sau.
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
                  {installments.length} đợt · theo Luật Nhà ở
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
                        Tổng 6 đợt: <b>{sumPhases.toLocaleString('vi-VN')}</b> VNĐ —
                        Giá nhà: <b>{ref.toLocaleString('vi-VN')}</b> VNĐ
                        (chênh {(sumPhases - ref > 0 ? '+' : '') + (sumPhases - ref).toLocaleString('vi-VN')} VNĐ).
                        Vui lòng báo CĐT/ban quản lý đối soát.
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
              />
            </div>
          </section>
        )}

        {!installmentsError && installments.length === 0 && hasApartment && (
          <Alert variant="warning">
            <div className="space-y-2">
              <p className="font-medium">
                Hợp đồng đã ký nhưng hệ thống chưa sinh lịch thanh toán.
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Vui lòng liên hệ CĐT / Ban quản lý dự án để được tạo lịch 6 đợt.
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
            <strong>Chưa có lịch thanh toán.</strong> Hệ thống sẽ sinh lịch 6 đợt sau khi CĐT gán căn hộ cho bạn.
          </Alert>
        )}
      </PageCard>
    </div>
  )
}
