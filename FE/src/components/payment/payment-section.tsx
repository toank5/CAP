import { useEffect, useRef, useState } from 'react'
import {
  CheckCircle2, Clock, AlertTriangle, XCircle, Lock, Calendar, Banknote,
  TrendingUp, CircleDot, PenLine, Download, History, Home, FileText, Loader2, RefreshCw,
  ChevronUp, Eye,
} from 'lucide-react'
import {
  INSTALLMENT_STATUS_LABEL,
  INSTALLMENT_STATUS_TONE,
  contractApi,
  isManualUnlockTrigger,
  type PaymentInstallment,
} from '@/api/contracts'
import {
  extractOrderId,
  extractPaymentUrl,
  paymentApi,
  downloadContractPdf,
  fetchContractPdfBlob,
  type CancellationPreviewDto,
} from '@/api/payment'
import { openVnPayPopupAndWait, vnPayResultMessage } from '@/lib/vnpay-popup'
import { formatError } from '@/lib/format-error'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/label'
import { Input, Textarea } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import {
  emptyScheduleHasApartmentCopy,
  emptyScheduleNoApartmentCopy,
  payScheduleMissingError,
  payStatusNotReadyError,
  scheduleLoadErrorCopy,
  scheduleMismatchHint,
} from '@/lib/payment-schedule-copy'
import { getRole } from '@/router'
import type { PaymentInfoDto } from '@/types'


// ─── Deposit countdown ───────────────────────────────────────────────────────────

