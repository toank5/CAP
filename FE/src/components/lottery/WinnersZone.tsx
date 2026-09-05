import React, { useState, useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import type { LiveStateDto } from '@/api/lottery'
import { Trophy, Search, Star, Sparkles } from 'lucide-react'

interface Props {
  state: LiveStateDto | null
  myAppId?: string | null
}

function maskCccd(cid: string | null | undefined): string {
  if (!cid) return '—'
  if (cid.length < 4) return cid
  return cid.slice(0, 3) + '****' + cid.slice(-4)
}

export const WinnersZone: React.FC<Props> = ({ state, myAppId }) => {
  const [filter, setFilter] = useState('')
  const winners = state?.recentWinners ?? []

  const filteredWinners = useMemo(() => {
    if (!filter.trim()) return winners
    const q = filter.toLowerCase().trim()
    return winners.filter(
      (w) =>
        w.applicantName.toLowerCase().includes(q) ||
        (w.applicationCode && w.applicationCode.toLowerCase().includes(q)) ||
        (w.maskedCitizenId && w.maskedCitizenId.includes(q)) ||
        (w.slotCode && w.slotCode.toLowerCase().includes(q)),
    )
  }, [winners, filter])

  const myWin = winners.find((w) => w.applicationId === myAppId)

  return (
    <div className="flex flex-col gap-3 rounded-3xl border-2 border-amber-300/80 bg-white p-5 shadow-sm">
      {/* Golden Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 shadow-md text-slate-950 font-black">
            <Trophy className="h-5 w-5 fill-current" />
          </div>
          <div>
            <h2 className="text-base font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
              Bảng Vàng Trúng Quyền Mua
              <Badge variant="success" className="font-mono text-xs font-black">
                {winners.length}
              </Badge>
            </h2>
            <p className="text-[11px] text-slate-500">Kết quả bốc thăm trực tuyến chính thức</p>
          </div>
        </div>

        {/* Counters */}
        <div className="flex items-center gap-2 text-xs">
          <span className="flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-amber-900 font-bold">
            <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
            Ưu tiên: {state?.priorityWinnersCount ?? 0}
          </span>
          <span className="flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-emerald-900 font-bold">
            <Sparkles className="h-3 w-3 text-emerald-600" />
            Ngẫu nhiên: {state?.randomWinnersCount ?? 0}
          </span>
        </div>
      </div>

      {/* Personal Winner Highlight Alert */}
      {myWin && (
        <div className="relative overflow-hidden rounded-2xl border-2 border-amber-400 bg-gradient-to-r from-amber-100/80 via-emerald-50 to-amber-50 p-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">🎉</span>
              <div>
                <p className="text-xs font-black text-amber-950 uppercase tracking-wider">
                  CHÚC MỪNG! HỒ SƠ CỦA BẠN ĐÃ TRÚNG QUYỀN MUA
                </p>
                <p className="text-xs text-slate-700 mt-0.5">
                  Mã căn hộ: <strong className="text-emerald-700 font-mono font-black">{myWin.slotCode || 'Căn hộ tiêu chuẩn'}</strong> · Hạn nộp cọc: 07 ngày làm việc.
                </p>
              </div>
            </div>
            <Badge variant="success" className="font-bold shadow-xs">
              ✓ ĐÃ TRÚNG
            </Badge>
          </div>
        </div>
      )}

      {/* Search Input Filter */}
      {winners.length > 4 && (
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm tên, mã hồ sơ hoặc số CCCD..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-3 text-xs text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none shadow-xs"
          />
        </div>
      )}

      {/* Winners List Board */}
      <div className="max-h-[380px] overflow-y-auto space-y-2.5 pr-1 custom-scrollbar">
        {filteredWinners.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 py-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <Trophy className="h-6 w-6" />
            </div>
            <p className="mt-3 font-bold text-slate-700 text-sm">Chưa có hồ sơ trúng nào</p>
            <p className="text-xs text-slate-500 mt-1">
              {filter ? 'Không tìm thấy kết quả phù hợp bộ lọc' : 'Kết quả bốc thăm sẽ xuất hiện tại đây sau mỗi lượt quay'}
            </p>
          </div>
        ) : (
          filteredWinners.map((w, idx) => {
            const isMine = w.applicationId === myAppId
            const isPriority = w.result === 'PRIORITY_WON' || (w.priorityGroup && w.priorityGroup !== 'None')

            return (
              <div
                key={w.applicationId}
                className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-3.5 transition-all shadow-xs ${isMine
                    ? 'border-amber-400 bg-gradient-to-r from-amber-50/90 to-amber-100/50 ring-2 ring-amber-300'
                    : 'border-slate-200/80 bg-white hover:border-amber-300 hover:bg-amber-50/20'
                  }`}
              >
                {/* Left: Rank Medal & Name */}
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-xl font-mono text-xs font-black shadow-xs ${idx === 0
                        ? 'bg-gradient-to-br from-amber-400 to-yellow-500 text-slate-950 ring-2 ring-amber-300'
                        : idx === 1
                          ? 'bg-gradient-to-br from-slate-200 to-slate-400 text-slate-900 ring-1 ring-slate-300'
                          : idx === 2
                            ? 'bg-gradient-to-br from-amber-600 to-amber-800 text-white ring-1 ring-amber-600'
                            : 'bg-indigo-50 border border-indigo-200 text-indigo-800'
                      }`}
                  >
                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                        {w.applicationCode || w.applicationId.slice(0, 8)}
                      </span>
                      {isPriority ? (
                        <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[9px] font-black text-amber-900 border border-amber-200">
                          ⭐ ƯU TIÊN
                        </span>
                      ) : (
                        <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[9px] font-black text-emerald-900 border border-emerald-200">
                          🎲 BỐC THĂM
                        </span>
                      )}
                      {isMine && (
                        <span className="rounded-md bg-blue-600 px-1.5 py-0.5 text-[9px] font-black text-white shadow-xs">
                          BẠN
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-black text-slate-900 uppercase mt-1 tracking-wide">{w.applicantName}</p>
                    <p className="font-mono text-[11px] text-slate-500 mt-0.5">CCCD: {maskCccd(w.maskedCitizenId)}</p>
                  </div>
                </div>

                {/* Right: Slot Code & Time */}
                <div className="text-right">
                  <div className="rounded-xl border border-emerald-300 bg-gradient-to-br from-emerald-50 to-teal-50 px-3.5 py-1.5 shadow-xs">
                    <span className="text-[10px] uppercase tracking-wider text-emerald-800 block font-bold">
                      Suất Trúng
                    </span>
                    <span className="font-mono text-sm font-black text-emerald-700">
                      {w.slotCode || `CĂN HỘ #${idx + 1}`}
                    </span>
                  </div>
                  {w.drawnAt && (
                    <span className="mt-1 block text-[10px] text-slate-400 font-mono">
                      {new Date(w.drawnAt).toLocaleTimeString('vi-VN')}
                    </span>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

