import { APPLICATION_STATUS } from '@/lib/constants'

const PIPELINE = [
  'DRAFT',
  'SUBMITTED',
  'REVIEWING',
  'PENDING_SXD_REVIEW',
  'APPROVED',
  'DEPOSIT_PENDING',
  'CONTRACTING',
  'CONTRACT_PENDING',
  'CONTRACT_SIGNED',
  'DEPOSIT_PAID',
] as const

const TERMINAL_FAIL = new Set(['REJECTED', 'CANCELED', 'EXPIRED', 'LOTTERY_LOST'])
/** Trạng thái đã hoàn tất toàn bộ pipeline (đánh dấu hết bước ✓). */
const TERMINAL_SUCCESS = new Set(['DEPOSIT_PAID', 'FULLY_PAID'])
/** Map alias → bước pipeline tương ứng. */
const STATUS_ALIAS: Record<string, (typeof PIPELINE)[number]> = {
  NEED_MORE_DOCUMENTS: 'SUBMITTED',
  APPROVED_BY_TIMEOUT: 'APPROVED',
  FULLY_PAID: 'DEPOSIT_PAID',
  PAID: 'DEPOSIT_PAID',
}

function stepLabel(code: string) {
  return APPLICATION_STATUS[code]?.label ?? code
}

function resolveIndex(status: string, depositPaid?: boolean): number {
  if (depositPaid) return PIPELINE.indexOf('DEPOSIT_PAID' as (typeof PIPELINE)[number])
  const mapped = STATUS_ALIAS[status] ?? status
  const idx = PIPELINE.indexOf(mapped as (typeof PIPELINE)[number])
  return idx >= 0 ? idx : 0
}

export function ApplicationTimeline({
  currentStatus,
  depositPaid,
}: {
  currentStatus: string
  depositPaid?: boolean
  histories?: unknown
}) {
  const currentIdx = resolveIndex(currentStatus, depositPaid)
  const isNeedMore = currentStatus === 'NEED_MORE_DOCUMENTS'
  const isFailed = TERMINAL_FAIL.has(currentStatus)
  const isComplete = TERMINAL_SUCCESS.has(currentStatus)

  return (
    <div className="space-y-3">
      {isNeedMore && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 ring-1 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-800">
          Hồ sơ đang ở trạng thái <strong>Cần bổ sung giấy tờ</strong>. Vui lòng tải lại tài liệu và nộp lại.
        </p>
      )}
      {isFailed && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800 ring-1 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-200 dark:ring-rose-800">
          Hồ sơ kết thúc: <strong>{stepLabel(currentStatus)}</strong>
        </p>
      )}

      <ol className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-1">
        {PIPELINE.map((code, idx) => {
          const done = !isFailed && (idx < currentIdx || (isComplete && idx <= currentIdx))
          const active = !isFailed && !isComplete && idx === currentIdx
          const muted = isFailed || (!done && !active)

          return (
            <li key={code} className="relative flex flex-1 items-start gap-3 sm:flex-col sm:items-center sm:text-center">
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
                  done
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
                    active ? 'text-blue-700 dark:text-blue-300' : done ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-500'
                  }`}
                >
                  {stepLabel(code)}
                </p>
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
