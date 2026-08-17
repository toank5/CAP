import { useEffect, useState } from 'react'
import {
  CheckCircle2, Clock, AlertTriangle, XCircle, Lock, Calendar, Banknote,
  TrendingUp, CircleDot, PenLine, Download, History, Home,
} from 'lucide-react'
import {
  INSTALLMENT_STATUS_LABEL,
  INSTALLMENT_STATUS_TONE,
  contractApi,
  type PaymentInstallment,
} from '@/api/contracts'
import {
  extractOrderId,
  extractPaymentUrl,
  paymentApi,
  downloadContractPdf,
} from '@/api/payment'
import { openVnPayPopupAndWait, vnPayResultMessage } from '@/lib/vnpay-popup'
import { formatError } from '@/lib/format-error'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
  ordinal: number
  allInstallments: PaymentInstallment[]
  onUnlocked?: () => void
}

const PHASE_MAP: Record<number, { trigger: 'CONSTRUCTION_ROUGH_FLOOR' | 'ROOFING_COMPLETED' | 'HANDOVER' | 'RED_BOOK_ISSUED'; label: string }> = {
  3: { trigger: 'CONSTRUCTION_ROUGH_FLOOR', label: 'Mở đợt 3' },
  4: { trigger: 'ROOFING_COMPLETED', label: 'Mở đợt 4' },
  5: { trigger: 'HANDOVER', label: 'Mở đợt 5' },
  6: { trigger: 'RED_BOOK_ISSUED', label: 'Mở đợt 6' },
}

