import { useEffect, useState } from 'react'
import { Loader2, Unlock } from 'lucide-react'
import {
  paymentApi,
  parsePhaseProgress,
  type PhaseProgressItem,
} from '@/api/payment'
import { housingProjectsApi } from '@/api/housing-projects'
import { UNLOCK_PHASE_LABEL, isManualUnlockTrigger, type UnlockPhaseTrigger } from '@/api/contracts'
import { extractSingleProject } from '@/lib/parsers'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { formatError } from '@/lib/format-error'
import type { MilestoneSetupItemDto } from '@/types'

interface Props {
  projectId: string
}

export function ProjectCollectionSchedulePanel({ projectId }: Props) {
  const [phases, setPhases] = useState<PhaseProgressItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const nextPhase = phases.find((p) => p.isNextToOpen) ?? null

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const progress = await paymentApi.getPaymentProgress(projectId).catch(() => null)
      let list = parsePhaseProgress(progress)
      if (list.length === 0) {
        list = await loadPhasesFromProject(projectId)
      }
      setPhases(list)
    } catch (err) {
      setError(formatError(err))
      setPhases([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (projectId) void load()
  }, [projectId])

  const handleConfirmOpen = async () => {
    if (!nextPhase || busy) return
    setBusy(true)
    setMsg(null)
    try {
      await paymentApi.unlockPhase(projectId, nextPhase.triggerEvent, nextPhase.phaseOrder)
      const n = nextPhase.eligibleToUnlockCount
      setMsg({
        type: 'success',
        text:
          n > 0
            ? `Đã mở ${phaseTitle(nextPhase)} cho ${n} hộ đã nộp đợt trước. Hộ chưa nộp đợt trước vẫn nộp đợt đó, chưa nộp được đợt này.`
            : `Đã mở ${phaseTitle(nextPhase)}.`,
      })
      setConfirmOpen(false)
      await load()
    } catch (err) {
      setMsg({ type: 'error', text: formatError(err) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="rounded-2xl border border-teal-200 bg-white p-5 shadow-xs dark:border-teal-900/40 dark:bg-slate-900">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Tiến độ thu tiền</h3>
          <p className="mt-1 max-w-2xl text-xs text-slate-600 dark:text-slate-300">
            Một lần mở là cả dự án. Chỉ mở bước kế tiếp. Người chưa đóng đợt trước vẫn nộp đợt đó, không bị khóa.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading || busy}
          className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
        >
          {loading ? 'Đang tải…' : 'Làm mới'}
        </button>
      </div>

      {msg && (
        <Alert variant={msg.type === 'error' ? 'error' : 'success'} className="mb-3">
          {msg.text}
        </Alert>
      )}
      {error && (
        <Alert variant="error" className="mb-3">
          {error}
        </Alert>
      )}

      {loading && phases.length === 0 ? (
        <p className="flex items-center gap-2 text-xs text-slate-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Đang tải lịch đợt…
        </p>
      ) : phases.length === 0 ? (
        <p className="text-xs text-slate-500">Dự án chưa có lịch thanh toán.</p>
      ) : (
        <ol className="space-y-2">
          {phases.map((phase) => {
            const state = phaseState(phase)
            return (
              <li
                key={phase.phaseOrder}
                className={
                  'flex items-start justify-between gap-3 rounded-xl border px-3 py-2.5 ' +
                  (phase.isNextToOpen
                    ? 'border-teal-300 bg-teal-50/70 dark:border-teal-800 dark:bg-teal-950/30'
                    : 'border-slate-200 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-800/40')
                }
              >
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 dark:text-white">
                    Đợt {phase.phaseOrder}
                    {phase.phaseName ? ` — ${phase.phaseName}` : ''}
                    {phase.percentage ? ` (${phase.percentage}%)` : ''}
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    {phase.triggerEventLabel ||
                      UNLOCK_PHASE_LABEL[phase.triggerEvent as UnlockPhaseTrigger] ||
                      phase.triggerEvent}
                  </p>
                  <p className="mt-1 text-[11px] font-medium text-slate-600 dark:text-slate-300">{state.detail}</p>
                </div>
                <span className={'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ' + state.badgeClass}>
                  {state.label}
                </span>
              </li>
            )
          })}
        </ol>
      )}

      <div className="mt-4">
        {nextPhase ? (
          <Button
            disabled={busy || loading}
            onClick={() => setConfirmOpen(true)}
            className="bg-teal-600 font-bold text-white hover:bg-teal-700"
          >
            <Unlock className="mr-1.5 h-4 w-4" />
            Mở {phaseTitle(nextPhase)}
            {nextPhase.eligibleToUnlockCount > 0 ? ` · ${nextPhase.eligibleToUnlockCount} hộ` : ''}
          </Button>
        ) : (
          !loading &&
          phases.length > 0 && (
            <p className="text-xs text-slate-500">
              Không có đợt nào cần mở lúc này. Đợt đang thu thì chờ người dân nộp; đợt sau chỉ mở khi có hộ đã xong đợt liền trước.
            </p>
          )
        )}
      </div>

      <Modal open={confirmOpen && !!nextPhase} onClose={() => !busy && setConfirmOpen(false)} size="md">
        <div className="space-y-4 p-5">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Xác nhận mở đợt</h3>
          {nextPhase && (
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Mở <strong>{phaseTitle(nextPhase)}</strong>
              {nextPhase.percentage ? ` (${nextPhase.percentage}% giá căn)` : ''}
              {nextPhase.triggerEventLabel ? ` — ${nextPhase.triggerEventLabel}` : ''}
              {nextPhase.eligibleToUnlockCount > 0
                ? ` cho ${nextPhase.eligibleToUnlockCount} hộ đã nộp đợt liền trước.`
                : '.'}{' '}
              Hộ chưa nộp đợt trước vẫn nộp đợt đó, chưa nộp được đợt này. Một lần bấm áp dụng cả dự án.
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" disabled={busy} onClick={() => setConfirmOpen(false)}>
              Hủy
            </Button>
            <Button
              size="sm"
              disabled={busy}
              onClick={() => void handleConfirmOpen()}
              className="bg-teal-600 font-bold text-white hover:bg-teal-700"
            >
              {busy ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
              Xác nhận mở
            </Button>
          </div>
        </div>
      </Modal>
    </section>
  )
}

function phaseTitle(phase: PhaseProgressItem) {
  return phase.phaseName?.trim() || `Đợt ${phase.phaseOrder}`
}

function phaseState(phase: PhaseProgressItem): { label: string; detail: string; badgeClass: string } {
  if (phase.isAutoOpen) {
    return {
      label: 'Tự mở',
      detail:
        phase.householdCount > 0
          ? `${phase.paidCount}/${phase.householdCount} hộ đã nộp · ${phase.collectingCount} đang chờ`
          : 'Mở khi cấp căn. Người dân nộp, không cần bấm.',
      badgeClass: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
    }
  }
  if (phase.isNextToOpen) {
    return {
      label: 'Bước kế tiếp',
      detail: `${phase.eligibleToUnlockCount} hộ đủ điều kiện mở. ${phase.collectingCount} hộ đang nộp đợt này. ${phase.paidCount} đã nộp.`,
      badgeClass: 'bg-teal-600 text-white',
    }
  }
  if (phase.collectingCount > 0) {
    return {
      label: 'Đang thu',
      detail: `${phase.collectingCount} hộ đang nộp${phase.overdueCount ? ` · ${phase.overdueCount} quá hạn` : ''} · ${phase.paidCount} đã nộp. Người chưa đóng đợt trước vẫn nộp đợt trước.`,
      badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200',
    }
  }
  if (phase.householdCount > 0 && phase.paidCount === phase.householdCount) {
    return {
      label: 'Đã thu xong',
      detail: `Tất cả ${phase.paidCount} hộ đã nộp.`,
      badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200',
    }
  }
  if (phase.lockedCount > 0 && phase.eligibleToUnlockCount === 0) {
    return {
      label: 'Chưa tới',
      detail: 'Chờ người dân nộp đợt liền trước, hoặc công trình chưa tới mốc này.',
      badgeClass: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300',
    }
  }
  return {
    label: 'Chưa mở',
    detail: phase.householdCount === 0 ? 'Chưa có hộ được cấp căn.' : `${phase.lockedCount} hộ đang khóa.`,
    badgeClass: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300',
  }
}

async function loadPhasesFromProject(projectId: string): Promise<PhaseProgressItem[]> {
  const data = await housingProjectsApi.getById(projectId)
  const project = extractSingleProject(data)
  const list = [...(project?.milestones ?? [])].sort((a, b) => a.phaseOrder - b.phaseOrder)
  const nextOrder = list.find((m) => isManualUnlockTrigger(m.triggerEvent))?.phaseOrder
  return list.map((m) => milestoneToPhase(m, nextOrder))
}

function milestoneToPhase(m: MilestoneSetupItemDto, nextOrder?: number): PhaseProgressItem {
  const auto = !isManualUnlockTrigger(m.triggerEvent)
  return {
    phaseOrder: m.phaseOrder,
    phaseName: m.phaseName,
    percentage: m.percentage,
    triggerEvent: m.triggerEvent,
    triggerEventLabel: m.triggerEventLabel,
    isAutoOpen: auto,
    householdCount: 0,
    paidCount: 0,
    collectingCount: 0,
    overdueCount: 0,
    lockedCount: 0,
    eligibleToUnlockCount: 0,
    isNextToOpen: !auto && m.phaseOrder === nextOrder,
  }
}
