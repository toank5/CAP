import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, FileSignature, Inbox, Sparkles } from 'lucide-react'
import {
  housingProjectsApi,
  parseApartments,
  parseProjectEvaluation,
  type ApplicationSummaryItemDto,
  type DeveloperDecisionType,
  type ProjectApplicationEvaluationDto,
} from '@/api/housing-projects'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/input'
import { navigate } from '@/hooks/useHashRoute'
import { formatError } from '@/lib/format-error'
import {
  WAITLIST_CONFIRM_HOURS,
  apartmentOptionLabel,
  sortByHighestScore,
  splitAvailableUnits,
} from '@/lib/lottery-allocation'
import type { ApartmentDto } from '@/types'

const PRIORITY_LABELS: Record<string, string> = {
  REVOLUTIONARY_CONTRIBUTION: 'Có công với cách mạng',
  POOR_HOUSEHOLD: 'Hộ nghèo / cận nghèo',
  SINGLE_MOTHER: 'Mẹ đơn thân',
  DISABILITY: 'Người khuyết tật',
  ETHNIC_MINORITY: 'Dân tộc thiểu số',
}

/**
 * CĐT sau khi SXD duyệt:
 * - Hồ sơ ≤ căn trống → cấp căn, không bốc thăm
 * - Vượt căn → căn ưu tiên cấp trực tiếp cho điểm cao nhất; phần còn lại bốc thăm công khai
 * - Không trúng → waitlist theo hạng; suất trả lại đôn #1 (hạn xác nhận 48 giờ — BE)
 */
