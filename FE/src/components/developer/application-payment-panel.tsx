import { useState } from 'react'
import {
  CheckCircle2,
  Construction,
  KeyRound,
  Loader2,
  ScrollText,
  Unlock,
} from 'lucide-react'
import { contractApi, isManualUnlockTrigger, UNLOCK_PHASE_LABEL, type UnlockPhaseTrigger } from '@/api/contracts'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { formatError } from '@/lib/format-error'
import type { MilestoneSetupItemDto } from '@/types'

interface Props {
  projectId: string
  milestones?: MilestoneSetupItemDto[]
  /** Gọi sau khi mở thành công — refresh lại danh sách đợt */
  onUnlocked?: () => void
}

/**
 * Panel chủ đầu tư mở đợt thanh toán theo lịch đã nhập trên dự án.
 */
export function ApplicationPaymentPanel({ projectId, milestones = [], onUnlocked }: Props) {
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const phases = milestones
    .filter((m) => isManualUnlockTrigger(m.triggerEvent))
    .slice()
    .sort((a, b) => a.phaseOrder - b.phaseOrder)

  const run = async (triggerEvent: string, phaseName: string) => {
    if (busy || !projectId) return
    setBusy(triggerEvent)
    setError('')
    setSuccess('')
    try {
      await contractApi.unlockPhase(projectId, triggerEvent)
      setSuccess(`Đã mở ${phaseName || 'đợt thanh toán'}.`)
      onUnlocked?.()
    } catch (err) {
      setError(formatError(err))
    } finally {
      setBusy(null)
    }
  }

  if (phases.length === 0) return null

  return (
    <div className="rounded-xl border-2 border-violet-200 bg-violet-50/60 p-4 dark:border-violet-800 dark:bg-violet-950/30">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-violet-800 dark:text-violet-200">
        Mở đợt thanh toán — Chủ đầu tư
      </p>
      <p className="mb-4 text-[11px] text-slate-600 dark:text-slate-400">
        Kích hoạt đợt thanh toán tiếp theo theo tên và mốc chủ đầu tư đã nhập.
      </p>

      {error && <Alert variant="error" className="mb-3">{error}</Alert>}
      {success && <Alert variant="success" className="mb-3">{success}</Alert>}

      <div className="flex flex-wrap gap-2">
        {phases.map((phase) => {
          const trigger = phase.triggerEvent
          const hint = UNLOCK_PHASE_LABEL[trigger as UnlockPhaseTrigger] || trigger
          return (
            <Button
              key={`${phase.phaseOrder}-${trigger}`}
              variant="outline"
              size="sm"
              disabled={!!busy}
              onClick={() => run(trigger, phase.phaseName)}
              title={hint}
              className="gap-1.5 text-xs"
            >
              {busy === trigger ? (
                <><Loader2 className="h-3 w-3 animate-spin" /> Đang mở...</>
              ) : (
                <>{iconForTrigger(trigger)}Mở {phase.phaseName || `đợt ${phase.phaseOrder}`}</>
              )}
            </Button>
          )
        })}
      </div>
    </div>
  )
}

function iconForTrigger(trigger: string) {
  switch (trigger) {
    case 'CONSTRUCTION_ROUGH_FLOOR':
      return <Construction className="h-3 w-3" />
    case 'ROOFING_COMPLETED':
      return <ScrollText className="h-3 w-3" />
    case 'HANDOVER':
      return <KeyRound className="h-3 w-3" />
    case 'RED_BOOK_ISSUED':
      return <CheckCircle2 className="h-3 w-3" />
    default:
      return <Unlock className="h-3 w-3" />
  }
}
