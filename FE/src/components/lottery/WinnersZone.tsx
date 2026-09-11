import React, { useState, useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { isPriorityWinner, type LiveStateDto, type WaitlistEntryDto } from '@/api/lottery'
import { formatPriorityGroup } from '@/lib/constants'
import { Trophy, Search, Star, Sparkles, Clock, Users, ArrowUpRight } from 'lucide-react'
import { WAITLIST_CONFIRM_HOURS_DEFAULT } from '@/lib/lottery-allocation'

interface Props {
  state: LiveStateDto | null
  myAppId?: string | null
  waitlist?: WaitlistEntryDto[]
}

function maskCccd(cid: string | null | undefined): string {
  if (!cid) return '—'
  if (cid.length < 4) return cid
  return cid.slice(0, 3) + '****' + cid.slice(-4)
}

export const WinnersZone: React.FC<Props> = ({ state, myAppId, waitlist = [] }) => {
  const [activeTab, setActiveTab] = useState<'WINNERS' | 'WAITLIST'>('WINNERS')
  const [filter, setFilter] = useState('')
  const winners = state?.recentWinners ?? []

  const priorityCount = state?.priorityWinnersCount ?? winners.filter(isPriorityWinner).length
  const randomCount = state?.randomWinnersCount ?? winners.filter((w) => !isPriorityWinner(w)).length

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

  const filteredWaitlist = useMemo(() => {
    if (!filter.trim()) return waitlist
    const q = filter.toLowerCase().trim()
    return waitlist.filter(
      (w) =>
        w.applicantName.toLowerCase().includes(q) ||
        w.citizenId.includes(q) ||
        (w.apartmentTypeName && w.apartmentTypeName.toLowerCase().includes(q)) ||
        (w.phoneNumber && w.phoneNumber.includes(q)),
    )
  }, [waitlist, filter])

  const myWin = winners.find((w) => w.applicationId === myAppId)
  const myWaitlist = waitlist.find((w) => w.applicationId === myAppId)

  return (
    <div className="flex flex-col gap-3 rounded-3xl border-2 border-amber-300/80 bg-white p-5 shadow-sm">
      {/* Tab Switcher Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-1 rounded-2xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setActiveTab('WINNERS')}
            className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-black transition-all ${activeTab === 'WINNERS'
              ? 'bg-amber-500 text-white shadow-xs ring-1 ring-amber-400'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
          >
            <Trophy className="h-3.5 w-3.5" />
            Bảng Vàng Trúng Căn
            <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono ${activeTab === 'WINNERS' ? 'bg-amber-700/60 text-white' : 'bg-slate-200 text-slate-700'}`}>
              {winners.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('WAITLIST')}
            className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-black transition-all ${activeTab === 'WAITLIST'
              ? 'bg-indigo-600 text-white shadow-xs ring-1 ring-indigo-500'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
          >
            <Clock className="h-3.5 w-3.5" />
            Danh Sách Chờ Dự Bị
            <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono ${activeTab === 'WAITLIST' ? 'bg-indigo-800 text-white' : 'bg-slate-200 text-slate-700'}`}>
              {waitlist.length}
            </span>
          </button>
        </div>

        {/* Counters for Winners Tab */}
        {activeTab === 'WINNERS' && (
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-amber-900 font-bold">
              <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
              Ưu tiên: {priorityCount}
            </span>
            <span className="flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-emerald-900 font-bold">
              <Sparkles className="h-3 w-3 text-emerald-600" />
              Bốc thăm: {randomCount}
            </span>
          </div>
        )}

        {/* Counter for Waitlist Tab */}
        {activeTab === 'WAITLIST' && (
          <div className="flex items-center gap-1 text-[11px] text-indigo-700 font-bold bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
            <Users className="h-3 w-3" />
            Tổng ứng viên chờ: {waitlist.length}
          </div>
        )}
      </div>

      {/* Personal Winner Highlight Alert */}
      {myWin && activeTab === 'WINNERS' && (
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

      {/* Personal Waitlist Highlight Alert */}
      {myWaitlist && activeTab === 'WAITLIST' && (
        <div className="relative overflow-hidden rounded-2xl border-2 border-indigo-400 bg-gradient-to-r from-indigo-50 via-blue-50 to-indigo-100/80 p-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">📋</span>
              <div>
                <p className="text-xs font-black text-indigo-950 uppercase tracking-wider">
                  BẠN ĐANG TRONG DANH SÁCH CHỜ DỰ BỊ (HẠNG #{myWaitlist.waitlistRank})
                </p>
                <p className="text-xs text-slate-700 mt-0.5">
                  Khi người trúng hủy hợp đồng hoặc không nộp cọc, hệ thống tự động đôn suất theo thứ tự — hạn xác nhận {WAITLIST_CONFIRM_HOURS_DEFAULT} giờ.
                </p>
              </div>
            </div>
            <Badge variant="warning" className="font-bold shadow-xs">
              DỰ BỊ #{myWaitlist.waitlistRank}
            </Badge>
          </div>
        </div>
      )}

      {/* Waitlist Policy Explanation Note */}
      {activeTab === 'WAITLIST' && (
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-2.5 text-[11px] leading-relaxed text-indigo-900 flex items-start gap-2">
          <Clock className="h-4 w-4 shrink-0 text-indigo-600 mt-0.5" />
          <span>
            Theo khoản 2 Điều 38 Nghị định 100/2024/NĐ-CP: Hồ sơ không trúng bốc thăm được bảo lưu trong <strong>Danh sách chờ dự bị</strong>. Suất trả lại (hủy HĐ / không nộp cọc) được hệ thống tự động đôn người đứng đầu (#1), thời hạn xác nhận là <strong>{WAITLIST_CONFIRM_HOURS_DEFAULT} giờ</strong>.
          </span>
        </div>
      )}

      {/* Search Input Filter */}
      {((activeTab === 'WINNERS' && winners.length > 4) || (activeTab === 'WAITLIST' && waitlist.length > 4)) && (
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder={activeTab === 'WINNERS' ? 'Tìm tên, mã hồ sơ hoặc số CCCD...' : 'Tìm tên hoặc CCCD trong danh sách chờ...'}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-3 text-xs text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none shadow-xs"
          />
        </div>
      )}

      {/* WINNERS TAB CONTENT */}
      {activeTab === 'WINNERS' && (
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
              const isPriority = isPriorityWinner(w)

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
                      <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px] text-slate-500 mt-0.5">
                        <span>CCCD: {maskCccd(w.maskedCitizenId)}</span>
                        <span>•</span>
                        <span className="font-sans text-slate-600 font-semibold">
                          {formatPriorityGroup(w.priorityGroup || (isPriority ? 'MERIT_PERSON' : 'LOW_INCOME_URBAN'))}
                        </span>
                      </div>
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
      )}

      {/* WAITLIST TAB CONTENT */}
      {activeTab === 'WAITLIST' && (
        <div className="max-h-[380px] overflow-y-auto space-y-2.5 pr-1 custom-scrollbar">
          {filteredWaitlist.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 py-12 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-400">
                <Clock className="h-6 w-6" />
              </div>
              <p className="mt-3 font-bold text-slate-700 text-sm">Chưa có ứng viên trong danh sách chờ</p>
              <p className="text-xs text-slate-500 mt-1">
                {filter ? 'Không tìm thấy kết quả phù hợp bộ lọc' : 'Hồ sơ chưa trúng bốc thăm sẽ tự động chuyển vào danh sách chờ theo thứ tự'}
              </p>
            </div>
          ) : (
            filteredWaitlist.map((w, idx) => {
              const isMine = w.applicationId === myAppId
              const rank = w.waitlistRank || idx + 1
              const isPromoted = w.status === 'PROMOTED'

              return (
                <div
                  key={w.applicationId || idx}
                  className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-3.5 transition-all shadow-xs ${isMine
                    ? 'border-indigo-400 bg-gradient-to-r from-indigo-50 to-blue-50/60 ring-2 ring-indigo-300'
                    : 'border-slate-200/80 bg-white hover:border-indigo-300 hover:bg-indigo-50/20'
                    }`}
                >
                  {/* Left: Rank Badge & Info */}
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-xl font-mono text-xs font-black shadow-xs ${rank === 1
                        ? 'bg-gradient-to-br from-indigo-500 to-indigo-700 text-white ring-2 ring-indigo-300'
                        : rank === 2
                          ? 'bg-gradient-to-br from-slate-200 to-indigo-200 text-indigo-900 ring-1 ring-indigo-200'
                          : 'bg-slate-100 border border-slate-200 text-slate-700'
                        }`}
                    >
                      #{rank}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-black text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                          {w.applicationId.length <= 12 ? w.applicationId : w.applicationId.slice(0, 8).toUpperCase()}
                        </span>
                        {isMine && (
                          <span className="rounded-md bg-blue-600 px-1.5 py-0.5 text-[9px] font-black text-white shadow-xs">
                            BẠN
                          </span>
                        )}
                        {w.apartmentTypeName && (
                          <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-medium text-slate-600 border border-slate-200">
                            {w.apartmentTypeName}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-black text-slate-900 uppercase mt-1 tracking-wide">{w.applicantName}</p>
                      <p className="font-mono text-[11px] text-slate-500 mt-0.5">
                        CCCD: {maskCccd(w.citizenId)} {w.score != null ? `· Điểm: ${w.score}` : ''}
                      </p>
                    </div>
                  </div>

                  {/* Right: Status Badge & Rank Info */}
                  <div className="text-right">
                    <div className={`rounded-xl border px-3 py-1.5 shadow-xs ${isPromoted
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                      : rank === 1
                        ? 'border-indigo-300 bg-indigo-50 text-indigo-900'
                        : 'border-slate-200 bg-slate-50 text-slate-700'
                      }`}>
                      <span className="text-[10px] uppercase tracking-wider block font-bold">
                        {isPromoted ? 'Trạng Thái' : 'Thứ Hạng Chờ'}
                      </span>
                      <span className="font-mono text-xs font-black flex items-center justify-end gap-1">
                        {isPromoted ? (
                          <>
                            <ArrowUpRight className="h-3 w-3 text-emerald-600" />
                            ĐÃ ĐÔN SUẤT
                          </>
                        ) : (
                          `DỰ BỊ #${rank}`
                        )}
                      </span>
                    </div>
                    {w.depositDeadline && (
                      <span className="mt-1 block text-[10px] text-amber-600 font-medium">
                        Hạn: {new Date(w.depositDeadline).toLocaleDateString('vi-VN')}
                      </span>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}