export function DeveloperDecisionPanel({ projectId }: { projectId: string }) {
  const [evaluation, setEvaluation] = useState<ProjectApplicationEvaluationDto | null>(null)
  const [availableApts, setAvailableApts] = useState<ApartmentDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [closeProject, setCloseProject] = useState(false)
  /** applicationId → apartmentId */
  const [aptByApp, setAptByApp] = useState<Record<string, string>>({})

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const [evalData, projectData] = await Promise.all([
        housingProjectsApi.getEvaluation(projectId),
        housingProjectsApi.getById(projectId),
      ])
      const e = parseProjectEvaluation(evalData)
      setEvaluation(e)
      const apts = parseApartments(projectData).filter(
        (a) => String(a.status).toUpperCase() === 'AVAILABLE',
      )
      setAvailableApts(apts)
      const fund = splitAvailableUnits(apts)
      if (e) {
        const pool = sortByHighestScore(e.priorityApplications)
        const all = sortByHighestScore([
          ...e.priorityApplications,
          ...e.nonPriorityApplications,
        ])
        const over = all.length > apts.length
        const usesSelection = pool.length > apts.length
        const nDirect = over
          ? usesSelection
            ? Math.min(fund.priorityCount > 0 ? fund.priorityCount : 0, apts.length, pool.length)
            : pool.length
          : all.length
        const grant = over ? pool.slice(0, nDirect) : all
        const rankedApts = [...fund.priority, ...fund.standard]
        const nextApts: Record<string, string> = {}
        grant.forEach((app, i) => {
          const apt = rankedApts[i] as ApartmentDto | undefined
          if (apt?.id) nextApts[app.applicationId] = apt.id
        })
        setAptByApp(nextApts)
      } else {
        setAptByApp({})
      }
    } catch (err) {
      setError(formatError(err))
      setEvaluation(null)
      setAvailableApts([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [projectId])

  const fund = useMemo(() => splitAvailableUnits(availableApts), [availableApts])

  const bePriorityPool = useMemo(
    () => (evaluation ? sortByHighestScore(evaluation.priorityApplications) : []),
    [evaluation],
  )

  const allQualified = useMemo(() => {
    if (!evaluation) return [] as ApplicationSummaryItemDto[]
    return sortByHighestScore([
      ...evaluation.priorityApplications,
      ...evaluation.nonPriorityApplications,
    ])
  }, [evaluation])

  /** BE chỉ cấp trực tiếp các hồ sơ có nhóm đối tượng; khi vượt số căn thì nhận danh sách id FE gửi. */
  const beUsesSelection = bePriorityPool.length > availableApts.length

  const nDirect = useMemo(() => {
    if (bePriorityPool.length === 0) return 0
    if (beUsesSelection) {
      const cap = fund.priorityCount > 0 ? fund.priorityCount : 0
      return Math.min(cap, availableApts.length, bePriorityPool.length)
    }
    return bePriorityPool.length
  }, [bePriorityPool.length, beUsesSelection, fund.priorityCount, availableApts.length])

  const closeAndSignApps = allQualified

  const priorityGrantApps = useMemo(
    () => bePriorityPool.slice(0, nDirect),
    [bePriorityPool, nDirect],
  )

  const lotteryApps = useMemo(() => {
    const granted = new Set(priorityGrantApps.map((a) => a.applicationId))
    return allQualified.filter((a) => !granted.has(a.applicationId))
  }, [allQualified, priorityGrantApps])

  const usedAptIds = useMemo(() => new Set(Object.values(aptByApp).filter(Boolean)), [aptByApp])

  const rankedAvailableApts = useMemo(
    () => [...fund.priority, ...fund.standard] as ApartmentDto[],
    [fund],
  )

  const setAppApartment = (applicationId: string, apartmentId: string) => {
    setAptByApp((prev) => {
      const next = { ...prev }
      if (!apartmentId) {
        delete next[applicationId]
        return next
      }
      // Một căn chỉ gán 1 hồ sơ
      for (const [appId, aptId] of Object.entries(next)) {
        if (aptId === apartmentId && appId !== applicationId) delete next[appId]
      }
      next[applicationId] = apartmentId
      return next
    })
  }

  const buildAssignments = (apps: ApplicationSummaryItemDto[]) =>
    apps.map((a) => ({
      applicationId: a.applicationId,
      apartmentId: aptByApp[a.applicationId] ?? '',
    }))

  const validateAssignments = (apps: ApplicationSummaryItemDto[]): string | null => {
    if (apps.length === 0) return 'Không có hồ sơ để cấp căn.'
    if (availableApts.length < apps.length) {
      return `Không đủ căn trống (${availableApts.length}) cho ${apps.length} hồ sơ.`
    }
    for (const a of apps) {
      if (!aptByApp[a.applicationId]) {
        return `Chưa chọn căn cho hồ sơ: ${a.fullName}.`
      }
    }
    const ids = apps.map((a) => aptByApp[a.applicationId])
    if (new Set(ids).size !== ids.length) {
      return 'Mỗi căn chỉ được cấp cho một hồ sơ.'
    }
    return null
  }

  const execute = async (decisionType: DeveloperDecisionType) => {
    if (!evaluation || busy) return

    if (decisionType === 'PROCESS_PRIORITY_AND_LOTTERY' && beUsesSelection) {
      if (priorityGrantApps.length === 0) {
        setMsg({
          type: 'error',
          text: 'Không còn căn ưu tiên để cấp trực tiếp. Hồ sơ vượt quỹ sẽ vào bốc thăm công khai.',
        })
        return
      }
    }

    let appsToAssign: ApplicationSummaryItemDto[] = []
    if (decisionType === 'CLOSE_AND_SIGN') {
      appsToAssign = closeAndSignApps
      const err = validateAssignments(appsToAssign)
      if (err) {
        setMsg({ type: 'error', text: err })
        return
      }
    } else if (decisionType === 'PROCESS_PRIORITY_AND_LOTTERY') {
      appsToAssign = priorityGrantApps
      const err = validateAssignments(appsToAssign)
      if (err) {
        setMsg({ type: 'error', text: err })
        return
      }
    }

    const labels: Record<DeveloperDecisionType, string> = {
      CLOSE_AND_SIGN: 'Chốt danh sách, cấp căn (điểm cao nhận căn ưu tiên trước) và chuyển sang ký hợp đồng?',
      KEEP_OPEN: 'Giữ danh sách đạt yêu cầu và tiếp tục nhận thêm hồ sơ?',
      PROCESS_PRIORITY_AND_LOTTERY:
        'Cấp căn ưu tiên cho hồ sơ điểm cao nhất, phần còn lại bốc thăm công khai? Hồ sơ không trúng sẽ vào danh sách chờ theo hạng.',
    }
    if (!window.confirm(labels[decisionType])) return

    setBusy(decisionType)
    setMsg(null)
    try {
      await housingProjectsApi.executeDeveloperDecision(projectId, {
        decisionType,
        closeProject: decisionType === 'CLOSE_AND_SIGN' ? closeProject : false,
        selectedPriorityApplicationIds:
          decisionType === 'PROCESS_PRIORITY_AND_LOTTERY' && beUsesSelection
            ? priorityGrantApps.map((a) => a.applicationId)
            : undefined,
        apartmentAssignments:
          decisionType === 'KEEP_OPEN'
            ? undefined
            : buildAssignments(appsToAssign).map((x) => ({
                applicationId: x.applicationId,
                apartmentId: x.apartmentId,
              })),
      })

      if (decisionType === 'CLOSE_AND_SIGN') {
        setMsg({
          type: 'success',
          text: closeProject
            ? 'Đã cấp căn, chuyển ký hợp đồng và đóng dự án.'
            : 'Đã cấp căn và chuyển sang ký hợp đồng mua bán nhà ở xã hội.',
        })
      } else if (decisionType === 'KEEP_OPEN') {
        setMsg({
          type: 'success',
          text: 'Đã lưu danh sách đạt yêu cầu. Dự án tiếp tục nhận thêm hồ sơ.',
        })
      } else {
        setMsg({
          type: 'success',
          text: `Đã cấp căn ưu tiên cho ${priorityGrantApps.length} hồ sơ điểm cao nhất. Phần còn lại bốc thăm công khai; không trúng sẽ vào danh sách chờ (hạn xác nhận ${WAITLIST_CONFIRM_HOURS} giờ khi được đôn).`,
        })
        sessionStorage.setItem('lotteryProjectId', projectId)
        sessionStorage.setItem('projectId', projectId)
        window.setTimeout(() => navigate('lottery-detail'), 800)
        return
      }
      await load()
    } catch (err) {
      setMsg({ type: 'error', text: formatError(err) })
    } finally {
      setBusy('')
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
        <p className="text-sm text-slate-500 dark:text-slate-400">Đang tải đánh giá hồ sơ đã duyệt...</p>
      </div>
    )
  }

  if (error) {
    return <Alert variant="error">{error}</Alert>
  }

  if (!evaluation) {
    return <Alert variant="info">Chưa có dữ liệu đánh giá cho dự án này.</Alert>
  }

  const isLessOrEqual = evaluation.recommendedScenario === 'LESS_OR_EQUAL_AVAILABLE'
  const hasQualified = evaluation.totalQualifiedApplications > 0

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-semibold text-slate-900 dark:text-white">
          Cấp căn, bốc thăm &amp; danh sách chờ
        </h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Căn ưu tiên cấp trực tiếp cho hồ sơ điểm cao nhất. Khi số hồ sơ hợp lệ vượt quỹ căn còn lại,
          phần còn lại bốc thăm công khai. Không trúng được xếp danh sách chờ theo hạng — suất trả lại
          (hủy HĐ / không cọc) đôn người #1, hạn xác nhận {WAITLIST_CONFIRM_HOURS} giờ.
        </p>
      </div>

      {msg && <Alert variant={msg.type === 'error' ? 'error' : 'success'}>{msg.text}</Alert>}

      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Căn còn trống" value={availableApts.length} />
        <Stat label="Căn ưu tiên" value={fund.priorityCount} tone="warning" />
        <Stat label="Căn thường" value={fund.standardCount} tone="success" />
        <Stat label="Đã duyệt (SXD)" value={evaluation.totalQualifiedApplications} tone="primary" />
      </div>

      {!hasQualified ? (
        <Alert variant="info">
          Chưa có hồ sơ nào ở trạng thái đã duyệt bởi Sở Xây dựng. Khi Sở phê duyệt, danh sách sẽ
          hiện tại đây.
        </Alert>
      ) : isLessOrEqual ? (
        <div className="space-y-4">
          <Alert variant="info">
            Số hồ sơ đủ điều kiện ({evaluation.totalQualifiedApplications}) không vượt số căn trống (
            {availableApts.length}). Cấp căn theo điểm (căn ưu tiên cho điểm cao nhất), không bốc thăm.
          </Alert>

          <ApartmentAssignList
            title="Cấp căn cho hồ sơ đủ điều kiện (điểm cao → căn ưu tiên)"
            items={closeAndSignApps}
            availableApts={rankedAvailableApts}
            aptByApp={aptByApp}
            usedAptIds={usedAptIds}
            onChange={setAppApartment}
          />

          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              className="h-4 w-4 accent-blue-600"
              checked={closeProject}
              onChange={(e) => setCloseProject(e.target.checked)}
            />
            Đóng dự án với số căn còn lại sau khi chốt (không nhận thêm hồ sơ)
          </label>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="accent"
              disabled={!!busy || availableApts.length === 0}
              onClick={() => void execute('CLOSE_AND_SIGN')}
            >
              <FileSignature className="mr-1.5 h-4 w-4" />
              {busy === 'CLOSE_AND_SIGN' ? 'Đang chốt…' : 'Cấp căn → ký hợp đồng'}
            </Button>
            <Button variant="outline" disabled={!!busy} onClick={() => void execute('KEEP_OPEN')}>
              <Inbox className="mr-1.5 h-4 w-4" />
              {busy === 'KEEP_OPEN' ? 'Đang lưu…' : 'Giữ & nhận thêm hồ sơ'}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <Alert variant="warning">
            Số hồ sơ hợp lệ ({evaluation.totalQualifiedApplications}) vượt quỹ căn còn lại (
            {availableApts.length}: {fund.priorityCount} ưu tiên + {fund.standardCount} thường).
            Căn ưu tiên cấp trực tiếp theo thang điểm; phần còn lại bốc thăm công khai. Không trúng
            vào danh sách chờ #1, #2, #3… — không hủy hồ sơ.
          </Alert>

          {priorityGrantApps.length > 0 ? (
            <>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {priorityGrantApps.length} hồ sơ điểm cao nhất được cấp căn ưu tiên (không bốc thăm),
                xếp theo điểm giảm dần.
              </p>
              <ApartmentAssignList
                title="Cấp trực tiếp — điểm cao nhất"
                items={priorityGrantApps}
                availableApts={rankedAvailableApts}
                aptByApp={aptByApp}
                usedAptIds={usedAptIds}
                onChange={setAppApartment}
              />
            </>
          ) : (
            <Alert variant="info">
              Dự án không còn căn gắn suất ưu tiên. Toàn bộ hồ sơ vượt quỹ sẽ vào bốc thăm công khai.
            </Alert>
          )}

          <AppList title="Hồ sơ còn lại — bốc thăm; không trúng vào danh sách chờ theo hạng" items={lotteryApps} />

          <div className="flex flex-wrap gap-2">
            {priorityGrantApps.length > 0 && (
              <Button
                variant="accent"
                disabled={!!busy || availableApts.length === 0}
                onClick={() => void execute('PROCESS_PRIORITY_AND_LOTTERY')}
              >
                <CheckCircle2 className="mr-1.5 h-4 w-4" />
                {busy === 'PROCESS_PRIORITY_AND_LOTTERY'
                  ? 'Đang xử lý…'
                  : 'Cấp căn điểm cao → chuẩn bị bốc thăm'}
              </Button>
            )}
            <Button
              variant={priorityGrantApps.length > 0 ? 'outline' : 'accent'}
              disabled={!!busy}
              onClick={() => {
                sessionStorage.setItem('lotteryProjectId', projectId)
                sessionStorage.setItem('projectId', projectId)
                navigate('lottery-detail')
              }}
            >
              <Sparkles className="mr-1.5 h-4 w-4" />
              Bốc thăm
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function ApartmentAssignList({
  title,
  items,
  availableApts,
  aptByApp,
  usedAptIds,
  onChange,
}: {
  title: string
  items: ApplicationSummaryItemDto[]
  availableApts: ApartmentDto[]
  aptByApp: Record<string, string>
  usedAptIds: Set<string>
  onChange: (applicationId: string, apartmentId: string) => void
}) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400">{title}: chưa có hồ sơ.</p>
    )
  }

  if (availableApts.length === 0) {
    return (
      <Alert variant="error">
        Dự án chưa có căn trống (AVAILABLE). Hãy thêm căn ở form dự án trước khi cấp.
      </Alert>
    )
  }

  return (
    <div className="space-y-2 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
        {title} ({items.length})
      </p>
      <p className="text-xs text-slate-500">
        Mỗi hồ sơ chọn một căn còn trống. Hợp đồng sẽ ghi tên căn · diện tích · giá đã chọn.
      </p>
      <ul className="space-y-3">
        {items.map((app) => {
          const selected = aptByApp[app.applicationId] ?? ''
          return (
            <li
              key={app.applicationId}
              className="grid gap-2 rounded-lg bg-slate-50 p-3 dark:bg-slate-800/40 sm:grid-cols-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{app.fullName}</p>
                <p className="text-xs text-slate-500">
                  {app.priorityGroup
                    ? PRIORITY_LABELS[app.priorityGroup] ?? app.priorityGroup
                    : 'Không ưu tiên'}{' '}
                  · Điểm {app.priorityScore} · {app.citizenId}
                </p>
              </div>
              <Select
                value={selected}
                onChange={(e) => onChange(app.applicationId, e.target.value)}
                aria-label={`Chọn căn cho ${app.fullName}`}
              >
                <option value="">Chọn căn…</option>
                {availableApts.map((apt) => {
                  const taken = usedAptIds.has(apt.id) && selected !== apt.id
                  return (
                    <option key={apt.id} value={apt.id} disabled={taken}>
                      {apartmentOptionLabel(apt, taken)}
                    </option>
                  )
                })}
              </Select>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function AppList({ title, items }: { title: string; items: ApplicationSummaryItemDto[] }) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400">
        {title}: không có hồ sơ.
      </p>
    )
  }
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-slate-800 dark:text-slate-200">
        {title} ({items.length})
      </p>
      <ul className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-700">
        {items.map((a) => (
          <li
            key={a.applicationId}
            className="flex flex-wrap justify-between gap-2 border-b border-slate-100 py-1.5 last:border-0 dark:border-slate-800"
          >
            <span className="font-medium">{a.fullName}</span>
            <span className="text-xs text-slate-500">
              Điểm {a.priorityScore} · {a.priorityGroup
                ? PRIORITY_LABELS[a.priorityGroup] ?? a.priorityGroup
                : 'Không ưu tiên'}{' '}
              · {a.citizenId}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string
  value: number | string
  tone?: 'primary' | 'warning' | 'success'
}) {
  const toneClass =
    tone === 'primary'
      ? 'text-blue-600'
      : tone === 'warning'
        ? 'text-amber-600'
        : tone === 'success'
          ? 'text-emerald-600'
          : 'text-slate-900 dark:text-slate-100'
  return (
    <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className={`mt-1 text-xl font-bold ${toneClass}`}>{value}</p>
    </div>
  )
}
