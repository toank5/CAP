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
import type { HousingProjectDto } from '@/types'

interface Props {
  project: HousingProjectDto
  onChanged?: (next: HousingProjectDto) => void
}

/**
 * Panel chủ đầu tư mở đợt thanh toán theo mốc đã cấu hình trên từng đợt.
 */
export function PaymentPhaseControl({ project, onChanged }: Props) {
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const projectId = project.id ?? ''
  const phases = (project.milestones ?? [])
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
      onChanged?.(project)
      window.dispatchEvent(new CustomEvent('fecaps:project-status-changed'))
    } catch (err) {
      setError(formatError(err))
    } finally {
      setBusy(null)
    }
  }

  if (phases.length === 0) return null

  return (
    <section className="mb-6 rounded-xl border-2 border-violet-200 bg-violet-50/60 p-4 dark:border-violet-800 dark:bg-violet-950/30">
      <header className="mb-3 flex items-center gap-2">
        <KeyRound className="h-4 w-4 text-violet-700 dark:text-violet-300" />
        <p className="text-xs font-semibold uppercase tracking-wide text-violet-800 dark:text-violet-200">
          Mở đợt thanh toán — Chủ đầu tư
        </p>
      </header>

      <p className="mb-4 text-[11px] text-slate-600 dark:text-slate-400">
        Mỗi đợt mở theo mốc chủ đầu tư đã nhập khi tạo lịch. Nhấn nút để mở đợt cho người mua nhà.
      </p>

      {error && (
        <div className="mb-3">
          <Alert variant="error">{error}</Alert>
        </div>
      )}
      {success && (
        <div className="mb-3">
          <Alert variant="success">{success}</Alert>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {phases.map((phase) => {
          const trigger = phase.triggerEvent
          const icon = iconForTrigger(trigger)
          const hint = UNLOCK_PHASE_LABEL[trigger as UnlockPhaseTrigger] || trigger
          return (
            <Button
              key={`${phase.phaseOrder}-${trigger}`}
              variant="outline"
              disabled={!!busy}
              onClick={() => run(trigger, phase.phaseName)}
              title={hint}
              className="gap-1.5 text-xs"
            >
              {busy === trigger ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Đang mở...
                </>
              ) : (
                <>
                  {icon}
                  Mở {phase.phaseName || `đợt ${phase.phaseOrder}`}
                </>
              )}
            </Button>
          )
        })}
      </div>
    </section>
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
