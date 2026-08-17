import { Badge } from '@/components/ui/badge'
import type { LiveStateDto } from '@/api/lottery'

interface Props {
  state: LiveStateDto | null
  sessionStatus: string
  isDev: boolean
  onDrawNext?: () => void
  busy?: boolean
}

function maskCccd(cid: string | null | undefined): string {
  if (!cid) return '—'
  if (cid.length < 4) return cid
  return cid.slice(0, 3) + '****' + cid.slice(-4)
}

function slotLabel(code: string | null | undefined) {
  if (code) return <span className="font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400">{code}</span>
  return <span className="text-sm font-medium text-amber-600 dark:text-amber-400">Chờ CĐT chọn căn</span>
}

export function LiveZone({ state, sessionStatus, isDev, onDrawNext, busy }: Props) {
  const rawTotal = state?.totalUnits ?? 0
  const rawDrawn = state?.drawnUnitsCount ?? 0
  // Sanity cap: nếu BE trả drawn > total (do race-condition khi bấm BỐC TIẾP
  // ghi nhiều bản ghi DrawResult trùng nhau, hoặc totalUnits đếm từ Apartment
  // thay vì quỹ lottery) thì khoá hiển thị về total để UI không "lên 3/5" rồi
  // vượt mốc. Log 1 lần để FE team báo lại BE.
  const total = Math.max(0, rawTotal)
  const drawn = Math.min(rawDrawn, total)
  // Luôn tính remaining = total - drawn, KHÔNG dùng BE.remainingUnits vì BE
  // đang trả sai (ví dụ: drawn=4,total=8 nhưng remaining=5 thay vì 4).
  const remaining = Math.max(0, total - drawn)
  const pct = total > 0 ? Math.min(100, Math.round((drawn / total) * 100)) : 0
  if (rawDrawn > rawTotal && rawTotal > 0 && !(LiveZone as { _warned?: boolean })._warned) {
    (LiveZone as { _warned?: boolean })._warned = true
    console.warn(
      `[LiveZone] BE trả drawn (${rawDrawn}) > total (${rawTotal}) — đã cap về ${total}. ` +
      'Có thể do BE ghi trùng DrawResult hoặc totalUnits chưa trừ căn đã gán. Báo BE team.',
    )
  }

  return (
    <section className="space-y-4 rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-5 dark:border-blue-800 dark:from-blue-950/40 dark:to-indigo-950/40">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-bold text-blue-800 dark:text-blue-200">
          <span className="text-2xl">🎯</span> Sảnh quay số
        </h2>
        <Badge variant={sessionStatus === 'Live' ? 'warning' : sessionStatus === 'Paused' ? 'warning' : 'secondary'}>
          {sessionStatus === 'Live' && '● Đang Live'}
          {sessionStatus === 'Paused' && '⏸ Tạm dừng'}
          {sessionStatus === 'WaitingLobby' && '⏳ Sảnh chờ'}
          {sessionStatus === 'Finished' && '✓ Kết thúc'}
          {sessionStatus === 'Published' && '📢 Đã công bố'}
          {sessionStatus === 'Scheduled' && '📅 Đã lên lịch'}
        </Badge>
      </div>

      {/* Progress bar */}
      <div>
        <div className="mb-1.5 flex items-center justify-between text-sm">
          <span className="font-medium text-slate-600 dark:text-slate-300">Tiến độ bốc</span>
          <span className="font-bold tabular-nums text-blue-700 dark:text-blue-300">
            {drawn}/{total || '—'} căn ({pct}%)
          </span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-500 transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
        {remaining > 0 && (
          <p className="mt-1 text-xs text-slate-500">
            Còn lại: <strong className="text-amber-600">{remaining} căn</strong> · Tỷ lệ trúng: <strong className="text-emerald-600">{state?.winRatePercentage ?? 0}%</strong>
          </p>
        )}
      </div>

      {/* Candidate card */}
      <div className="rounded-xl border border-blue-200 bg-white/80 py-6 text-center dark:border-blue-700 dark:bg-slate-900/60">
        {state?.nextCandidate ? (
          <div className="space-y-1.5">
            <p className="text-[11px] uppercase tracking-widest text-blue-500 dark:text-blue-400">Hồ sơ đang quay</p>
            <p className="text-3xl font-black tracking-tight text-blue-900 dark:text-blue-100">
              {state.nextCandidate.applicationCode || state.nextCandidate.applicationId.slice(0, 8)}
            </p>
            <p className="font-semibold text-slate-700 dark:text-slate-200">
              {state.nextCandidate.applicantName || '—'}
            </p>
            {state.nextCandidate.priorityGroup && (
              <Badge variant="default">{state.nextCandidate.priorityGroup}</Badge>
            )}
          </div>
        ) : sessionStatus === 'Paused' ? (
          <div className="space-y-1">
            <p className="text-2xl">⏸</p>
            <p className="font-semibold text-amber-700 dark:text-amber-300">Tạm dừng — chờ CĐT tiếp tục</p>
          </div>
        ) : sessionStatus === 'Live' ? (
          <div className="space-y-1">
            <p className="text-2xl animate-pulse">⚡</p>
            <p className="font-semibold text-blue-700 dark:text-blue-300">Đang quay…</p>
          </div>
        ) : sessionStatus === 'Finished' || sessionStatus === 'Published' ? (
          <div className="space-y-1">
            <p className="text-2xl">✓</p>
            <p className="font-medium text-slate-600 dark:text-slate-300">Phiên đã kết thúc</p>
          </div>
        ) : (
          <div className="space-y-1">
            <p className="text-2xl">⏳</p>
            <p className="font-medium text-slate-500">Chờ CĐT bắt đầu bốc</p>
          </div>
        )}
      </div>

      {/* Latest result */}
      {state?.latestDrawResult && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-800 dark:bg-emerald-950/20">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
            Kết quả vừa công bố
          </p>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-0.5">
              <p className="font-black text-emerald-900 dark:text-emerald-100">
                {state.latestDrawResult.applicationCode || state.latestDrawResult.applicationId.slice(0, 8)}
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {state.latestDrawResult.applicantName} · {maskCccd(state.latestDrawResult.maskedCitizenId)}
              </p>
            </div>
            <div className="text-right space-y-1">
              <Badge variant={
                state.latestDrawResult.result === 'PRIORITY_WON' ? 'default' :
                state.latestDrawResult.result === 'WON' ? 'success' :
                state.latestDrawResult.result === 'LOST' ? 'danger' : 'secondary'
              }>
                {state.latestDrawResult.result === 'PRIORITY_WON' ? 'Ưu tiên trúng' :
                 state.latestDrawResult.result === 'WON' ? 'Trúng' :
                 state.latestDrawResult.result === 'LOST' ? 'Trượt' :
                 state.latestDrawResult.result}
              </Badge>
              <p className="mt-1 block">{slotLabel(state.latestDrawResult.slotCode)}</p>
            </div>
          </div>
        </div>
      )}

      {/* CĐT: Bốc tiếp button */}
      {isDev && sessionStatus === 'Live' && (
        <button
          className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 py-3.5 text-center text-base font-bold text-white shadow-lg shadow-indigo-500/30 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
          disabled={!!busy}
          onClick={onDrawNext}
        >
          {busy ? '⚡ Đang bốc...' : '🎱 BỐC TIẾP'}
        </button>
      )}
    </section>
  )
}
