import { Badge } from '@/components/ui/badge'
import type { LiveStateDto } from '@/api/lottery'

interface Props {
  state: LiveStateDto | null
  myAppId?: string | null
}

function maskCccd(cid: string | null | undefined): string {
  if (!cid) return '—'
  if (cid.length < 4) return cid
  return cid.slice(0, 3) + '****' + cid.slice(-4)
}

export function WinnersZone({ state, myAppId }: Props) {
  const winners = state?.recentWinners ?? []

  return (
    <section className="space-y-3 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/60 to-green-50/40 p-5 dark:border-emerald-800 dark:from-emerald-950/30 dark:to-green-950/20">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-bold text-emerald-800 dark:text-emerald-200">
          <span className="text-2xl">🏆</span> Danh sách trúng
          <Badge variant="success">{winners.length}</Badge>
        </h2>
        <div className="flex gap-3 text-xs text-slate-500">
          <span>Ưu tiên: <strong className="text-emerald-600">{state?.priorityWinnersCount ?? 0}</strong></span>
          <span>Ngẫu nhiên: <strong className="text-emerald-600">{state?.randomWinnersCount ?? 0}</strong></span>
        </div>
      </div>

      {winners.length === 0 ? (
        <div className="rounded-xl border border-dashed border-emerald-300 bg-white/50 py-8 text-center dark:border-emerald-800 dark:bg-emerald-950/20">
          <p className="text-3xl">🎲</p>
          <p className="mt-2 font-medium text-emerald-600 dark:text-emerald-400">Chưa có hồ sơ trúng nào</p>
          <p className="mt-1 text-sm text-slate-500">Danh sách sẽ cập nhật sau mỗi lượt bốc</p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Header */}
          <div className="grid grid-cols-[2rem_1fr_1fr_1fr_1fr] gap-1 px-2 text-[11px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
            <span>#</span>
            <span>Mã HS</span>
            <span>Họ tên</span>
            <span>CCCD</span>
            <span>Căn hộ</span>
          </div>

          {winners.map((w, idx) => {
            const isMine = w.applicationId === myAppId
            return (
              <div
                key={w.applicationId}
                className={`grid grid-cols-[2rem_1fr_1fr_1fr_1fr] items-center gap-1 rounded-xl px-3 py-2.5 text-sm transition-all ${
                  isMine
                    ? 'border-2 border-blue-400 bg-blue-50 dark:border-blue-600 dark:bg-blue-950/40'
                    : 'border border-emerald-200 bg-white/70 dark:border-emerald-800 dark:bg-emerald-900/20'
                }`}
              >
                <span className="font-bold tabular-nums text-emerald-500">{idx + 1}</span>
                <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-200">
                  {w.applicationCode || w.applicationId.slice(0, 8)}
                </span>
                <span className={`font-medium ${isMine ? 'text-blue-800 dark:text-blue-200' : 'text-slate-800 dark:text-slate-100'}`}>
                  {w.applicantName}
                  {isMine && <span className="ml-1 text-[10px] font-bold text-blue-600 dark:text-blue-300">(bạn)</span>}
                </span>
                <span className="font-mono text-xs text-slate-500">{maskCccd(w.maskedCitizenId)}</span>
                <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  {w.slotCode || '—'}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
