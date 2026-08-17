import type { LotteryScheduleDto } from '@/api/lottery'

/**
 * FSM phiên bốc thăm trên UI — quyết định nút nào hiện cho CĐT / SXD.
 * Ưu tiên sessionStatus từ BE; fallback theo isLotteryApproved + status map.
 */
export type LotteryPhase =
  | 'not_scheduled'
  | 'awaiting_approval'
  | 'ready_open_lobby'
  | 'waiting_lobby'
  | 'live'
  | 'paused'
  | 'finished'
  | 'published'

export function getLotteryPhase(schedule: LotteryScheduleDto | null | undefined): LotteryPhase {
  if (!schedule) return 'not_scheduled'

  const session = String(schedule.sessionStatus ?? '').trim()
  if (session === 'Published') return 'published'
  if (session === 'Finished') return 'finished'
  if (session === 'Paused') return 'paused'
  if (session === 'Live') return 'live'
  if (session === 'WaitingLobby') return 'waiting_lobby'
  if (session === 'Scheduled' && schedule.isLotteryApproved) return 'ready_open_lobby'
  if (session === 'Scheduled' && schedule.isLotteryApproved === false) return 'awaiting_approval'

  if (schedule.isLotteryApproved) return 'ready_open_lobby'

  const ui = String(schedule.status ?? '')
  if (ui === 'SCHEDULED' || ui === 'AWAITING_APPROVAL') return 'awaiting_approval'
  if (ui === 'NOT_SCHEDULED') return 'not_scheduled'
  if (ui === 'RUNNING') return 'live'
  if (ui === 'FINISHED') return 'finished'
  if (ui === 'APPROVED') return 'ready_open_lobby'
  if (ui === 'Paused') return 'paused'

  if (schedule.lotteryDate || schedule.scheduledAt) return 'awaiting_approval'
  return 'not_scheduled'
}

export const LOTTERY_PHASE_STEPS: { id: LotteryPhase; label: string }[] = [
  { id: 'not_scheduled', label: '1. Lên lịch' },
  { id: 'awaiting_approval', label: '2. Sở duyệt' },
  { id: 'ready_open_lobby', label: '3. Mở sảnh' },
  { id: 'waiting_lobby', label: '4. Sảnh chờ' },
  { id: 'live', label: '5. Live' },
  { id: 'paused', label: '5b. Tạm dừng' },
  { id: 'finished', label: '6. Kết thúc' },
  { id: 'published', label: '7. Công bố' },
]

export function phaseStepIndex(phase: LotteryPhase): number {
  const i = LOTTERY_PHASE_STEPS.findIndex((s) => s.id === phase)
  return i < 0 ? 0 : i
}

export function phaseChipLabel(phase: LotteryPhase): string {
  switch (phase) {
    case 'not_scheduled':
      return 'Chưa lên lịch'
    case 'awaiting_approval':
      return 'Chờ Sở phê duyệt'
    case 'ready_open_lobby':
      return 'Đã duyệt — chờ mở sảnh'
    case 'waiting_lobby':
      return 'Sảnh chờ'
    case 'live':
      return 'Đang Live'
    case 'paused':
      return 'Tạm dừng'
    case 'finished':
      return 'Đã kết thúc — chờ công bố'
    case 'published':
      return 'Đã công bố'
  }
}
