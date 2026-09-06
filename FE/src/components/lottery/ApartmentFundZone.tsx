import React from 'react'
import type { LiveStateDto } from '@/api/lottery'
import { Building2, ShieldCheck, Home, CheckCircle2, PieChart } from 'lucide-react'

interface Props {
  state: LiveStateDto | null
}

export const ApartmentFundZone: React.FC<Props> = ({ state }) => {
  const totalStat = state?.projectApartmentFundStat
  const total = totalStat?.totalUnits ?? 0
  const remaining = totalStat?.remainingUnits ?? 0
  const assigned = totalStat?.assignedUnits ?? (total > 0 ? total - remaining : 0)

  // Tiến độ phân bổ quỹ căn (% đã bốc trúng và gán cho người dân)
  const assignedPct = total > 0 ? Math.round((assigned / total) * 100) : 0
  const isFullyAllocated = total > 0 && assigned >= total

  const funds = state?.apartmentFundStats ?? []

  return (
    <div className="flex flex-col gap-3 rounded-3xl border border-slate-200/90 bg-white p-5 shadow-sm">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 border border-indigo-200/60 text-indigo-600 shadow-xs">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
              Quỹ Căn Hộ Mở Bốc Thăm
              {isFullyAllocated && (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-700">
                  ĐÃ PHÂN BỔ 100%
                </span>
              )}
            </h2>
            <p className="text-[11px] text-slate-500">Giám sát hạn ngạch căn hộ nhà ở xã hội phân bổ theo thời gian thực</p>
          </div>
        </div>

        {total > 0 && (
          <div className={`rounded-full border px-3 py-1 text-xs font-bold ${isFullyAllocated
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-indigo-200 bg-indigo-50 text-indigo-800'
            }`}>
            {assigned}/{total} căn đã có chủ · Còn {remaining} căn
          </div>
        )}
      </div>

      {/* Overall Progress Vault */}
      {totalStat && total > 0 ? (
        <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/40 via-white to-blue-50/30 p-4">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-slate-700 flex items-center gap-1.5">
              <PieChart className="h-4 w-4 text-indigo-600" />
              Tiến độ phân bổ quỹ căn nhà ở xã hội
            </span>
            <span className="font-mono font-black text-indigo-700">
              {assigned} / {total} căn ({assignedPct}%)
            </span>
          </div>

          <div className="mt-2 h-3.5 overflow-hidden rounded-full bg-slate-100 p-0.5 border border-slate-200/60">
            <div
              className={`h-full rounded-full transition-all duration-700 ${isFullyAllocated
                  ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600'
                  : 'bg-gradient-to-r from-indigo-500 via-blue-500 to-amber-500'
                }`}
              style={{ width: `${Math.max(assignedPct, 4)}%` }}
            />
          </div>

          <div className="mt-2 flex items-center justify-between text-[11px]">
            <span className="text-slate-600 font-medium">
              Đã bốc trúng: <strong className="text-indigo-700 font-bold">{assigned} căn</strong>
            </span>
            <span className={`font-bold ${isFullyAllocated ? 'text-emerald-600' : 'text-amber-600'}`}>
              {isFullyAllocated ? '✓ Đã phân bổ hết toàn bộ quỹ căn' : `Còn lại: ${remaining} căn khả dụng`}
            </span>
          </div>
        </div>
      ) : null}

      {/* Category breakdown */}
      {funds.length > 0 ? (
        <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
          {funds.map((f, idx) => {
            const t = f.totalUnits ?? 0
            const r = f.remainingUnits ?? t
            const a = f.assignedUnits ?? (t > 0 ? t - r : 0)
            const catPct = t > 0 ? Math.round((a / t) * 100) : 0
            const isCatFull = t > 0 && a >= t

            return (
              <div
                key={idx}
                className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 hover:bg-slate-50 transition-all"
              >
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-800 flex items-center gap-1.5">
                    <Home className="h-3.5 w-3.5 text-indigo-500" />
                    {f.categoryName || `Căn hộ Loại #${idx + 1}`}
                  </span>
                  <span className="font-mono text-indigo-700 flex items-center gap-1">
                    {a}/{t} căn
                    {isCatFull && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
                  </span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className={`h-full rounded-full transition-all ${isCatFull
                        ? 'bg-emerald-500'
                        : 'bg-gradient-to-r from-indigo-500 to-blue-500'
                      }`}
                    style={{ width: `${Math.max(catPct, 5)}%` }}
                  />
                </div>
                <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500">
                  <span>Đã gán: {a} căn</span>
                  <span>{isCatFull ? 'Hết suất' : `Còn ${r} căn`}</span>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 py-5 text-center">
          <p className="text-xl">🏢</p>
          <p className="mt-1.5 text-xs font-bold text-slate-600">Đã cập nhật quỹ căn tổng thể</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Phân bổ chi tiết từng loại phòng áp dụng theo hồ sơ trúng thăm</p>
        </div>
      )}

      {/* Legal standard note */}
      <div className="mt-1 flex items-start gap-2 rounded-xl border border-emerald-100 bg-emerald-50/50 p-2.5 text-[11px] text-slate-600">
        <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
        <span>
          <strong>Quỹ căn bốc thăm:</strong> Toàn bộ số lượng căn hộ được Sở Xây dựng cấp phép mở bốc theo <strong>khoản 2 Điều 38 Nghị định số 100 năm 2024 của Chính phủ</strong>. Mỗi lượt bốc trúng sẽ được tự động gán vào một căn trong quỹ.
        </span>
      </div>
    </div>
  )
}
