import { Badge } from '@/components/ui/badge'
import type { LotteryScheduleDto, LiveStateDto } from '@/api/lottery'
import type { LotteryPhase } from '@/lib/lottery-phase'

interface Props {
  phase: LotteryPhase
  session: LotteryScheduleDto | null
  liveState: LiveStateDto | null
  isDev: boolean
  isSxd: boolean
  isApplicant: boolean
  busy: string
  onAction: (label: string, fn: () => Promise<unknown>) => void
  projectId: string
}

interface Action {
  label: string
  fn: () => Promise<unknown>
  variant?: 'accent' | 'outline' | 'default'
  disabled?: boolean
}

export function ControlPanel({ phase, session, liveState, isDev, isSxd, isApplicant, busy, onAction, projectId }: Props) {
  if (isApplicant) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-700 dark:bg-slate-800/40">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          👤 Bạn là <strong>người dân</strong> — chỉ theo dõi kết quả. CĐT sẽ bốc thăm và công bố kết quả.
        </p>
        {session?.joinCode && (
          <p className="mt-2 text-sm">
            Mã OTP vào sảnh:{' '}
            <strong className="font-mono text-lg text-blue-600 dark:text-blue-300">{session.joinCode}</strong>
          </p>
        )}
      </section>
    )
  }

  if (isSxd) {
    const sxdCount = liveState?.sxdOnlineCount ?? session?.sxdOnlineCount ?? 0
    const canPublish = phase === 'finished'
    return (
      <section className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-800 dark:bg-emerald-950/30">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-emerald-800 dark:text-emerald-200">🛡 Giám sát Sở Xây dựng</h3>
          <Badge variant={sxdCount > 0 ? 'success' : 'warning'}>
            {sxdCount > 0 ? `✓ Online (${sxdCount})` : 'Offline'}
          </Badge>
        </div>
        <p className="text-sm text-emerald-700 dark:text-emerald-300">
          {sxdCount > 0
            ? 'Bạn đang giám sát. Giữ trang này mở — CĐT cần SXD online để chạy Live.'
            : 'Vào trang này để được tính là SXD online. Giữ trang mở.'}
        </p>
        {canPublish && (
          <div className="space-y-2 border-t border-emerald-200 pt-3 dark:border-emerald-800">
            <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
              ✓ Phiên đã kết thúc — bạn có quyền Công bố kết quả
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                className="rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 px-5 py-2.5 font-bold text-white shadow transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
                disabled={!!busy}
                onClick={() => onAction('Công bố kết quả', () => import('@/api/lottery').then(m => m.lotteryApi.publishSession(projectId)))}
              >
                📢 Công bố kết quả
              </button>
            </div>
          </div>
        )}
      </section>
    )
  }

  if (isDev) {
    const sxdCount = liveState?.sxdOnlineCount ?? session?.sxdOnlineCount ?? 0

    const actions: { phase: LotteryPhase; content: Action | Action[] | null }[] = [
      {
        phase: 'not_scheduled',
        content: {
          label: '📅 Đề xuất lịch bốc thăm',
          fn: () => import('@/api/lottery').then(m => m.lotteryApi.schedule(projectId, { lotteryDate: new Date().toISOString(), lotteryLocation: 'Hội trường / Zoom', totalUnits: 5 })),
          variant: 'accent',
        },
      },
      {
        phase: 'awaiting_approval',
        content: {
          label: '⏳ Đang chờ Sở phê duyệt...',
          fn: async () => {},
          variant: 'outline',
          disabled: true,
        },
      },
      {
        phase: 'ready_open_lobby',
        content: {
          label: '▶ Mở sảnh chờ',
          fn: () => import('@/api/lottery').then(m => m.lotteryApi.openLobby(projectId)),
          variant: 'accent',
        },
      },
      {
        phase: 'waiting_lobby',
        content: sxdCount < 1
          ? {
              label: `⏳ Chờ SXD online (hiện: ${sxdCount})`,
              fn: async () => {},
              variant: 'outline',
              disabled: true,
            }
          : {
              label: '▶ Bắt đầu Live',
              fn: () => import('@/api/lottery').then(m => m.lotteryApi.startLive(projectId)),
              variant: 'accent',
            },
      },
      {
        phase: 'live',
        content: [
          {
            label: '🎱 Bốc tiếp',
            fn: () => import('@/api/lottery').then(m => m.lotteryApi.drawNext(projectId)),
            variant: 'accent',
            disabled: sxdCount < 1,
          },
          {
            label: '⏸ Tạm dừng',
            fn: () => import('@/api/lottery').then(m => m.lotteryApi.pauseSession(projectId)),
            variant: 'outline',
          },
          {
            label: '⏹ Kết thúc',
            fn: () => import('@/api/lottery').then(m => m.lotteryApi.finishSession(projectId)),
            variant: 'outline',
            disabled: sxdCount < 1,
          },
        ],
      },
      {
        phase: 'paused',
        content: [
          {
            label: '▶ Tiếp tục Live',
            fn: () => import('@/api/lottery').then(m => m.lotteryApi.resumeSession(projectId)),
            variant: 'accent',
            disabled: sxdCount < 1,
          },
          {
            label: '⏹ Kết thúc',
            fn: () => import('@/api/lottery').then(m => m.lotteryApi.finishSession(projectId)),
            variant: 'outline',
            disabled: sxdCount < 1,
          },
        ],
      },
      {
        phase: 'finished',
        content: {
          label: '✓ Đã kết thúc — chờ Sở công bố',
          fn: async () => {},
          variant: 'outline',
          disabled: true,
        },
      },
      {
        phase: 'published',
        content: {
          label: '✅ Đã công bố',
          fn: async () => {},
          variant: 'outline',
          disabled: true,
        },
      },
    ]

    const matched = actions.find(a => a.phase === phase)

    return (
      <section className="space-y-3 rounded-2xl border border-indigo-200 bg-indigo-50/60 p-4 dark:border-indigo-800 dark:bg-indigo-950/30">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-indigo-800 dark:text-indigo-200">🏗 Điều khiển Chủ đầu tư</h3>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500">SXD online:</span>
            <Badge variant={sxdCount > 0 ? 'success' : 'warning'}>{sxdCount}</Badge>
          </div>
        </div>
        {matched?.content && (
          <div className="flex flex-wrap gap-2">
            {(Array.isArray(matched.content) ? matched.content : [matched.content]).map((action, i) => (
              <button
                key={i}
                className={`rounded-xl px-4 py-2.5 text-sm font-bold shadow transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed ${
                  action.variant === 'accent'
                    ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white'
                    : 'border border-indigo-300 bg-white text-indigo-700 dark:border-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200'
                }`}
                disabled={!!busy || action.disabled}
                onClick={() => !action.disabled && !busy && onAction(action.label, action.fn)}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </section>
    )
  }

  return null
}
