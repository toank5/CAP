import React, { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import type { LiveStateDto, LotteryEligibleEntry } from '@/api/lottery'
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

  const rawTotal = state?.totalUnits ?? 0
  const rawDrawn = state?.drawnUnitsCount ?? 0
  const total = Math.max(0, rawTotal)
  const drawn = Math.min(rawDrawn, total)
  const remaining = Math.max(0, total - drawn)
  const pct = total > 0 ? Math.min(100, Math.round((drawn / total) * 100)) : 0

  const handleDrawWithEffects = () => {
    if (busy || !onDrawNext || remaining === 0) return
    setIsSpinningLocal(true)
    lotteryAudio.playSpin()

    setTimeout(() => {
      lotteryAudio.playBallDrop()
    }, 450)

    setTimeout(() => {
      lotteryAudio.playWinnerFanfare()
      setIsSpinningLocal(false)
    }, 900)

    onDrawNext()
  }

  const isLive = sessionStatus === 'Live'
  const isLobby = sessionStatus === 'WaitingLobby'
  const isPaused = sessionStatus === 'Paused'
  const isFinished = sessionStatus === 'Finished' || sessionStatus === 'Published'

  return (
    <div className="flex flex-col gap-4">
      {/* 1. Lồng Cầu Pha Lê 3D & Nút Quay Độc Nhất Ngay Cạnh Lồng Cầu */}
      <LotteryBallCage
        isSpinning={isSpinningLocal || !!busy || (isLive && !state?.latestDrawResult && isSpinningLocal)}
        latestCode={
          state?.latestDrawResult?.applicationCode ||
          (state?.latestDrawResult ? state.latestDrawResult.applicationId.slice(0, 8) : null)
        }
        latestName={state?.latestDrawResult?.applicantName}
        priorityGroup={state?.latestDrawResult?.priorityGroup}
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
            className="font-bold text-xs"
          >
            {isLive && '🔴 Đang trực tiếp'}
            {isPaused && '⏸ Tạm dừng'}
            {isLobby && '⏳ Sảnh chờ mở'}
            {isFinished && '✓ Hoàn tất'}
            {!sessionStatus && '⚪ Chế độ chờ'}
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



