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

interface Props {
  projectId: string
  /** Gọi sau khi mở thành công — refresh lại danh sách đợt */
  onUnlocked?: () => void
}

/**
 * Panel CĐT mở đợt thanh toán cho từng hồ sơ.
 * Chỉ hiện khi vai trò là Housing Developer.
 */
export function ApplicationPaymentPanel({ projectId, onUnlocked }: Props) {
  const [busy, setBusy] = useState<UnlockPhaseTrigger | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const run = async (triggerEvent: UnlockPhaseTrigger) => {
    if (busy || !projectId) return
    setBusy(triggerEvent)
    setError('')
    setSuccess('')
    try {
      await contractApi.unlockPhase(projectId, triggerEvent)
      setSuccess(SUCCESS_MESSAGES[triggerEvent])
      onUnlocked?.()
    } catch (err) {
      setError(formatError(err))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="rounded-xl border-2 border-violet-200 bg-violet-50/60 p-4 dark:border-violet-800 dark:bg-violet-950/30">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-violet-800 dark:text-violet-200">
        Mở đợt thanh toán — Chủ đầu tư
      </p>
      <p className="mb-4 text-[11px] text-slate-600 dark:text-slate-400">
        Kích hoạt đợt thanh toán tiếp theo cho hồ sơ này.
      </p>

      {error && <Alert variant="error" className="mb-3">{error}</Alert>}
      {success && <Alert variant="success" className="mb-3">{success}</Alert>}

      <div className="flex flex-wrap gap-2">
        {PHASES.map((phase) => (
          <Button
            key={phase.trigger}
            variant="outline"
            size="sm"
            disabled={!!busy}
            onClick={() => run(phase.trigger)}
            title={phase.hint}
            className="gap-1.5 text-xs"
          >
            {busy === phase.trigger ? (
              <><Loader2 className="h-3 w-3 animate-spin" /> Đang mở...</>
            ) : (
              <>{phase.icon}{phase.label}</>
            )}
          </Button>
        ))}
      </div>
    </div>
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
    label: 'Đợt 3 — Xây thô',
    hint: 'Mở đợt 3 (20%) khi công trình xây thô hoàn tất',
    icon: <Construction className="h-3 w-3" />,
  },
  {
    trigger: 'ROOFING_COMPLETED',
    label: 'Đợt 4 — Cất nóc',
    hint: 'Mở đợt 4 (20%) khi cất nóc xong',
    icon: <ScrollText className="h-3 w-3" />,
  },
  {
    trigger: 'HANDOVER',
    label: 'Đợt 5 — Bàn giao',
    hint: 'Mở đợt 5 (27%) khi bàn giao nhà',
    icon: <KeyRound className="h-3 w-3" />,
  },
  {
    trigger: 'RED_BOOK_ISSUED',
    label: 'Đợt 6 — Sổ hồng',
    hint: 'Mở đợt 6 (5%) khi sổ hồng được cấp',
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
]

const SUCCESS_MESSAGES: Record<UnlockPhaseTrigger, string> = {
  CONSTRUCTION_ROUGH_FLOOR: 'Đã mở Đợt 3 — Xây thô (20%).',
  ROOFING_COMPLETED: 'Đã mở Đợt 4 — Cất nóc (20%).',
  HANDOVER: 'Đã mở Đợt 5 — Bàn giao (27%).',
  RED_BOOK_ISSUED: 'Đã mở Đợt 6 — Sổ hồng (5%).',
}
