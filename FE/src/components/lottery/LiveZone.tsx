import React, { useState, useEffect, useRef } from 'react'
import { Badge } from '@/components/ui/badge'
import type { LiveStateDto, LotteryEligibleEntry, LiveWinnerEntry } from '@/api/lottery'
import { LotteryBallCage } from './LotteryBallCage'
import { lotteryAudio } from '@/lib/lottery-audio'
import { Award, PieChart } from 'lucide-react'

interface Props {
  state: LiveStateDto | null
  sessionStatus: string
  isDev: boolean
  eligibleList?: LotteryEligibleEntry[]
  onDrawNext?: () => void
  onRunBatch?: () => void
  busy?: boolean
}

export const LiveZone: React.FC<Props> = ({
  state,
  sessionStatus,
  isDev,
  eligibleList = [],
  onDrawNext,
  busy,
}) => {
  const [isSpinningLocal, setIsSpinningLocal] = useState(false)
  const [winnerModalOpen, setWinnerModalOpen] = useState(false)
  const [revealedWinner, setRevealedWinner] = useState<LiveWinnerEntry | null>(null)
  const lastAnnouncedIdRef = useRef<string | null>(null)

  const rawTotal = state?.totalUnits ?? 0
  const rawDrawn = state?.drawnUnitsCount ?? (state?.recentWinners?.length ?? 0)
  const total = Math.max(rawTotal, state?.recentWinners?.length ?? 0)
  const drawn = Math.min(rawDrawn, total)
  const remaining = Math.max(0, total - drawn)
  const isOutOfUnits = total > 0 && remaining <= 0
  const pct = total > 0 ? Math.round((drawn / total) * 100) : 0

  // Chuẩn hóa winner entry để tương thích kiểu dữ liệu
  const normalizeWinner = (w: import('@/api/lottery').LiveLatestResult | LiveWinnerEntry | null | undefined): LiveWinnerEntry | null => {
    if (!w) return null
    return {
      applicationId: w.applicationId,
      applicationCode: w.applicationCode ?? null,
      applicantName: w.applicantName || 'Hồ sơ trúng thăm',
      maskedCitizenId: w.maskedCitizenId ?? null,
      stt: (w.stt ?? undefined) as number | undefined,
      result: w.result ?? 'WON',
      slotCode: w.slotCode ?? null,
      drawnAt: w.drawnAt ?? null,
      remainingUnits: w.remainingUnits ?? null,
      priorityGroup: w.priorityGroup ?? null,
    }
  }

  // Theo dõi kết quả mới nhất từ Hub hoặc API để hiển thị chúc mừng
  useEffect(() => {
    const latest = normalizeWinner(state?.latestDrawResult)
    if (latest && latest.applicationId) {
      const key = `${latest.applicationId}-${latest.slotCode || ''}`
      if (key !== lastAnnouncedIdRef.current) {
        lastAnnouncedIdRef.current = key
        setRevealedWinner(latest)
        if (!isSpinningLocal) {
          setWinnerModalOpen(true)
          lotteryAudio.playWinnerFanfare()
        }
      }
    }
  }, [state?.latestDrawResult, isSpinningLocal])

  const handleDrawWithEffects = () => {
    if (busy || !onDrawNext || isOutOfUnits) return
    setIsSpinningLocal(true)
    setWinnerModalOpen(false)
    lotteryAudio.playSpin()

    onDrawNext()

    setTimeout(() => {
      lotteryAudio.playBallDrop()
    }, 700)

    setTimeout(() => {
      lotteryAudio.playWinnerFanfare()
      setIsSpinningLocal(false)
      setWinnerModalOpen(true)
    }, 1400)
  }

  const isLive = sessionStatus === 'Live'
  const isLobby = sessionStatus === 'WaitingLobby'
  const isPaused = sessionStatus === 'Paused'
  const isFinished = sessionStatus === 'Finished' || sessionStatus === 'Published'

  return (
    <div className="flex flex-col gap-4">
      {/* 1. Lồng Cầu Pha Lê 3D & Nút Quay Độc Nhất Ngay Cạnh Lồng Cầu */}
      <LotteryBallCage
        isSpinning={isSpinningLocal || !!busy}
        latestWinner={revealedWinner || normalizeWinner(state?.latestDrawResult) || (state?.recentWinners && state.recentWinners.length > 0 ? state.recentWinners[0] : null)}
        winnerModalOpen={winnerModalOpen}
        setWinnerModalOpen={setWinnerModalOpen}
        eligibleList={eligibleList}
        recentWinners={state?.recentWinners}
        onDrawNext={handleDrawWithEffects}
        busy={busy || isSpinningLocal}
        isDev={isDev}
        sessionStatus={sessionStatus}
        remaining={remaining}
        total={total}
      />

      {/* 2. Bảng Thống Kê Tiến Độ Phân Bổ Sảnh Trực Tiếp */}
      <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-sm">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-xs">
              <Award className="h-5 w-5 fill-current" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 uppercase tracking-wide">
                Tiến Độ Phân Bổ Suất Căn Hộ
              </h2>
              <p className="text-[11px] text-slate-500">
                Cập nhật thời gian thực theo từng lượt xổ từ lồng cầu
              </p>
            </div>
          </div>

          <Badge
            variant={isLive ? 'warning' : isFinished ? 'success' : 'default'}
            className="flex items-center gap-1.5 font-bold text-xs"
          >
            {isLive && (
              <>
                <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                Đang trực tiếp
              </>
            )}
            {isPaused && 'Tạm dừng'}
            {isLobby && 'Sảnh chờ mở'}
            {isFinished && 'Hoàn tất'}
            {!sessionStatus && 'Chế độ chờ'}
          </Badge>
        </div>

        {/* Progress Bar */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700 flex items-center gap-1.5">
              <PieChart className="h-4 w-4 text-indigo-600" />
              Tổng số căn đã phân bổ thành công:
            </span>
            <span className="font-mono font-black text-indigo-600 text-sm">
              {drawn}/{total || '0'} căn ({pct}%)
            </span>
          </div>
          <div className="h-3.5 w-full overflow-hidden rounded-full bg-slate-100 p-0.5 border border-slate-200/60">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 via-rose-500 to-indigo-600 transition-all duration-700 shadow-xs"
              style={{ width: `${Math.max(pct, total > 0 ? 5 : 0)}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
            <span>
              Suất còn lại: <strong className="text-amber-600 font-bold">{remaining} căn</strong>
            </span>
            <span>
              Tỷ lệ trúng hiện tại: <strong className="text-emerald-600 font-bold">{state?.winRatePercentage ?? 0}%</strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}



