import type { LiveStateDto } from '@/api/lottery'

interface Props {
  state: LiveStateDto | null
}

export function ApartmentFundZone({ state }: Props) {
  const totalStat = state?.projectApartmentFundStat
  const total = totalStat?.totalUnits ?? 0
  const remaining = totalStat?.remainingUnits ?? total
  const assigned = totalStat?.assignedUnits ?? 0
  const pct = total > 0 ? Math.round((remaining / total) * 100) : 0

  const funds = state?.apartmentFundStats ?? []

  return (
    <section className="space-y-3 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50/70 to-yellow-50/50 p-5 dark:border-amber-800 dark:from-amber-950/30 dark:to-yellow-950/20">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-bold text-amber-800 dark:text-amber-200">
          <span className="text-2xl">🏠</span> Quỹ căn hộ
        </h2>
        {total > 0 && (
          <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
            {assigned} đã gán · {pct}% còn
          </span>
        )}
      </div>

      {/* Overall bar */}
      {totalStat && total > 0 && (
        <div>
          <div className="mb-1.5 flex items-center justify-between text-sm">
            <span className="font-medium text-slate-600 dark:text-slate-300">Tổng quỹ dự án</span>
            <span className="font-bold tabular-nums text-amber-700 dark:text-amber-300">
              {remaining} / {total} căn còn
            </span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-yellow-400 transition-all duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
            <span className="text-amber-600 dark:text-amber-400">Đã gán: {assigned} căn</span>
            <span className="font-bold text-amber-600 dark:text-amber-400">{pct}%</span>
          </div>
        </div>
      )}

      {/* By category */}
      {funds.length > 0 ? (
        <div className="space-y-2">
          {funds.map((f, idx) => {
            const t = f.totalUnits ?? 0
            const r = f.remainingUnits ?? t
            const p = t > 0 ? Math.round((r / t) * 100) : 0
            return (
              <div
                key={idx}
                className="rounded-lg border border-amber-200 bg-white/60 p-3 dark:border-amber-800 dark:bg-amber-950/20"
              >
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="font-semibold text-amber-900 dark:text-amber-100">
                    {f.categoryName || `Loại ${idx + 1}`}
                  </span>
                  <span className="text-xs text-slate-500 tabular-nums">
                    {r} / {t} căn còn
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                  <div
                    className="h-full rounded-full bg-amber-400 transition-all"
                    style={{ width: `${p}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-amber-300 bg-white/40 py-6 text-center dark:border-amber-800 dark:bg-amber-950/20">
          <p className="text-3xl">🏗</p>
          <p className="mt-2 font-medium text-amber-600 dark:text-amber-400">Chưa có thông tin quỹ căn</p>
          <p className="mt-1 text-sm text-slate-500">Quỹ căn sẽ hiển thị sau khi bắt đầu Live</p>
        </div>
      )}
    </section>
  )
}
