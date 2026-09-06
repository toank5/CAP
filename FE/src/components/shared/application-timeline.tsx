import { APPLICATION_STATUS } from '@/lib/constants'

/**
 * Tiến độ sau khi nộp — khớp mobile và luồng BE:
 * nộp → chủ đầu tư → Sở → chờ chốt suất → cọc Đợt 1 → ký HĐ.
 * Các đợt thanh toán sau nằm ở lịch thanh toán, không phải bước timeline.
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
    key: 'DEPOSIT_PENDING',
    label: 'Cọc tiền',
    hint: 'Đóng cọc để giữ suất nhà',
  },
  {
    key: 'CONTRACT_PENDING',
    label: 'Ký hợp đồng',
    hint: 'Ký hợp đồng mua bán',
  },
] as const

const TERMINAL_FAIL = new Set(['REJECTED', 'CANCELED', 'EXPIRED', 'LOTTERY_LOST'])
const WAITLIST_STATUSES = new Set(['WAITLIST'])
const TERMINAL_SUCCESS = new Set([
  'CONTRACT_SIGNED',
  'INSTALLMENT_IN_PROGRESS',
  'PARTIALLY_PAID',
  'PAID',
  'FULLY_PAID',
])

function statusLabel(status: string) {
  return APPLICATION_STATUS[status]?.label ?? status
}

function resolveIndex(status: string, depositPaid?: boolean): number {
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
      return 4
    case 'CONTRACT_PENDING':
    case 'CONTRACTING':
      // Dữ liệu cũ: CONTRACT_PENDING trước khi cọc → đứng ở bước cọc.
      if (depositPaid !== true) return 4
      return 5
    case 'DEPOSIT_PAID':
      // BE cũ: cọc xong vẫn DEPOSIT_PAID. Bước tiếp theo là ký, chưa hoàn tất pipeline.
      return 5
    case 'CONTRACT_SIGNED':
    case 'INSTALLMENT_IN_PROGRESS':
    case 'PARTIALLY_PAID':
    case 'PAID':
    case 'FULLY_PAID':
    case 'CANCELLATION_REQUESTED':
      return 5
    default:
      return 0
  }
}

export function ApplicationTimeline({
  currentStatus,
  depositPaid,
  needMoreNote,
}: {
  currentStatus: string
  depositPaid?: boolean
  needMoreNote?: string | null
  histories?: unknown
}) {
  const status = (currentStatus || '').toUpperCase()
  const currentIdx = resolveIndex(status, depositPaid)
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
            Hồ sơ không bị hủy. Khi có căn trả lại, hệ thống chuyển quyền mua theo thứ hạng.
          </p>
        </div>
      )}
      {isCancellation && (
        <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 ring-1 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-800">
          <p className="font-semibold">Đơn xin ngừng thanh toán đang chờ duyệt</p>
          <p className="mt-0.5">
            Chủ đầu tư sẽ xác nhận. Tiền cọc đợt đầu bị trừ nếu đơn được chấp thuận.
          </p>
        </div>
      )}
      {isComplete && (
        <p className="rounded-lg bg-sky-50 px-3 py-2 text-sm text-sky-800 ring-1 ring-sky-200 dark:bg-sky-950/40 dark:text-sky-200 dark:ring-sky-800">
          {status === 'FULLY_PAID'
            ? 'Bạn đã hoàn tất các khoản trên lịch thanh toán.'
            : 'Đã ký hợp đồng. Các khoản còn lại xem trong lịch thanh toán — chủ đầu tư sẽ mở dần theo tiến độ.'}
        </p>
      )}

      <ol className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-1">
        {PIPELINE.map((step, idx) => {
          const done = !isFailed && (isComplete ? idx <= currentIdx : idx < currentIdx)
          const active = !isFailed && !isComplete && idx === currentIdx
          const needMoreHere = active && isNeedMore
          const muted = isFailed || (!done && !active)

          const label = needMoreHere ? 'Cần bổ sung giấy tờ' : step.label
          const hint = needMoreHere
            ? 'Bổ sung xong rồi nộp lại để chủ đầu tư xét tiếp'
            : status === 'LOTTERY_WON' && idx === 3 && active
              ? 'Đã trúng suất — chờ chủ đầu tư chọn căn'
              : active
                ? step.hint
                : done
                  ? 'Đã xong'
                  : step.hint

          return (
            <li key={step.key} className="relative flex flex-1 items-start gap-3 sm:flex-col sm:items-center sm:text-center">
              {idx < PIPELINE.length - 1 && (
                <span
                  className={`absolute left-4 top-8 hidden h-[calc(100%-2rem)] w-0.5 sm:left-auto sm:top-4 sm:block sm:h-0.5 sm:w-full sm:translate-x-1/2 ${
                    done || active ? 'bg-blue-500' : 'bg-slate-200 dark:bg-slate-700'
                  }`}
                  aria-hidden
                />
              )}
              <span
                className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  needMoreHere
                    ? 'bg-amber-600 text-white ring-4 ring-amber-100 dark:ring-amber-900'
                    : done
                      ? 'bg-emerald-500 text-white'
                      : active
                        ? 'bg-blue-600 text-white ring-4 ring-blue-100 dark:ring-blue-900'
                        : muted
                          ? 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                          : 'bg-slate-200 text-slate-500'
                }`}
              >
                {done ? '✓' : idx + 1}
              </span>
              <div className="min-w-0 pt-0.5 sm:pt-2">
                <p
                  className={`text-sm font-semibold ${
                    needMoreHere
                      ? 'text-amber-700 dark:text-amber-300'
                      : active
                        ? 'text-blue-700 dark:text-blue-300'
                        : done
                          ? 'text-emerald-700 dark:text-emerald-300'
                          : 'text-slate-500'
                  }`}
                >
                  {label}
                </p>
                <p className="mt-0.5 text-[11px] leading-snug text-slate-500 dark:text-slate-400">{hint}</p>
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