function UnlockButton({ projectId, ordinal, allInstallments, onUnlocked }: UnlockButtonProps) {
  const [busy, setBusy] = useState(false)
  const phase = PHASE_MAP[ordinal]
  if (!phase || !projectId) return null

  // Only show if the previous ordinal is no longer LOCKED (i.e., already opened)
  const prevUnlocked = ordinal === 3
    ? true // ordinal 3 has no prerequisite
    : !allInstallments.some(i => i.ordinal === ordinal - 1 && i.status === 'LOCKED')
  if (!prevUnlocked) return null

  const handle = async () => {
    setBusy(true)
    try {
      await contractApi.unlockPhase(projectId, phase.trigger)
      onUnlocked?.()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Button variant="outline" size="sm" disabled={busy} onClick={() => void handle()} className="mt-1 border-violet-300 text-violet-700 hover:bg-violet-50 dark:border-violet-600 dark:text-violet-300 dark:hover:bg-violet-950">
      {busy ? 'Đang mở...' : phase.label}
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
          text: 'Lỗi đồng bộ: hệ thống chưa tạo lịch thanh toán. Liên hệ CĐT hoặc thử lại sau.',
        })
      } else if (/trạng thái thích hợp|status.*not\s*suitable|invalid.*status|400\b/i.test(errMsg)) {
        setMsg({
          type: 'error',
          text: 'Hồ sơ chưa ở trạng thái cho phép thanh toán. Kiểm tra: đã được CĐT gán căn và phê duyệt chưa?',
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
            {!isLocked && (
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
              {!isPaid && inst.ordinal === 1 && (
                <DepositCountdown
                  signedAt={signedAt}
                  paid={isPaid}
                  expired={isCancelled || inst.status === 'OVERDUE'}
                />
              )}
            </div>
            )}
            {inst.ordinal === 5 && (
              <p className="mt-1.5 text-[11px] text-amber-700 dark:text-amber-400">
                Bao gồm 25% tiền bàn giao + 2% phí bảo trì (PBT theo Luật Nhà ở)
              </p>
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
          {role === 'Housing Developer' && isLocked && inst.ordinal >= 3 && (
            <UnlockButton projectId={projectId} ordinal={inst.ordinal} allInstallments={installments} onUnlocked={onUnlocked} />
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
              {installments.length} đợt theo Luật Nhà ở
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
  installments, signedAt, onPaid, applicationId, applicationStatus, role, projectId, onUnlocked,
}: Omit<InstallmentTimelineProps, 'totalAmount'>) {
  const unlocked = installments // show all 6 installments including LOCKED ones

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
            installments={installments}
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

export function PaymentHistoryPanel({ applicationId }: PaymentHistoryPanelProps) {
  const [txs, setTxs] = useState<PaymentInfoDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')
    void paymentApi.getMyPayments()
      .then((data) => {
        const src = (data as { data?: unknown[]; items?: unknown[] } | null)
        const arr = src?.data ?? src?.items ?? (Array.isArray(data) ? data : [])
        setTxs(arr as PaymentInfoDto[])
      })
      .catch((err) => setError(formatError(err)))
      .finally(() => setLoading(false))
  }, [applicationId])

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900/40">
      <div className="mb-3 flex items-center gap-2">
        <History className="h-4 w-4 text-slate-500" />
        <h4 className="font-semibold">Lịch sử giao dịch</h4>
      </div>
      {loading && <p className="text-sm text-slate-500 dark:text-slate-400">Đang tải...</p>}
      {error && <Alert variant="error">{error}</Alert>}
      {!loading && txs.length === 0 && (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Chưa có giao dịch thanh toán nào.
        </p>
      )}
      <div className="mt-3 space-y-2">
        {txs.map((tx) => {
          const st = tx.status?.toUpperCase() ?? ''
          const isSuccess = st === '00' || st === 'SUCCESS' || st === 'PAID'
          const isPending = st === '01' || st === 'PENDING'
          const isCancelled = st === '24' || st === 'CANCELLED'
          const variant = isSuccess ? 'success' : isCancelled ? 'danger' : 'warning'
          const label = isSuccess ? 'Thành công' : isCancelled ? 'Đã hủy' : isPending ? 'Chờ xử lý' : st || 'Không rõ'
          return (
            <div key={tx.orderId} className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/40">
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{tx.orderId}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {tx.orderInfo || 'Thanh toán VNPay'} · {tx.vnpBankCode ?? 'VNPay'}
                </p>
                {tx.createdAt && (
                  <p className="text-[11px] text-slate-400">
                    {new Date(tx.createdAt).toLocaleString('vi-VN')}
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {Number(tx.amount).toLocaleString('vi-VN')} VNĐ
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
  if (hasError) {
    return (
      <div className="rounded-md border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-700 dark:bg-yellow-900/20">
        <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
          Chưa tải được lịch thanh toán chính thức.
        </p>
        <p className="mt-1 text-xs text-yellow-700 dark:text-yellow-400">
          Hồ sơ có thể chưa được tạo đợt thanh toán. Liên hệ CĐT hoặc thử lại sau.
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
    return (
      <Alert variant="warning">
        <p className="font-medium">Hợp đồng đã ký nhưng hệ thống chưa sinh lịch thanh toán.</p>
        <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
          Liên hệ CĐT / Ban quản lý dự án để được tạo lịch 6 đợt.
        </p>
      </Alert>
    )
  }

  if (installments.length === 0) {
    return (
      <Alert variant="info">
        <strong>Chưa có lịch thanh toán.</strong> Hệ thống sẽ sinh lịch 6 đợt sau khi CĐT gán căn hộ cho bạn.
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
            {installments.length} đợt · theo Luật Nhà ở
          </span>
        </div>

        {mismatch && (
          <Alert variant="warning" className="mb-4">
            <p className="font-medium">Số tiền lịch thanh toán không khớp giá nhà chính thức.</p>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
              Tổng 6 đợt: <b>{sumPhases.toLocaleString('vi-VN')}</b> VNĐ —
              Giá nhà: <b>{ref!.toLocaleString('vi-VN')}</b> VNĐ.
              Vui lòng báo CĐT/ban quản lý đối soát.
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

      {/* Tải PDF */}
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
    </div>
  )
}

// ─── Ký HĐ section ───────────────────────────────────────────────────────────

interface SignContractSectionProps {
  canSign: boolean
  signing: boolean
  onSign: () => void
  applicationStatus: string
}

export function SignContractSection({ canSign, signing, onSign }: SignContractSectionProps) {
  if (!canSign) return null
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-800 dark:bg-amber-950/30">
      <h4 className="mb-2 font-semibold">
        Bạn cần đồng ý điều khoản hợp đồng mua bán nhà ở xã hội
      </h4>
      <p className="mb-3 text-sm text-slate-700 dark:text-slate-300">
        Bằng việc bấm «Đồng ý», bạn xác nhận đã đọc và đồng ý với các điều khoản mua bán nhà ở xã hội.
        Sau khi ký, <strong>Đợt 2 (20% — Thanh toán ký HĐ) sẽ tự mở</strong> và bạn có thể đóng ngay.
      </p>
      <Button variant="accent" disabled={signing} onClick={() => void onSign()}>
        <PenLine className="mr-1.5 h-4 w-4" />
        {signing ? 'Đang ký...' : 'Đồng ý điều khoản'}
      </Button>
    </div>
  )
}

// ─── Apartment Card ────────────────────────────────────────────────────────────

interface ApartmentCardProps {
  apartmentUnitName?: string | null
  apartmentArea?: number | null
  apartmentPrice?: number | null
  projectName: string
  lotteryResult?: string | null
}

export function ApartmentCard({
  apartmentUnitName,
  apartmentArea,
  apartmentPrice,
  projectName,
  lotteryResult,
}: ApartmentCardProps) {
  return (
    <div className="rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50/60 to-violet-50/40 p-5 dark:border-indigo-800 dark:from-indigo-950/30 dark:to-violet-950/20">
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-900/50">
          <Home className="h-6 w-6 text-indigo-600 dark:text-indigo-300" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">
            Căn được cấp
          </p>
          <h3 className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">
            {apartmentUnitName ?? 'Chưa xác định'}
          </h3>
          <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">{projectName}</p>
          {lotteryResult && (
            <Badge variant="success" className="mt-2">
              {lotteryResult === 'WON' ? '✓ Trúng bốc thăm' :
               lotteryResult === 'PRIORITY_WON' ? '✓ Ưu tiên trúng' : lotteryResult}
            </Badge>
          )}
        </div>
        {apartmentPrice != null && (
          <div className="text-right">
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Giá căn</p>
            <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
              {Number(apartmentPrice).toLocaleString('vi-VN')}
            </p>
            <p className="text-xs text-slate-500">VNĐ</p>
          </div>
        )}
      </div>
      {apartmentArea != null && (
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
          Diện tích: <strong>{apartmentArea} m²</strong>
        </p>
      )}
    </div>
  )
}
