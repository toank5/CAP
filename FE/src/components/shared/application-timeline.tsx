import { APPLICATION_STATUS } from '@/lib/constants'

/**
 * Tiến độ sau khi nộp — khớp mobile và luồng BE:
 * nộp → chủ đầu tư → Sở → chờ chốt suất → ký HĐ.
 * Đợt 1 và các đợt sau nằm ở lịch thanh toán, không phải bước timeline.
 */
const PIPELINE = [
  {
    key: 'SUBMITTED',
    label: 'Đã nộp',
    hint: 'Hồ sơ đã gửi lên hệ thống',
  },
  {
    key: 'REVIEWING',
    label: 'Chủ đầu tư tiếp nhận hồ sơ',
    hint: 'Chủ đầu tư đang tiếp nhận và thẩm định',
  },
  {
    key: 'PENDING_SXD_REVIEW',
    label: 'Sở Xây dựng tiếp nhận hồ sơ',
    hint: 'Sở duyệt hoặc từ chối',
  },
  {
    key: 'APPROVED',
    label: 'Chờ chốt suất',
    hint: 'Cấp thẳng hoặc sau bốc thăm',
  },
  {
    key: 'CONTRACT_PENDING',
    label: 'Ký hợp đồng',
    hint: 'Ký hợp đồng mua bán; Đợt 1 mở sau khi ký',
  },
] as const

const TERMINAL_FAIL = new Set(['REJECTED', 'CANCELED', 'EXPIRED', 'LOTTERY_LOST'])
const WAITLIST_STATUSES = new Set(['WAITLIST'])
const TERMINAL_SUCCESS = new Set([
  'CONTRACT_SIGNED',
  'INSTALLMENT_IN_PROGRESS',
  'DEPOSIT_PAID',
  'PARTIALLY_PAID',
  'PAID',
  'FULLY_PAID',
])

function statusLabel(status: string) {
  return APPLICATION_STATUS[status]?.label ?? status
}

function resolveIndex(status: string): number {
  switch (status) {
    case 'DRAFT':
    case 'SUBMITTED':
      return 0
    case 'REVIEWING':
    case 'NEED_MORE_DOCUMENTS':
      return 1
    case 'PENDING_SXD_REVIEW':
      return 2
    case 'APPROVED':
    case 'APPROVED_BY_TIMEOUT':
    case 'LOTTERY_WON':
    case 'LOTTERY_LOST':
    case 'LOTTERY_PENDING':
    case 'LOTTERY_WAITING':
    case 'LOTTERY_IN_PROGRESS':
    case 'WAITLIST':
      return 3
    case 'DEPOSIT_PENDING':
    case 'CONTRACT_PENDING':
    case 'CONTRACTING':
    case 'DEPOSIT_PAID':
    case 'CONTRACT_SIGNED':
    case 'INSTALLMENT_IN_PROGRESS':
    case 'PARTIALLY_PAID':
    case 'PAID':
    case 'FULLY_PAID':
    case 'CANCELLATION_REQUESTED':
      return 4
    default:
      return 0
  }
}

export function ApplicationTimeline({
  currentStatus,
  needMoreNote,
}: {
  currentStatus: string
  depositPaid?: boolean
  needMoreNote?: string | null
  histories?: unknown
}) {
  const status = (currentStatus || '').toUpperCase()
  const currentIdx = resolveIndex(status)
  const isNeedMore = status === 'NEED_MORE_DOCUMENTS'
  const isFailed = TERMINAL_FAIL.has(status)
  const isWaitlist = WAITLIST_STATUSES.has(status)
  const isComplete = TERMINAL_SUCCESS.has(status)
  const isCancellation = status === 'CANCELLATION_REQUESTED'

  return (
    <div className="space-y-3">
      {isNeedMore && (
        <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 ring-1 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-800">
          <p className="font-semibold">Chủ đầu tư cần bạn bổ sung giấy tờ</p>
          <p className="mt-0.5">
            {needMoreNote?.trim()
              ? needMoreNote.trim()
              : 'Vui lòng cập nhật giấy tờ theo yêu cầu, rồi nộp lại hồ sơ.'}
          </p>
        </div>
      )}
      {isFailed && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800 ring-1 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-200 dark:ring-rose-800">
          Hồ sơ kết thúc: <strong>{statusLabel(status)}</strong>
        </p>
      )}
      {isWaitlist && (
        <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 ring-1 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-800">
          <p className="font-semibold">Đã xếp danh sách chờ (dự bị)</p>
          <p className="mt-0.5">
            Hồ sơ không bị hủy. Xếp theo hạng (#1, #2, #3…). Khi có căn trả lại, quyền mua chuyển cho người đứng đầu — hạn xác nhận 48 giờ.
          </p>
        </div>
      )}
      {isCancellation && (
        <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 ring-1 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-800">
          <p className="font-semibold">Đơn xin ngừng thanh toán đang chờ duyệt</p>
          <p className="mt-0.5">
            Chủ đầu tư sẽ xác nhận. Tiền đặt cọc trong Đợt 1 bị trừ nếu đơn được chấp thuận.
          </p>
        </div>
      )}
      {isComplete && (
        <p className="rounded-lg bg-sky-50 px-3 py-2 text-sm text-sky-800 ring-1 ring-sky-200 dark:bg-sky-950/40 dark:text-sky-200 dark:ring-sky-800">
          {status === 'FULLY_PAID'
            ? 'Bạn đã hoàn tất các khoản trên lịch thanh toán.'
            : status === 'CONTRACT_SIGNED'
              ? 'Đã ký hợp đồng. Đợt 1 (thanh toán lần đầu) đã mở trên lịch thanh toán.'
              : 'Đã ký hợp đồng. Các khoản còn lại xem trong lịch thanh toán — chủ đầu tư sẽ mở dần theo tiến độ.'}
        </p>
      )}

      <ol className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-1">
        {PIPELINE.map((step, idx) => {
          const done = !isFailed && (isComplete ? idx <= currentIdx : idx < currentIdx)
          const current = !isFailed && !isComplete && idx === currentIdx
          return (
            <li key={step.key} className="flex flex-1 items-start gap-2">
              <span
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  done
                    ? 'bg-emerald-600 text-white'
                    : current
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                }`}
              >
                {done ? '✓' : idx + 1}
              </span>
              <div>
                <p
                  className={`text-sm font-semibold ${
                    current
                      ? 'text-indigo-700 dark:text-indigo-300'
                      : done
                        ? 'text-slate-800 dark:text-slate-100'
                        : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {step.label}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{step.hint}</p>
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
