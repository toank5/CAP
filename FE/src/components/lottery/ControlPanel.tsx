import React, { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import type { LotteryScheduleDto, LiveStateDto } from '@/api/lottery'
import type { LotteryPhase } from '@/lib/lottery-phase'
import { lotteryApi } from '@/api/lottery'
import {
  ShieldCheck,
  Play,
  Pause,
  Square,
  Sparkles,
  Zap,
  Send,
  FileText,
  Copy,
  Check,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react'
import { navigate } from '@/hooks/useHashRoute'

interface Props {
  phase: LotteryPhase
  session: LotteryScheduleDto | null
  liveState: LiveStateDto | null
  isDev: boolean
  isSxd: boolean
  isApplicant: boolean
  busy: string
  onAction: (label: string, fn: () => Promise<unknown>) => void
  onRunBatch?: () => void
  projectId: string
}

export const ControlPanel: React.FC<Props> = ({
  phase,
  session,
  liveState,
  isDev,
  isSxd,
  isApplicant,
  busy,
  onAction,
  onRunBatch,
  projectId,
}) => {
  const [copied, setCopied] = useState(false)

  if (!projectId) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-6 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100">
          <Sparkles className="h-6 w-6" />
        </div>
        <h3 className="mt-3 text-sm font-black uppercase tracking-wider text-slate-900">
          Bàn Điều Khiển Sẵn Sàng
        </h3>
        <p className="mx-auto mt-1 max-w-md text-xs text-slate-500">
          Chưa chọn phiên bốc thăm nào. Vui lòng chọn một dự án từ menu phía trên hoặc vào Trung tâm Quản lý Bốc thăm để mở sảnh điều hành.
        </p>
        <button
          onClick={() => navigate('lottery-sessions')}
          className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition-all cursor-pointer shadow-xs"
        >
          Đến Trung tâm Quản lý Bốc thăm
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    )
  }

  const copyCode = (code: string) => {
    void navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const sxdCount = liveState?.sxdOnlineCount ?? session?.sxdOnlineCount ?? 0

  // 1. Giao diện Người dân
  if (isApplicant) {
    return (
      <div className="rounded-3xl border border-blue-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
            <span>📺</span> Khán Phòng Theo Dõi Trực Tuyến
          </h3>
          <Badge variant="default" className="text-[10px]">
            Chế độ Người dân
          </Badge>
        </div>
        <p className="mt-3 text-xs text-slate-600 leading-relaxed">
          Bạn đang xem trực tiếp tiến trình bốc thăm quyền mua. Kết quả từng hồ sơ sẽ tự động nhảy lên màn hình theo thời gian thực.
        </p>
        {session?.joinCode && (
          <div className="mt-3 flex items-center justify-between rounded-2xl border border-blue-100 bg-blue-50/60 p-3.5">
            <div>
              <span className="text-[10px] uppercase text-blue-800 font-bold block">Mã vào sảnh</span>
              <span className="font-mono text-xl font-black text-indigo-900">{session.joinCode}</span>
            </div>
            <button
              onClick={() => copyCode(session.joinCode || '')}
              className="flex items-center gap-1 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 transition-all shadow-xs"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Đã chép' : 'Sao chép'}
            </button>
          </div>
        )}
      </div>
    )
  }

  // 2. Giao diện Sở Xây Dựng / Giám sát
  if (isSxd) {
    const canPublish = phase === 'finished'

    return (
      <div className="rounded-3xl border border-emerald-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">
              Giám Sát Sở Xây Dựng
            </h3>
          </div>
          <Badge variant={sxdCount > 0 ? 'success' : 'warning'} className="font-bold text-xs">
            {sxdCount > 0 ? `✓ Đang giám sát (${sxdCount})` : 'Chưa vào'}
          </Badge>
        </div>

        <p className="mt-3 text-xs text-slate-600 leading-relaxed">
          {sxdCount > 0
            ? 'Bạn đang giám sát phiên bốc thăm này. Chủ đầu tư chỉ được bấm Bốc tiếp khi có ít nhất một cán bộ Sở đang kết nối.'
            : 'Vui lòng giữ trang này mở để tính hiện diện giám sát của Sở Xây dựng theo Điều 36 Nghị định số 100 năm 2024 của Chính phủ.'}
        </p>

        {/* Action Publish Session */}
        {canPublish && (
          <div className="mt-4 rounded-2xl border-2 border-emerald-200 bg-emerald-50/70 p-4">
            <p className="text-xs font-black text-emerald-900 uppercase tracking-wide">
              ✓ Phiên bốc thăm đã kết thúc hoàn tất
            </p>
            <p className="mt-1 text-xs text-slate-700">
              Sở Xây dựng có thẩm quyền phê duyệt và công bố chính thức kết quả lên cổng thông tin công cộng.
            </p>
            <div className="mt-3 flex flex-wrap gap-2.5">
              <button
                disabled={!!busy}
                onClick={() => onAction('Công bố kết quả', () => lotteryApi.publishSession(projectId))}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 px-4 py-2.5 text-xs font-black text-white shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
              >
                <Send className="h-4 w-4" />
                📢 CÔNG BỐ KẾT QUẢ CHÍNH THỨC
              </button>
              <button
                onClick={() => void lotteryApi.downloadMinutesBlob(projectId)}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer shadow-xs"
              >
                <FileText className="h-3.5 w-3.5 text-emerald-600" />
                Tải biên bản
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // 3. Giao diện Chủ Đầu Tư (Housing Developer)
  if (isDev) {
    return (
      <div className="rounded-3xl border border-amber-200/80 bg-white p-5 shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">🎮</span>
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">
              Bàn Điều Khiển Chủ Đầu Tư
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500">Sở đang giám sát:</span>
            <Badge variant={sxdCount > 0 ? 'success' : 'warning'} className="font-bold text-xs">
              {sxdCount > 0 ? `✓ ${sxdCount}` : '0 (cần giám sát)'}
            </Badge>
          </div>
        </div>

        {/* OTP Code for Lobby */}
        {session?.joinCode && (
          <div className="mt-3 flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50/70 p-3.5">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 block">
                Mã vào sảnh chờ (cung cấp cho người dân)
              </span>
              <span className="font-mono text-xl font-black text-amber-700 tracking-widest">
                {session.joinCode}
              </span>
            </div>
            <button
              onClick={() => copyCode(session.joinCode || '')}
              className="flex items-center gap-1 rounded-xl bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700 shadow-xs"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Đã sao chép' : 'Sao chép mã'}
            </button>
          </div>
        )}

        {/* Supervision warning if SXD offline */}
        {sxdCount === 0 && (phase === 'waiting_lobby' || phase === 'live') && (
          <div className="mt-3 flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
            <span>
              Chưa có cán bộ Sở Xây dựng online. Vui lòng thông báo Sở tham gia giám sát trước khi bấm quay số.
            </span>
          </div>
        )}

        {/* FSM Actions */}
        <div className="mt-4 flex flex-wrap gap-2.5">
          {phase === 'ready_open_lobby' && (
            <button
              disabled={!!busy}
              onClick={() => onAction('Mở sảnh chờ', () => lotteryApi.openLobby(projectId))}
              className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-3 text-xs font-black text-white shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            >
              <Play className="h-4 w-4" />
              ▶ MỞ SẢNH CHỜ TRỰC TUYẾN
            </button>
          )}

          {phase === 'waiting_lobby' && (
            <button
              disabled={!!busy || sxdCount === 0}
              onClick={() => onAction('Bắt đầu quay số', () => lotteryApi.startLive(projectId))}
              className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-green-600 px-5 py-3 text-xs font-black text-white shadow-md hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              <Sparkles className="h-4 w-4" />
              🔴 BẮT ĐẦU QUAY SỐ TRỰC TIẾP
            </button>
          )}

          {phase === 'live' && (
            <>
              {onRunBatch && (
                <button
                  disabled={!!busy || sxdCount === 0}
                  onClick={onRunBatch}
                  className="flex items-center gap-1.5 rounded-2xl border-2 border-indigo-200 bg-white px-4 py-2.5 text-xs font-bold text-indigo-700 hover:bg-indigo-50 transition-all cursor-pointer shadow-xs"
                >
                  <Zap className="h-3.5 w-3.5 text-amber-500" />
                  Chạy tự động
                </button>
              )}
              <button
                disabled={!!busy}
                onClick={() => onAction('Tạm dừng', () => lotteryApi.pauseSession(projectId))}
                className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer shadow-xs"
              >
                <Pause className="h-3.5 w-3.5 text-amber-600" />
                Tạm dừng phiên
              </button>
              <button
                disabled={!!busy || sxdCount === 0}
                onClick={() => onAction('Kết thúc phiên', () => lotteryApi.finishSession(projectId))}
                className="flex items-center gap-1.5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-all cursor-pointer shadow-xs"
              >
                <Square className="h-3.5 w-3.5 text-rose-600" />
                ⏹ Kết thúc phiên
              </button>
            </>
          )}

          {phase === 'paused' && (
            <>
              <button
                disabled={!!busy || sxdCount === 0}
                onClick={() => onAction('Tiếp tục quay số', () => lotteryApi.resumeSession(projectId))}
                className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-green-600 px-5 py-2.5 text-xs font-black text-white shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
              >
                <Play className="h-4 w-4" />
                ▶ TIẾP TỤC TRỰC TIẾP
              </button>
              <button
                disabled={!!busy}
                onClick={() => onAction('Kết thúc phiên', () => lotteryApi.finishSession(projectId))}
                className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer shadow-xs"
              >
                <Square className="h-3.5 w-3.5 text-rose-600" />
                Kết thúc phiên
              </button>
            </>
          )}

          {phase === 'finished' && (
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-700">
              ✓ Phiên đã hoàn tất. Đang chờ Sở Xây dựng công bố chính thức.
            </div>
          )}

          {phase === 'published' && (
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-700">
              ✅ Kết quả phiên bốc thăm đã được Sở Xây dựng công bố chính thức.
            </div>
          )}
        </div>
      </div>
    )
  }

  return null
}
