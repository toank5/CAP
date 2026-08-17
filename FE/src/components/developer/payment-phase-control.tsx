import { useState } from 'react'
import {
  CheckCircle2,
  Construction,
  KeyRound,
  Loader2,
  ScrollText,
} from 'lucide-react'
import { contractApi, type UnlockPhaseTrigger } from '@/api/contracts'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { formatError } from '@/lib/format-error'
import type { HousingProjectDto } from '@/types'

interface Props {
  project: HousingProjectDto
  onChanged?: (next: HousingProjectDto) => void
}

/**
 * Panel CĐT mở đợt thanh toán theo tiến độ xây dựng.
 *
 *   Đợt 1 (10%) — luôn mở sau khi ký HĐMB
 *   Đợt 2 (10%) — luôn mở sau khi ký HĐMB
 *   Đợt 3 (20%) — Xây thô         → CONSTRUCTION_ROUGH_FLOOR
 *   Đợt 4 (20%) — Cất nóc          → ROOFING_COMPLETED
 *   Đợt 5 (27%) — Bàn giao         → HANDOVER
 *   Đợt 6 ( 5%) — Sổ hồng          → RED_BOOK_ISSUED
 *
 * Ứng dụng: Chỉ vai trò Housing Developer.
 */
export function PaymentPhaseControl({ project, onChanged }: Props) {
  const [busy, setBusy] = useState<UnlockPhaseTrigger | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const projectId = project.id ?? ''

  const run = async (triggerEvent: UnlockPhaseTrigger) => {
    if (busy || !projectId) return
    setBusy(triggerEvent)
    setError('')
    setSuccess('')
    try {
      await contractApi.unlockPhase(projectId, triggerEvent)
      setSuccess(SUCCESS_MESSAGES[triggerEvent])
      onChanged?.(project)
      window.dispatchEvent(new CustomEvent('fecaps:project-status-changed'))
    } catch (err) {
      setError(formatError(err))
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="mb-6 rounded-xl border-2 border-violet-200 bg-violet-50/60 p-4 dark:border-violet-800 dark:bg-violet-950/30">
      <header className="mb-3 flex items-center gap-2">
        <KeyRound className="h-4 w-4 text-violet-700 dark:text-violet-300" />
        <p className="text-xs font-semibold uppercase tracking-wide text-violet-800 dark:text-violet-200">
          Mở đợt thanh toán — Chủ đầu tư
        </p>
      </header>

      <p className="mb-4 text-[11px] text-slate-600 dark:text-slate-400">
        Mỗi đợt thanh toán được kích hoạt khi dự án đạt mốc xây dựng tương ứng. Nhấn nút để mở
        đợt cho người mua nhà.
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
        {PHASES.map((phase) => (
          <Button
            key={phase.trigger}
            variant="outline"
            disabled={!!busy}
            onClick={() => run(phase.trigger)}
            title={phase.hint}
            className="gap-1.5 text-xs"
          >
            {busy === phase.trigger ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                Đang mở...
              </>
            ) : (
              <>
                {phase.icon}
                {phase.label}
              </>
            )}
          </Button>
        ))}
      </div>
    </section>
  )
}

const PHASES: {
  trigger: UnlockPhaseTrigger
  label: string
  hint: string
  icon: React.ReactNode
}[] = [
  {
    trigger: 'CONSTRUCTION_ROUGH_FLOOR',
    label: 'Mở Đợt 3 — Xây thô',
    hint: 'Mở đợt 3 (20%) khi công trình hoàn thành phần xây thô',
    icon: <Construction className="h-3 w-3" />,
  },
  {
    trigger: 'ROOFING_COMPLETED',
    label: 'Mở Đợt 4 — Cất nóc',
    hint: 'Mở đợt 4 (20%) khi công trình hoàn thành cất nóc',
    icon: <ScrollText className="h-3 w-3" />,
  },
  {
    trigger: 'HANDOVER',
    label: 'Mở Đợt 5 — Bàn giao',
    hint: 'Mở đợt 5 (27%) khi bàn giao nhà cho người mua',
    icon: <KeyRound className="h-3 w-3" />,
  },
  {
    trigger: 'RED_BOOK_ISSUED',
    label: 'Mở Đợt 6 — Sổ hồng',
    hint: 'Mở đợt 6 (5%) khi sổ hồng được cấp cho người mua',
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
]

const SUCCESS_MESSAGES: Record<UnlockPhaseTrigger, string> = {
  CONSTRUCTION_ROUGH_FLOOR: 'Đã mở Đợt 3 — Xây thô (20%).',
  ROOFING_COMPLETED: 'Đã mở Đợt 4 — Cất nóc (20%).',
  HANDOVER: 'Đã mở Đợt 5 — Bàn giao (27%).',
  RED_BOOK_ISSUED: 'Đã mở Đợt 6 — Sổ hồng (5%).',
}