export function DepositCountdown({
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

  const deadline = new Date(signedAt).getTime() + 168 * 60 * 60 * 1000
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
  const urgent = ms < 24 * 60 * 60 * 1000
  const critical = ms < 6 * 60 * 60 * 1000
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

// ─── Unlock Button (CĐT) ───────────────────────────────────────────────────────

interface UnlockButtonProps {
  projectId?: string
  inst: PaymentInstallment
  allInstallments: PaymentInstallment[]
  onUnlocked?: () => void
}

function UnlockButton({ projectId, inst, allInstallments, onUnlocked }: UnlockButtonProps) {
  const [busy, setBusy] = useState(false)
  const trigger = inst.triggerEvent
  if (!projectId || !trigger || !isManualUnlockTrigger(trigger)) return null

  // Đợt trước phải ĐÃ THANH TOÁN (status === 'PAID') thì mới hiển thị nút mở đợt tiếp theo
  const allPrevPaid = allInstallments
    .filter((i) => i.ordinal < inst.ordinal)
    .every((i) => i.status === 'PAID')

  if (!allPrevPaid) {
    return (
      <span className="mt-1 text-[11px] italic text-slate-400 dark:text-slate-500">
        🔒 Cần Đợt {inst.ordinal - 1} hoàn tất trước
      </span>
    )
  }

  const handle = async () => {
    setBusy(true)
    try {
      await contractApi.unlockPhase(projectId, trigger)
      onUnlocked?.()
    } finally {
      setBusy(false)
    }
  }

  const label = inst.label?.trim() ? `Mở ${inst.label}` : `Mở đợt ${inst.ordinal}`

  return (
    <Button variant="outline" size="sm" disabled={busy} onClick={() => void handle()} className="mt-1 border-violet-300 text-violet-700 hover:bg-violet-50 dark:border-violet-600 dark:text-violet-300 dark:hover:bg-violet-950 text-xs font-medium">
      {busy ? 'Đang mở...' : label}
    </Button>
  )
}

// ─── Installment Row ────────────────────────────────────────────────────────────

interface InstallmentRowProps {
  inst: PaymentInstallment
  onPaid: () => void
  signedAt: string | null
  totalAmount: number
  applicationId: string
  applicationStatus: string
  installments: PaymentInstallment[]
  role?: string
  projectId?: string
  onUnlocked?: () => void
}

export function InstallmentRow({
  inst,
  onPaid,
  signedAt,
  applicationId,
  applicationStatus,
  installments,
  role,
  projectId,
  onUnlocked,
}: Omit<InstallmentRowProps, 'totalAmount'>) {
  const [paying, setPaying] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const isOverdue = inst.status !== 'PAID' && new Date(inst.dueDate) < new Date()
  const tone = INSTALLMENT_STATUS_TONE[inst.status]

  const allPrevPaid =
    inst.ordinal === 1 ||
    installments
      .filter((p) => p.ordinal < inst.ordinal)
      .every((p) => p.status === 'PAID')

  // ordinal-based unlocking: ordinal 1 always pay-able; ordinal>1 only after previous PAID
  const canPay = role !== 'Housing Developer' && allPrevPaid && (inst.status === 'UNPAID' || inst.status === 'OVERDUE')

  const isPaid = inst.status === 'PAID'
  const isLocked = inst.status === 'LOCKED'
  const isCancelled = inst.status === 'CANCELLED'
  const isPending = inst.status === 'UNPAID'

  const handlePay = async () => {
    setPaying(true)
    setMsg(null)
    try {
      let paymentUrl: string | null = null
      let orderId: string | null = null

      const isDeposit1PreSign =
        inst.ordinal === 1 &&
        (applicationStatus === 'APPROVED' ||
          applicationStatus === 'APPROVED_BY_TIMEOUT' ||
          applicationStatus === 'DEPOSIT_PENDING' ||
          applicationStatus === 'CONTRACT_PENDING')
      const isDeposit1PostSign = inst.ordinal === 1 && applicationStatus === 'CONTRACT_SIGNED'

      if (isDeposit1PreSign || isDeposit1PostSign) {
        const res = await paymentApi.createPaymentUrl({
          ApplicationId: applicationId,
          Ordinal: 1,
          ReturnUrl: `${window.location.origin}/my-apartment`,
        })
        paymentUrl = extractPaymentUrl(res)
        orderId = extractOrderId(res)
      } else {
        const res = await contractApi.payInstallment(
          inst.installmentId,
          `${window.location.origin}/my-apartment`,
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
      const errMsg = formatError(err)
      const isNotFound =
        /not\s*found|not\s*exist|không\s*tìm\s*thấy|không\s*tồn\s*tại|installment/i.test(errMsg) ||
        (err instanceof Error && String(err.message).includes('404'))
      if (isNotFound) {
        setMsg({
          type: 'error',
          text: payScheduleMissingError(role),
        })
      } else if (/trạng thái thích hợp|status.*not\s*suitable|invalid.*status|400\b/i.test(errMsg)) {
        setMsg({
          type: 'error',
          text: payStatusNotReadyError(role),
        })
      } else {
        setMsg({ type: 'error', text: errMsg })
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
    day: '2-digit', month: '2-digit', year: 'numeric',
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
            {!isLocked && (
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  Hạn: {dueLabel}
                </span>
                {countdownLabel && (
                  <span
                    className={`inline-flex items-center gap-1 font-medium ${isOverdue ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'
                      }`}
                  >
                    <Clock className="h-3.5 w-3.5" />
                    {countdownLabel}
                  </span>
                )}
                {!isPaid && inst.ordinal === 1 && (
                  <DepositCountdown
                    signedAt={signedAt}
                    paid={isPaid}
                    expired={isCancelled || inst.status === 'OVERDUE'}
                  />
                )}
              </div>
            )}
          </div>
        </div>

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
          {role === 'Housing Developer' && isLocked && isManualUnlockTrigger(inst.triggerEvent) && (
            <UnlockButton projectId={projectId} inst={inst} allInstallments={installments} onUnlocked={onUnlocked} />
          )}
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

// ─── Timeline Dot ─────────────────────────────────────────────────────────────

export function InstallmentTimelineDot({ inst }: { inst: PaymentInstallment }) {
  const isPaid = inst.status === 'PAID'
  const isOverdue = inst.status !== 'PAID' && new Date(inst.dueDate) < new Date()
  const isCancelled = inst.status === 'CANCELLED'
  const isLocked = inst.status === 'LOCKED'

  let bg = 'bg-slate-100 dark:bg-slate-800'
  let ring = 'ring-white dark:ring-slate-900'
  let Icon: typeof CheckCircle2 = CircleDot
  let iconColor = 'text-slate-400'

  if (isPaid) { bg = 'bg-emerald-500'; Icon = CheckCircle2; iconColor = 'text-white' }
  else if (isOverdue) { bg = 'bg-rose-500'; Icon = AlertTriangle; iconColor = 'text-white' }
  else if (isCancelled) { bg = 'bg-slate-400'; Icon = XCircle; iconColor = 'text-white' }
  else if (isLocked) { bg = 'bg-slate-200 dark:bg-slate-700'; Icon = Lock; iconColor = 'text-slate-500 dark:text-slate-400' }
  else { bg = 'bg-amber-100 dark:bg-amber-900/40'; Icon = Clock; iconColor = 'text-amber-600 dark:text-amber-400' }

  return (
    <div
      className={`absolute -left-[37px] flex h-7 w-7 items-center justify-center rounded-full ring-4 ${bg} ${ring} sm:-left-[45px]`}
      aria-hidden
    >
      <Icon className={`h-3.5 w-3.5 ${iconColor}`} />
    </div>
  )
}

// ─── Payment Progress Card ─────────────────────────────────────────────────────

interface PaymentProgressCardProps {
  installments: PaymentInstallment[]
  paid: number
  remaining: number
  progress: number
  contractPrice: number | null
  officialPrice: number | null
  housePrice: number | null
}

export function PaymentProgressCard({
  installments,
  paid,
  remaining,
  progress,
  contractPrice,
  officialPrice,
  housePrice,
}: PaymentProgressCardProps) {
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

        <div className="mt-5">
          <div className="relative h-3 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-emerald-500 to-emerald-400 transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

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

// ─── Installment Timeline ──────────────────────────────────────────────────────

interface InstallmentTimelineProps {
  installments: PaymentInstallment[]
  signedAt: string | null
  onPaid: () => void
  applicationId: string
  applicationStatus: string
  role?: string
  projectId?: string
  onUnlocked?: () => void
}

export function InstallmentTimeline({
  installments = [], signedAt, onPaid, applicationId, applicationStatus, role, projectId, onUnlocked,
}: Omit<InstallmentTimelineProps, 'totalAmount'>) {
  const unlocked = Array.isArray(installments) ? installments : [] // show all 6 installments including LOCKED ones

  return (
    <ol className="relative space-y-3 border-l-2 border-dashed border-slate-200 pl-6 dark:border-slate-700 sm:pl-8">
      {unlocked.map((inst) => (
        <li key={inst.installmentId} className="relative">
          <InstallmentTimelineDot inst={inst} />
          <InstallmentRow
            inst={inst}
            signedAt={signedAt}
            onPaid={onPaid}
            applicationId={applicationId}
            applicationStatus={applicationStatus}
            installments={unlocked}
            role={role}
            projectId={projectId}
            onUnlocked={onUnlocked}
          />
        </li>
      ))}
    </ol>
  )
}

// ─── Payment History Panel ─────────────────────────────────────────────────────

interface PaymentHistoryPanelProps {
  applicationId: string
}

function parsePaymentInfoList(data: unknown): PaymentInfoDto[] {
  if (Array.isArray(data)) return data as PaymentInfoDto[]
  if (!data || typeof data !== 'object') return []
  const o = data as Record<string, unknown>
  const rawList = o.data ?? o.Data ?? o.items ?? o.Items ?? o.payments ?? o.Payments
  if (Array.isArray(rawList)) return rawList as PaymentInfoDto[]
  if (rawList && typeof rawList === 'object') {
    const nested = (rawList as Record<string, unknown>).items ?? (rawList as Record<string, unknown>).Items ?? (rawList as Record<string, unknown>).data ?? (rawList as Record<string, unknown>).Data
    if (Array.isArray(nested)) return nested as PaymentInfoDto[]
  }
  return []
}

export function PaymentHistoryPanel({ applicationId }: PaymentHistoryPanelProps) {
  const [txs, setTxs] = useState<PaymentInfoDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')
    void paymentApi.getMyPayments()
      .then((data) => {
        setTxs(parsePaymentInfoList(data))
      })
      .catch((err) => {
        setError(formatError(err))
        setTxs([])
      })
      .finally(() => setLoading(false))
  }, [applicationId])

  const safeTxs = Array.isArray(txs) ? txs : []

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900/40">
      <div className="mb-3 flex items-center gap-2">
        <History className="h-4 w-4 text-slate-500" />
        <h4 className="font-semibold">Lịch sử giao dịch</h4>
      </div>
      {loading && <p className="text-sm text-slate-500 dark:text-slate-400">Đang tải...</p>}
      {error && <Alert variant="error">{error}</Alert>}
      {!loading && safeTxs.length === 0 && (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Chưa có giao dịch thanh toán nào.
        </p>
      )}
      <div className="mt-3 space-y-2">
        {safeTxs.map((tx, idx) => {
          const st = tx?.status?.toUpperCase() ?? ''
          const isSuccess = st === '00' || st === 'SUCCESS' || st === 'PAID'
          const isPending = st === '01' || st === 'PENDING'
          const isCancelled = st === '24' || st === 'CANCELLED'
          const variant = isSuccess ? 'success' : isCancelled ? 'danger' : 'warning'
          const label = isSuccess ? 'Thành công' : isCancelled ? 'Đã hủy' : isPending ? 'Chờ xử lý' : st || 'Không rõ'
          return (
            <div key={tx?.orderId || `tx-${idx}`} className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/40">
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{tx?.orderId || 'N/A'}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {tx?.orderInfo || 'Thanh toán VNPay'} · {tx?.vnpBankCode ?? 'VNPay'}
                </p>
                {tx?.createdAt && (
                  <p className="text-[11px] text-slate-400">
                    {new Date(tx.createdAt).toLocaleString('vi-VN')}
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {Number(tx?.amount ?? 0).toLocaleString('vi-VN')} VNĐ
                </p>
                <Badge variant={variant} className="mt-1">{label}</Badge>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Full Payment Section (timeline + progress + history) ─────────────────────

interface PaymentSectionProps {
  installments: PaymentInstallment[]
  paid: number
  remaining: number
  progress: number
  contractPrice: number | null
  officialPrice: number | null
  housePrice: number | null
  signedAt: string | null
  applicationId: string
  applicationStatus: string
  hasError?: boolean
  hasApartment?: boolean
  onReload: () => void
  /** Vai trò người dùng — dùng để ẩn nút Thanh toán với CĐT */
  role?: string
  projectId?: string
}

export function PaymentSection({
  installments,
  paid,
  remaining,
  progress,
  contractPrice,
  officialPrice,
  housePrice,
  signedAt,
  applicationId,
  applicationStatus,
  hasError,
  hasApartment,
  onReload,
  role,
  projectId,
}: PaymentSectionProps) {
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false)
  const viewerRole = role || getRole()

  if (hasError) {
    const errCopy = scheduleLoadErrorCopy(viewerRole)
    return (
      <div className="rounded-md border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-700 dark:bg-yellow-900/20">
        <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
          {errCopy.title}
        </p>
        <p className="mt-1 text-xs text-yellow-700 dark:text-yellow-400">
          {errCopy.body}
        </p>
        <button
          onClick={() => void onReload()}
          className="mt-2 text-xs text-yellow-700 underline hover:no-underline dark:text-yellow-300"
        >
          Thử lại
        </button>
      </div>
    )
  }

  if (installments.length === 0 && hasApartment) {
    const copy = emptyScheduleHasApartmentCopy(viewerRole)
    return (
      <Alert variant="warning">
        <p className="font-medium">{copy.title}</p>
        <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{copy.body}</p>
      </Alert>
    )
  }

  if (installments.length === 0) {
    const copy = emptyScheduleNoApartmentCopy(viewerRole)
    return (
      <Alert variant="info">
        <strong>{copy.title}.</strong> {copy.body}
      </Alert>
    )
  }

  const sumPhases = installments.reduce((s, i) => s + (i.amount || 0), 0)
  const ref = contractPrice ?? housePrice ?? null
  const diff = ref != null ? Math.abs(sumPhases - ref) : 0
  const mismatch = diff > 1000

  return (
    <div className="space-y-5">
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
            {installments.length} đợt theo lịch chủ đầu tư (lần đầu ≤ 30%)
          </span>
        </div>

        {mismatch && (
          <Alert variant="warning" className="mb-4">
            <p className="font-medium">Số tiền lịch thanh toán không khớp giá nhà chính thức.</p>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
              Tổng {installments.length > 0 ? `${installments.length} đợt` : 'các đợt'}: <b>{sumPhases.toLocaleString('vi-VN')}</b> VNĐ —
              Giá nhà: <b>{ref!.toLocaleString('vi-VN')}</b> VNĐ.
              Vui lòng {scheduleMismatchHint(viewerRole)}
            </p>
          </Alert>
        )}

        <InstallmentTimeline
          installments={installments}
          signedAt={signedAt}
          onPaid={onReload}
          applicationId={applicationId}
          applicationStatus={applicationStatus}
          role={role}
          projectId={projectId}
          onUnlocked={onReload}
        />

        {role === 'Housing Developer' && (
          <p className="mt-2 text-center text-xs italic text-slate-500 dark:text-slate-400">
            Nhấn nút <strong>Mở đợt thanh toán</strong> phía trên để kích hoạt đợt tiếp theo cho hồ sơ này.
          </p>
        )}
      </div>

      {/* Lịch sử giao dịch */}
      <PaymentHistoryPanel applicationId={applicationId} />

      {/* Hành động: Tải PDF hợp đồng & Xin rút hồ sơ */}
      <div className="flex flex-wrap items-center gap-3">
        {(applicationStatus === 'CONTRACT_PENDING' ||
          applicationStatus === 'CONTRACT_SIGNED' ||
          applicationStatus === 'CONTRACTING' ||
          applicationStatus === 'PARTIALLY_PAID' ||
          applicationStatus === 'PAID' ||
          applicationStatus === 'FULLY_PAID') && (
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  await downloadContractPdf(applicationId)
                } catch (err) {
                  // silent
                }
              }}
            >
              <Download className="mr-1.5 h-4 w-4" />
              Tải PDF hợp đồng
            </Button>
          )}

        {role !== 'Housing Developer' && (
          <Button
            variant="ghost"
            className="text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-950/40"
            onClick={() => setWithdrawModalOpen(true)}
          >
            <XCircle className="mr-1.5 h-4 w-4" />
            Xin rút hồ sơ / Hủy hợp đồng
          </Button>
        )}
      </div>

      <WithdrawalRequestModal
        open={withdrawModalOpen}
        onClose={() => setWithdrawModalOpen(false)}
        applicationId={applicationId}
        onSuccess={() => {
          onReload()
        }}
      />
    </div>
  )
}

// ─── Modal Xin rút hồ sơ / Hủy hợp đồng (Applicant) ───────────────────────────

export function WithdrawalRequestModal({
  open,
  onClose,
  applicationId,
  onSuccess,
}: {
  open: boolean
  onClose: () => void
  applicationId: string
  onSuccess: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [preview, setPreview] = useState<CancellationPreviewDto | null>(null)
  const [error, setError] = useState('')
  const [reason, setReason] = useState('')
  const [bankAccountNumber, setBankAccountNumber] = useState('')
  const [bankName, setBankName] = useState('')
  const [accountHolderName, setAccountHolderName] = useState('')

  useEffect(() => {
    if (!open || !applicationId) return
    setLoading(true)
    setError('')
    paymentApi.getCancellationPreview(applicationId)
      .then((res) => {
        const d = res && typeof res === 'object' && 'data' in res ? (res as Record<string, unknown>).data : res
        setPreview((d ?? {}) as CancellationPreviewDto)
      })
      .catch((err) => {
        setError(formatError(err))
      })
      .finally(() => setLoading(false))
  }, [open, applicationId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reason.trim()) {
      setError('Vui lòng nêu rõ lý do xin rút hồ sơ / hủy hợp đồng.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      await paymentApi.requestCancellation(applicationId, {
        reason: reason.trim(),
        isForcedRevocation: false,
        bankAccountNumber: bankAccountNumber.trim() || undefined,
        bankName: bankName.trim() || undefined,
        accountHolderName: accountHolderName.trim() || undefined,
      })
      onSuccess()
      onClose()
    } catch (err) {
      setError(formatError(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={submitting ? () => undefined : onClose}
      title="Yêu cầu rút hồ sơ & Chấm dứt hợp đồng"
      description="Xem trước khoản phạt cọc và số tiền hoàn lại theo quy định Nhà ở xã hội"
      size="lg"
    >
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="ml-2 text-sm text-slate-500">Đang tính toán mức phạt cọc và tiền hoàn lại...</span>
        </div>
      ) : (
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          {error && <Alert variant="error">{error}</Alert>}

          {/* Preview cards */}
          <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-4 dark:border-rose-900/60 dark:bg-rose-950/30">
            <h4 className="font-semibold text-rose-900 dark:text-rose-200">
              ⚠️ Cảnh báo quy chế tự ý rút hồ sơ / chấm dứt hợp đồng
            </h4>
            <p className="mt-1 text-xs text-rose-800 dark:text-rose-300 leading-relaxed">
              Theo quy định Điều 38 Nghị định 100/2024/NĐ-CP và Hợp đồng nguyên tắc: Trường hợp người mua tự ý xin rút hồ sơ hoặc đơn phương chấm dứt hợp đồng sau khi đã đặt cọc, <strong>toàn bộ số tiền đặt cọc (Đợt 1) sẽ bị sung công quỹ / giữ lại theo quy chế</strong>. Suất mua sẽ được chuyển giao cho ứng viên tiếp theo trong Danh sách dự bị (Waitlist).
            </p>

            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <div className="rounded-lg bg-white/80 p-2.5 dark:bg-slate-900/60">
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Tổng đã thanh toán</p>
                <p className="font-bold text-slate-900 dark:text-slate-100">
                  {Number(preview?.totalPaid ?? 0).toLocaleString('vi-VN')} VNĐ
                </p>
              </div>
              <div className="rounded-lg bg-white/80 p-2.5 dark:bg-slate-900/60">
                <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">Tiền cọc bị phạt/giữ</p>
                <p className="font-bold text-rose-600 dark:text-rose-400">
                  {Number(preview?.forfeitedAmount ?? preview?.depositAmount ?? 0).toLocaleString('vi-VN')} VNĐ
                </p>
              </div>
              <div className="rounded-lg bg-white/80 p-2.5 dark:bg-slate-900/60">
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Tiền hoàn lại dự kiến</p>
                <p className="font-bold text-emerald-600 dark:text-emerald-400">
                  {Number(preview?.refundAmount ?? 0).toLocaleString('vi-VN')} VNĐ
                </p>
              </div>
            </div>
          </div>

          <FormField label="Lý do xin rút hồ sơ / hủy hợp đồng *" htmlFor="cancel-reason">
            <Textarea
              id="cancel-reason"
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="VD: Không thu xếp được tài chính / Chuyển nơi công tác / Thay đổi nhu cầu..."
            />
          </FormField>

          <div className="border-t border-slate-200 pt-3 dark:border-slate-700">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Thông tin tài khoản nhận tiền hoàn (nếu có tiền hoàn lại)
            </h4>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <FormField label="Số tài khoản" htmlFor="bank-acc">
                <Input
                  id="bank-acc"
                  value={bankAccountNumber}
                  onChange={(e) => setBankAccountNumber(e.target.value)}
                  placeholder="VD: 1903..."
                />
              </FormField>
              <FormField label="Tên ngân hàng" htmlFor="bank-name">
                <Input
                  id="bank-name"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="VD: Vietcombank, Techcombank..."
                />
              </FormField>
              <FormField label="Tên chủ tài khoản" htmlFor="bank-owner">
                <Input
                  id="bank-owner"
                  value={accountHolderName}
                  onChange={(e) => setAccountHolderName(e.target.value)}
                  placeholder="VD: NGUYEN VAN A"
                />
              </FormField>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" disabled={submitting} onClick={onClose}>
              Hủy bỏ
            </Button>
            <Button
              type="submit"
              variant="outline"
              disabled={submitting || !reason.trim()}
              className="border-rose-300 bg-rose-600 font-bold text-white hover:bg-rose-700 hover:text-white"
            >
              {submitting ? 'Đang gửi yêu cầu...' : 'Xác nhận xin rút hồ sơ'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}


// ─── Ký HĐ: đọc hợp đồng rồi mới ký (khớp mobile) ─────────────────────────────

interface SignContractSectionProps {
  canSign: boolean
  signing: boolean
  onSign: () => void
  applicationStatus?: string
  applicationId: string
}

export function SignContractSection({
  canSign,
  signing,
  onSign,
  applicationId,
}: SignContractSectionProps) {
  const [showPdf, setShowPdf] = useState(false)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [pdfError, setPdfError] = useState<string | null>(null)
  const [agreed, setAgreed] = useState(false)
  const [confirmSignModalOpen, setConfirmSignModalOpen] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const pdfUrlRef = useRef<string | null>(null)

  const loadPdf = async () => {
    if (!applicationId) return
    setPdfLoading(true)
    setPdfError(null)
    try {
      const blob = await fetchContractPdfBlob(applicationId)
      const url = URL.createObjectURL(blob)
      if (pdfUrlRef.current) URL.revokeObjectURL(pdfUrlRef.current)
      pdfUrlRef.current = url
      setPdfUrl(url)
    } catch (err) {
      if (pdfUrlRef.current) URL.revokeObjectURL(pdfUrlRef.current)
      pdfUrlRef.current = null
      setPdfUrl(null)
      setPdfError(formatError(err))
    } finally {
      setPdfLoading(false)
    }
  }

  useEffect(() => {
    if (showPdf && !pdfUrl && !pdfLoading && applicationId) {
      void loadPdf()
    }
  }, [showPdf, applicationId, pdfUrl, pdfLoading])

  useEffect(() => {
    return () => {
      if (pdfUrlRef.current) {
        URL.revokeObjectURL(pdfUrlRef.current)
        pdfUrlRef.current = null
      }
    }
  }, [])

  if (!canSign) return null

  const handleTogglePdf = () => {
    const next = !showPdf
    setShowPdf(next)
    if (next && !pdfUrl && !pdfLoading) {
      void loadPdf()
    }
  }

  const handleSign = () => {
    if (!agreed || signing) return
    setConfirmSignModalOpen(true)
  }

  const handleConfirmSign = () => {
    setConfirmSignModalOpen(false)
    onSign()
  }

  return (
    <div className="overflow-hidden rounded-xl border border-amber-200 bg-white shadow-sm dark:border-amber-800 dark:bg-slate-900 transition-all">
      {/* Compact Main Bar */}
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between bg-amber-50/60 dark:bg-amber-950/20">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                Ký hợp đồng mua bán NOXH
              </h4>
              <Badge variant="warning">Cần ký điện tử</Badge>
            </div>
            <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
              Mẫu số 01 – Quy định theo TT 05/2024/TT-BXD. Vui lòng kiểm tra văn bản và đồng ý điều khoản trước khi ký.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <Button
            variant="outline"
            size="sm"
            onClick={handleTogglePdf}
            className="text-xs font-medium"
          >
            {showPdf ? <ChevronUp className="mr-1.5 h-3.5 w-3.5" /> : <Eye className="mr-1.5 h-3.5 w-3.5" />}
            {showPdf ? 'Thu gọn văn bản' : 'Xem toàn văn HĐ'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            disabled={downloading}
            onClick={async () => {
              setDownloading(true)
              try {
                await downloadContractPdf(applicationId)
              } catch {
                /* ignore */
              } finally {
                setDownloading(false)
              }
            }}
            className="text-xs font-medium"
          >
            <Download className="mr-1.5 h-4 w-4" />
            {downloading ? 'Đang tải...' : 'Tải về'}
          </Button>
        </div>
      </div>

      {/* Expandable PDF Preview */}
      {showPdf && (
        <div className="border-t border-amber-200 bg-slate-100 dark:border-amber-800 dark:bg-slate-950">
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
            <span className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
              <FileText className="h-3.5 w-3.5 text-amber-600" />
              Xem trước toàn văn hợp đồng mua bán NOXH
            </span>
            <button
              type="button"
              onClick={handleTogglePdf}
              className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-medium"
            >
              Đóng xem trước [✕]
            </button>
          </div>

          <div className="relative min-h-[420px] bg-slate-200 dark:bg-slate-800">
            {pdfLoading && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-white/90 dark:bg-slate-900/90">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <p className="text-sm text-slate-600 dark:text-slate-400">Đang tải văn bản hợp đồng…</p>
              </div>
            )}
            {pdfError && !pdfLoading && (
              <div className="flex min-h-[360px] flex-col items-center justify-center gap-3 px-6 text-center">
                <AlertTriangle className="h-10 w-10 text-rose-500" />
                <p className="font-semibold text-slate-800 dark:text-slate-100">Không thể tải hợp đồng</p>
                <p className="max-w-md text-sm text-slate-600 dark:text-slate-400">{pdfError}</p>
                <Button variant="outline" size="sm" onClick={() => void loadPdf()}>
                  <RefreshCw className="mr-1.5 h-4 w-4" />
                  Thử lại
                </Button>
              </div>
            )}
            {pdfUrl && !pdfError && (
              <iframe
                title="Nội dung hợp đồng mua bán nhà ở xã hội"
                src={pdfUrl}
                className="h-[min(65vh,650px)] w-full border-0 bg-white"
              />
            )}
          </div>
        </div>
      )}

      {/* Action footer: Checkbox & Sign button */}
      <div className="flex flex-col gap-3 border-t border-amber-100 bg-white p-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900">
        <label className="flex cursor-pointer items-start gap-2.5 text-sm text-slate-700 select-none dark:text-slate-300">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-600 rounded"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
          />
          <span>Tôi đã đọc, hiểu rõ và đồng ý toàn bộ điều khoản trong hợp đồng mua bán nhà ở xã hội.</span>
        </label>

        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="accent"
            disabled={!agreed || signing}
            onClick={handleSign}
            className="w-full sm:w-auto"
          >
            <PenLine className="mr-1.5 h-4 w-4" />
            {signing ? 'Đang ký điện tử...' : 'Đồng ý và ký hợp đồng'}
          </Button>
        </div>
      </div>

      {/* Modal Xác nhận Ký hợp đồng nhỏ gọn & thẩm mỹ */}
      <Modal
        open={confirmSignModalOpen}
        onClose={() => !signing && setConfirmSignModalOpen(false)}
        size="sm"
      >
        <div className="p-5 space-y-4">
          <div className="flex items-start gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 shadow-xs">
              <PenLine className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Xác nhận ký hợp đồng mua bán
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Chữ ký điện tử sẽ được ghi nhận và lưu vĩnh viễn trên văn bản hợp đồng.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300 space-y-1.5">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span>Đồng ý toàn bộ điều khoản mua bán nhà ở xã hội.</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span>Kích hoạt mở khóa đợt thanh toán tiếp theo theo tiến độ.</span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              disabled={signing}
              onClick={() => setConfirmSignModalOpen(false)}
            >
              Hủy
            </Button>
            <Button
              variant="accent"
              size="sm"
              disabled={signing}
              onClick={handleConfirmSign}
              className="font-bold"
            >
              <PenLine className="mr-1.5 h-3.5 w-3.5" />
              {signing ? 'Đang ký...' : 'Xác nhận & Ký ngay'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ─── Apartment Card ────────────────────────────────────────────────────────────

export interface ApartmentCardProps {
  apartmentUnitName?: string | null
  apartmentArea?: number | null
  apartmentPrice?: number | null
  projectName: string
  lotteryResult?: string | null
  applicationStatus?: string | null
}

export function ApartmentCard({
  apartmentUnitName,
  apartmentArea,
  apartmentPrice,
  projectName,
  lotteryResult,
  applicationStatus,
}: ApartmentCardProps) {
  const normStatus = (applicationStatus || '').trim().toUpperCase()
  const normLottery = (lotteryResult || '').trim().toUpperCase()

  const hasApartment = Boolean(
    apartmentUnitName &&
    apartmentUnitName.trim() !== '' &&
    apartmentUnitName !== 'Chưa xác định' &&
    apartmentUnitName !== '—'
  )

  // 1. TRƯỜNG HỢP ĐÃ ĐƯỢC GÁN CĂN HỘ CỤ THỂ
  if (hasApartment) {
    const isWon = normLottery === 'WON' || normLottery === 'PRIORITY_WON' || normStatus === 'LOTTERY_WON'
    const isPriority = normLottery === 'PRIORITY_WON'

    return (
      <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/70 via-teal-50/30 to-white p-5 shadow-sm dark:border-emerald-900/60 dark:from-emerald-950/30 dark:via-slate-900 dark:to-slate-900">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 shadow-sm dark:bg-emerald-900/50 dark:text-emerald-300">
            <Home className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Căn hộ được cấp
            </p>
            <h3 className="mt-1 text-xl font-black text-slate-900 dark:text-slate-100">
              {apartmentUnitName}
            </h3>
            <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400 font-medium">Dự án: {projectName}</p>

            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <Badge variant="success" className="font-bold">
                {isPriority ? '✓ Cấp theo diện ưu tiên' : isWon ? '✓ Trúng bốc thăm & Đã cấp căn' : '✓ Đã cấp căn hộ'}
              </Badge>
              {apartmentArea != null && (
                <span className="inline-flex items-center gap-1 rounded-lg bg-white/80 px-2.5 py-0.5 text-xs font-semibold text-slate-700 border border-slate-200/80 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
                  Diện tích: {apartmentArea} m²
                </span>
              )}
            </div>
          </div>

          {apartmentPrice != null && (
            <div className="text-right shrink-0">
              <p className="text-[11px] font-semibold uppercase text-slate-400 tracking-wider">Giá bán chính thức</p>
              <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                {Number(apartmentPrice).toLocaleString('vi-VN')}
              </p>
              <p className="text-[11px] font-medium text-slate-400">VNĐ</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // 2. TRƯỜNG HỢP CHƯA ĐƯỢC GÁN CĂN — HIỂN THỊ THEO TIẾN TRÌNH THỰC TẾ CỦA HỒ SƠ

  // (A) Hồ sơ đang chờ thẩm định / đang xét duyệt
  const isReviewing = !normStatus || ['DRAFT', 'SUBMITTED', 'REVIEWING', 'PENDING_REVIEW', 'NEED_MORE_DOCUMENTS', 'PENDING_SXD_REVIEW'].includes(normStatus)

  if (isReviewing) {
    const isNeedMore = normStatus === 'NEED_MORE_DOCUMENTS'
    const isReviewingStep = normStatus === 'REVIEWING' || normStatus === 'PENDING_SXD_REVIEW'

    return (
      <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50/70 via-orange-50/30 to-white p-5 shadow-sm dark:border-amber-900/60 dark:from-amber-950/30 dark:via-slate-900 dark:to-slate-900">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 shadow-sm dark:bg-amber-900/50 dark:text-amber-300">
            <Clock className="h-6 w-6 animate-pulse" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              Tiến trình xét duyệt hồ sơ
            </p>
            <h3 className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">
              {isNeedMore ? 'Cần bổ sung tài liệu hồ sơ' : isReviewingStep ? 'Đang thẩm định điều kiện' : 'Hồ sơ đã nộp · Chờ duyệt'}
            </h3>
            <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400 font-medium">Dự án: {projectName}</p>
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {isNeedMore
                ? 'Hồ sơ của bạn được yêu cầu bổ sung giấy tờ để tiếp tục thẩm định. Vui lòng kiểm tra thông báo và cập nhật sớm.'
                : 'Hồ sơ đã được tiếp nhận và đang trong quá trình đối soát điều kiện theo quy định của Luật Nhà ở. Kết quả xét duyệt sẽ được thông báo ngay sau khi hoàn tất.'}
            </p>
            <div className="mt-3 flex items-center gap-2">
              <Badge variant="warning" className="font-bold">
                {isNeedMore ? 'Cần bổ sung' : isReviewingStep ? 'Đang thẩm định' : 'Chờ duyệt'}
              </Badge>
              <span className="text-[11px] text-slate-400">Bước 1/3: Thẩm định hồ sơ</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // (B) Hồ sơ bị từ chối
  if (normStatus === 'REJECTED') {
    return (
      <div className="rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-50/70 via-red-50/30 to-white p-5 shadow-sm dark:border-rose-900/60 dark:from-rose-950/30 dark:via-slate-900 dark:to-slate-900">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-700 shadow-sm dark:bg-rose-900/50 dark:text-rose-300">
            <XCircle className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">
              Kết quả thẩm định hồ sơ
            </p>
            <h3 className="mt-1 text-lg font-bold text-rose-900 dark:text-rose-100">
              Hồ sơ không đủ điều kiện
            </h3>
            <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400 font-medium">Dự án: {projectName}</p>
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Rất tiếc hồ sơ của bạn chưa đáp ứng đủ các tiêu chuẩn mua nhà ở xã hội tại dự án này.
            </p>
            <div className="mt-3">
              <Badge variant="danger" className="font-bold">Từ chối duyệt</Badge>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // (C) Kết quả bốc thăm: Trúng thăm nhưng chưa gán mã căn
  const isWon = normLottery === 'WON' || normLottery === 'PRIORITY_WON' || normStatus === 'LOTTERY_WON'
  if (isWon) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/70 via-teal-50/30 to-white p-5 shadow-sm dark:border-emerald-900/60 dark:from-emerald-950/30 dark:via-slate-900 dark:to-slate-900">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 shadow-sm dark:bg-emerald-900/50 dark:text-emerald-300">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Kết quả bốc thăm / phân bổ
            </p>
            <h3 className="mt-1 text-lg font-black text-emerald-900 dark:text-emerald-100">
              Chúc mừng! Trúng quyền mua căn hộ
            </h3>
            <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400 font-medium">Dự án: {projectName}</p>
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Hồ sơ của bạn đã trúng quyền mua căn hộ. Chủ đầu tư đang thực hiện gán mã căn hộ chính thức để tiến hành thủ tục ký hợp đồng.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <Badge variant="success" className="font-bold">✓ Trúng bốc thăm · Chờ gán căn</Badge>
              <span className="text-[11px] text-slate-400">Bước 2/3: Phân bổ căn</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // (D) Kết quả bốc thăm: Không trúng thăm / Danh sách chờ
  const isLost = normLottery === 'LOST' || normLottery === 'LOTTERY_LOST' || normLottery === 'NOT_WON' || normStatus === 'LOTTERY_LOST'
  const isWaitlist = normLottery === 'WAITLIST' || normStatus === 'WAITLIST'

  if (isLost || isWaitlist) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:to-slate-950">
        <div className="flex items-start gap-4">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-sm ${isWaitlist ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Kết quả bốc thăm
            </p>
            <h3 className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">
              {isWaitlist ? 'Trong danh sách chờ (Waitlist)' : 'Chưa trúng thăm đợt này'}
            </h3>
            <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400 font-medium">Dự án: {projectName}</p>
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {isWaitlist
                ? 'Hồ sơ của bạn nằm trong danh sách chờ ưu tiên. Nếu có người trúng thăm từ chối nhận suất, hệ thống sẽ tự động đôn thứ tự của bạn lên.'
                : 'Hồ sơ của bạn chưa trúng quyền mua trong phiên bốc thăm này. Bạn có thể nộp hồ sơ ở các dự án tiếp theo.'}
            </p>
            <div className="mt-3">
              <Badge variant={isWaitlist ? 'warning' : 'danger'} className="font-bold">
                {isWaitlist ? 'Danh sách chờ' : 'Không trúng thăm'}
              </Badge>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // (E) Hồ sơ ĐÃ DUYỆT (`APPROVED`) — Phân nhánh: Chờ bốc thăm (vượt số lượng) vs Chờ cấp căn (không vượt số lượng)
  const isLotteryPending = normStatus === 'LOTTERY_PENDING' || normStatus === 'LOTTERY_IN_PROGRESS' || normStatus === 'LOTTERY_WAITING'

  if (isLotteryPending) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50/70 via-orange-50/30 to-white p-5 shadow-sm dark:border-amber-900/60 dark:from-amber-950/30 dark:via-slate-900 dark:to-slate-900">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 shadow-sm dark:bg-amber-900/50 dark:text-amber-300">
            <Clock className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              Kết quả thẩm định: Đã duyệt
            </p>
            <h3 className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">
              Đủ điều kiện · Chờ bốc thăm
            </h3>
            <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400 font-medium">Dự án: {projectName}</p>
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Hồ sơ của bạn đã được phê duyệt hợp lệ. Do số lượng hồ sơ hợp lệ vượt quá quỹ căn của dự án, hồ sơ đã được đưa vào danh sách tham gia phiên bốc thăm công khai.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <Badge variant="warning" className="font-bold">Chờ bốc thăm</Badge>
              <span className="text-[11px] text-slate-400">Bước 2/3: Bốc thăm chọn quyền mua</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Mặc định khi hồ sơ đã duyệt (Số lượng không vượt hoặc đang chờ phân bổ căn trực tiếp)
  return (
    <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50/70 via-indigo-50/30 to-white p-5 shadow-sm dark:border-blue-900/60 dark:from-blue-950/30 dark:via-slate-900 dark:to-slate-900">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 shadow-sm dark:bg-blue-900/50 dark:text-blue-300">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
            Kết quả thẩm định: Đã duyệt
          </p>
          <h3 className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">
            Đủ điều kiện · Chờ cấp căn
          </h3>
          <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400 font-medium">Dự án: {projectName}</p>
          <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Hồ sơ của bạn đã được phê duyệt hợp lệ. Số lượng hồ sơ hợp lệ không vượt quá số lượng căn hộ, đang chờ Chủ đầu tư hoàn tất thủ tục phân bổ và cấp căn hộ cụ thể.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <Badge variant="success" className="font-bold">Đã duyệt · Chờ cấp căn</Badge>
            <span className="text-[11px] text-slate-400">Bước 2/3: Phân bổ căn hộ</span>
          </div>
        </div>
      </div>
    </div>
  )
}
