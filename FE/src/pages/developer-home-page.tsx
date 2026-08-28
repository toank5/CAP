import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bell,
  Building2,
  CheckCircle2,
  CheckCheck,
  ChevronRight,
  Clock,
  Home,
  Inbox,
  Plus,
  Send,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react'
import {
  housingApplicationsApi,
  parsePagedApplications,
} from '@/api/housing-applications'
import {
  housingProjectsApi,
  parseProjectEvaluation,
  type ProjectApplicationEvaluationDto,
} from '@/api/housing-projects'
import { CreateProjectModal } from '@/components/developer/create-project-modal'
import { AreaChart } from '@/components/ui/area-chart'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { navigate } from '@/hooks/useHashRoute'
import { formatError } from '@/lib/format-error'
import { extractProjects, countFromPaged } from '@/lib/parsers'
import { useNotifications } from '@/providers/notifications-provider'
import type { NotificationDto } from '@/api/notification'
import type { ApplicationSummaryDto, HousingProjectDto } from '@/types'

// ──────────────────────────────────────────────────────────────────────────────
// Status helpers — trạng thái hồ sơ & kịch bản khuyến nghị
// ──────────────────────────────────────────────────────────────────────────────

const DEFAULT_GRADIENT = 'from-slate-400 to-slate-500'

const APP_STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Nháp',
  SUBMITTED: 'Đã nộp',
  REVIEWING: 'Đang duyệt',
  NEED_MORE_DOCUMENTS: 'Cần bổ sung',
  PENDING_SXD_REVIEW: 'Chờ SXD',
  APPROVED: 'Đã duyệt',
  APPROVED_BY_TIMEOUT: 'Duyệt tự động',
  DEPOSIT_PAID: 'Đã TT Đợt 1',
  CONTRACT_PENDING: 'Chờ ký HĐ',
  CONTRACT_SIGNED: 'Đã ký HĐ',
  FULLY_PAID: 'Đã thanh toán đủ',
  REJECTED: 'Từ chối',
  CANCELED: 'Đã hủy',
  EXPIRED: 'Hết hạn',
  LOTTERY_LOST: 'Trượt bốc thăm',
}

const APP_STATUS_GRADIENT: Record<string, string> = {
  APPROVED: 'from-emerald-400 to-teal-500',
  PENDING_SXD_REVIEW: 'from-amber-400 to-orange-500',
  REVIEWING: 'from-cyan-400 to-sky-500',
  SUBMITTED: 'from-blue-400 to-indigo-500',
  REJECTED: 'from-rose-400 to-pink-500',
  NEED_MORE_DOCUMENTS: 'from-indigo-400 to-blue-500',
  DRAFT: 'from-slate-400 to-slate-500',
  DEPOSIT_PAID: 'from-emerald-500 to-green-600',
}

const SCENARIO_LABEL: Record<string, { text: string; tone: 'good' | 'warn' | 'danger' }> = {
  LESS_OR_EQUAL_AVAILABLE: { text: 'Đủ căn — chốt danh sách', tone: 'good' },
  GREATER_THAN_AVAILABLE: { text: 'Vượt căn — cần bốc thăm', tone: 'warn' },
}

function formatDate(iso?: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('vi-VN')
}

function daysUntil(iso?: string | null): number | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return Math.ceil((d.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
}

function buildWeekly<T extends { submittedAt?: string; createdAt?: string }>(
  items: T[],
  match?: (it: T) => boolean,
): number[] {
  const buckets = new Array(12).fill(0)
  const now = Date.now()
  const weekMs = 7 * 24 * 60 * 60 * 1000
  const start = now - 11 * weekMs
  items.forEach((it) => {
    if (match && !match(it)) return
    const t = it.submittedAt || it.createdAt
    if (!t) return
    const ms = new Date(t).getTime()
    if (Number.isNaN(ms)) return
    const idx = Math.floor((ms - start) / weekMs)
    if (idx >= 0 && idx < 12) buckets[idx] += 1
  })
  return buckets
}

function timeAgo(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const diff = Date.now() - d.getTime()
  const m = Math.round(diff / 60_000)
  if (m < 1) return 'Vừa xong'
  if (m < 60) return `${m} phút trước`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} giờ trước`
  const day = Math.round(h / 24)
  if (day < 7) return `${day} ngày trước`
  return d.toLocaleDateString('vi-VN')
}

function notifTypeLabel(t: string): string {
  switch (t) {
    case 'ApplicationStatusChanged':
      return 'Cập nhật hồ sơ'
    case 'PaymentResult':
      return 'Thanh toán'
    case 'IssueReport':
      return 'Báo cáo sự cố'
    case 'System':
      return 'Hệ thống'
    case 'NewApplication':
      return 'Hồ sơ mới nộp'
    case 'ProjectCreated':
      return 'Tạo dự án thành công'
    case 'ProjectUpdated':
      return 'Cập nhật dự án'
    case 'ProjectDeleted':
      return 'Xoá dự án'
    case 'SxdApproved':
      return 'SXD phê duyệt'
    case 'SxdRejected':
      return 'SXD từ chối'
    default:
      return t || 'Thông báo'
  }
}

function notifTypeTone(
  t: string,
): 'default' | 'success' | 'warning' | 'danger' | 'secondary' {
  switch (t) {
    case 'PaymentResult':
    case 'ProjectCreated':
    case 'SxdApproved':
      return 'success'
    case 'IssueReport':
    case 'NewApplication':
      return 'warning'
    case 'ProjectDeleted':
    case 'SxdRejected':
      return 'danger'
    case 'System':
      return 'secondary'
    case 'ApplicationStatusChanged':
    case 'ProjectUpdated':
      return 'default'
    default:
      return 'secondary'
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Component chính
// ──────────────────────────────────────────────────────────────────────────────

interface DashboardData {
  projects: HousingProjectDto[]
  evaluations: Record<string, ProjectApplicationEvaluationDto>
  counts: {
    totalProjects: number
    openProjects: number
    totalUnits: number
    submitted: number
    reviewing: number
    needMore: number
    approved: number
    pendingSxd: number
    rejected: number
  }
  weekly: { submitted: number[]; approved: number[] }
  recent: ApplicationSummaryDto[]
}

export function DeveloperHomePage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const { recent, unreadCount, refreshList, markAsRead, markAllAsRead } = useNotifications()
  const [notifLoading, setNotifLoading] = useState(false)
  const [data, setData] = useState<DashboardData>({
    projects: [],
    evaluations: {},
    counts: {
      totalProjects: 0,
      openProjects: 0,
      totalUnits: 0,
      submitted: 0,
      reviewing: 0,
      needMore: 0,
      approved: 0,
      pendingSxd: 0,
      rejected: 0,
    },
    weekly: { submitted: new Array(12).fill(0), approved: new Array(12).fill(0) },
    recent: [],
  })

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      // 1. Projects của CĐT
      const projectsRaw = await housingProjectsApi.list({ pageSize: 100 })
      const projects = extractProjects(projectsRaw)

      // 2. Evaluation từng dự án (chạy song song) — chỉ lấy những dự án có ID
      const evalEntries = await Promise.allSettled(
        projects
          .filter((p): p is HousingProjectDto & { id: string } => !!p.id)
          .map(async (p) => {
            const data = await housingProjectsApi.getEvaluation(p.id)
            const parsed = parseProjectEvaluation(data)
            return parsed ? ([p.id, parsed] as const) : null
          }),
      )
      const evaluations: Record<string, ProjectApplicationEvaluationDto> = {}
      evalEntries.forEach((r) => {
        if (r.status === 'fulfilled' && r.value) {
          evaluations[r.value[0]] = r.value[1]
        }
      })

      // 3. Đếm hồ sơ theo trạng thái — dùng dashboard CĐT của BE
      const [submittedRes, reviewingRes, needMoreRes, approvedRes, sxdRes, rejectedRes, allRes] =
        await Promise.allSettled([
          housingApplicationsApi.getDeveloperDashboard({ pageSize: 1, status: 'SUBMITTED' }),
          housingApplicationsApi.getDeveloperDashboard({ pageSize: 1, status: 'REVIEWING' }),
          housingApplicationsApi.getDeveloperDashboard({ pageSize: 1, status: 'NEED_MORE_DOCUMENTS' }),
          housingApplicationsApi.getDeveloperDashboard({ pageSize: 1, status: 'APPROVED' }),
          housingApplicationsApi.getDeveloperDashboard({ pageSize: 1, status: 'PENDING_SXD_REVIEW' }),
          housingApplicationsApi.getDeveloperDashboard({ pageSize: 1, status: 'REJECTED' }),
          housingApplicationsApi.getDeveloperDashboard({ pageSize: 1000 }),
        ])

      const allApps =
        allRes.status === 'fulfilled' ? parsePagedApplications(allRes.value) : []

      // 4. Tổng căn còn trống theo dữ liệu thật
      const totalUnits = projects.reduce((s, p) => s + (p.availableUnits ?? 0), 0)
      const openProjects = projects.filter((p) => {
        const s = String(p.status || '').toUpperCase()
        return s === 'OPEN' || s.includes('OPEN')
      }).length

      setData({
        projects,
        evaluations,
        counts: {
          totalProjects: projects.length,
          openProjects,
          totalUnits,
          submitted: submittedRes.status === 'fulfilled' ? countFromPaged(submittedRes.value) : 0,
          reviewing: reviewingRes.status === 'fulfilled' ? countFromPaged(reviewingRes.value) : 0,
          needMore: needMoreRes.status === 'fulfilled' ? countFromPaged(needMoreRes.value) : 0,
          approved: approvedRes.status === 'fulfilled' ? countFromPaged(approvedRes.value) : 0,
          pendingSxd: sxdRes.status === 'fulfilled' ? countFromPaged(sxdRes.value) : 0,
          rejected: rejectedRes.status === 'fulfilled' ? countFromPaged(rejectedRes.value) : 0,
        },
        weekly: {
          submitted: buildWeekly(allApps),
          approved: buildWeekly(allApps, (a) => a.applicationStatus === 'APPROVED'),
        },
        recent: [...allApps]
          .filter((a) => !!a.submittedAt)
          .sort((a, b) => new Date(b.submittedAt!).getTime() - new Date(a.submittedAt!).getTime())
          .slice(0, 6),
      })
    } catch (err) {
      setError(formatError(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load, reloadKey])

  useEffect(() => {
    let cancelled = false
    setNotifLoading(true)
    void refreshList(1, 5).finally(() => {
      if (!cancelled) setNotifLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [refreshList])

  const refresh = useCallback(() => setReloadKey((k) => k + 1), [])

  const urgentProjects = useMemo(() => {
    // Dự án cần xử lý gấp: ưu tiên vượt căn + đang mở
    return data.projects
      .map((p) => {
        const ev = p.id ? data.evaluations[p.id] : undefined
        if (!ev) return null
        const scenario = SCENARIO_LABEL[ev.recommendedScenario]
        if (!scenario) return null
        const days = daysUntil(p.applicationCloseDate)
        const isUrgent = scenario.tone === 'warn' || (days != null && days >= 0 && days <= 7)
        if (!isUrgent) return null
        return { project: p, evaluation: ev, scenario, daysToClose: days }
      })
      .filter(Boolean) as Array<{
        project: HousingProjectDto
        evaluation: ProjectApplicationEvaluationDto
        scenario: { text: string; tone: 'good' | 'warn' | 'danger' }
        daysToClose: number | null
      }>
  }, [data.projects, data.evaluations])

  return (
    <div className="space-y-6">
      {/* ── HEADER ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-center justify-between gap-4"
      >
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:border-blue-700/50 dark:bg-blue-950/40 dark:text-blue-300">
            <Sparkles className="h-3 w-3" />
            Chủ đầu tư
          </div>
          <h1 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            Trung tâm điều hành dự án
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Tiếp nhận, thẩm định hồ sơ và gửi danh sách lên Sở Xây dựng.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate('applications')}
            className="rounded-xl font-semibold"
          >
            Hồ sơ <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            onClick={() => setShowCreate(true)}
            className="rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 font-semibold text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40"
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Tạo dự án
          </Button>
        </div>
      </motion.div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-800/50 dark:bg-rose-950/40 dark:text-rose-300">
          {error}
          <button
            type="button"
            onClick={refresh}
            className="ml-3 text-xs font-bold underline"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* ── KPI GRID ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          delay={0}
          icon={<Building2 className="h-5 w-5" />}
          label="Dự án của tôi"
          value={loading ? '—' : data.counts.totalProjects}
          sub={loading ? '' : `${data.counts.openProjects} đang mở bán`}
          tone="blue"
        />
        <KpiCard
          delay={0.05}
          icon={<Home className="h-5 w-5" />}
          label="Tổng căn còn trống"
          value={loading ? '—' : data.counts.totalUnits}
          sub={loading ? '' : 'căn hộ khả dụng'}
          tone="indigo"
        />
        <KpiCard
          delay={0.1}
          icon={<Inbox className="h-5 w-5" />}
          label="Hồ sơ chờ thẩm định"
          value={loading ? '—' : data.counts.submitted + data.counts.reviewing}
          sub={
            loading
              ? ''
              : `${data.counts.submitted} mới · ${data.counts.reviewing} đang xử lý`
          }
          tone="cyan"
        />
        <KpiCard
          delay={0.15}
          icon={<AlertTriangle className="h-5 w-5" />}
          label="Cần bổ sung"
          value={loading ? '—' : data.counts.needMore}
          sub={loading ? '' : 'hồ sơ đang chờ công dân'}
          tone="amber"
        />
      </div>

      {/* ── URGENT PROJECTS ── */}
      {!loading && urgentProjects.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card border-l-4 border-amber-400 p-5 sm:p-6 dark:border-amber-500"
        >
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
              <Clock className="h-4 w-4 text-amber-500" />
              Dự án cần xử lý gấp
            </h3>
            <span className="rounded-lg bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
              {urgentProjects.length} dự án
            </span>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {urgentProjects.slice(0, 4).map(({ project, evaluation, scenario, daysToClose }) => (
              <button
                key={project.id}
                type="button"
                onClick={() => navigate('project-detail')}
                className="group flex w-full items-start gap-3 rounded-xl border border-slate-200/60 bg-white/60 p-3 text-left transition-all hover:border-blue-300 hover:bg-blue-50/40 dark:border-slate-700/60 dark:bg-slate-900/40 dark:hover:border-blue-700 dark:hover:bg-blue-950/30"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                    {project.projectName || project.name}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {scenario.text}
                    {daysToClose != null && daysToClose >= 0 && (
                      <> · đóng hồ sơ sau <strong>{daysToClose} ngày</strong></>
                    )}
                  </p>
                  <div className="mt-1.5 flex items-center gap-2 text-[11px]">
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      {evaluation.totalQualifiedApplications}
                    </span>
                    <span className="text-slate-500">hồ sơ hợp lệ /</span>
                    <span className="font-bold text-blue-600 dark:text-blue-400">
                      {evaluation.availableUnits}
                    </span>
                    <span className="text-slate-500">căn</span>
                    {evaluation.priorityCount > 0 && (
                      <span className="ml-auto rounded-full bg-rose-100 px-2 py-0.5 font-semibold text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
                        {evaluation.priorityCount} ưu tiên
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-blue-500" />
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── CHART + DISTRIBUTION ── */}
      <div className="grid gap-6 lg:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="glass-card p-5 sm:p-6 lg:col-span-2"
        >
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
                <TrendingUp className="h-4 w-4 text-blue-500" />
                Xu hướng 12 tuần
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">Tiếp nhận &amp; duyệt hồ sơ</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 rounded-lg bg-blue-500/10 px-2.5 py-1.5 font-medium text-blue-600 dark:text-blue-400">
                <Send className="h-3 w-3" /> {data.weekly.submitted.reduce((a, b) => a + b, 0)}
              </span>
              <span className="flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-2.5 py-1.5 font-medium text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-3 w-3" /> {data.weekly.approved.reduce((a, b) => a + b, 0)}
              </span>
            </div>
          </div>
          <AreaChart
            height={200}
            series={[
              { name: 'Tiếp nhận', data: data.weekly.submitted, color: '#2563eb' },
              { name: 'Đã duyệt', data: data.weekly.approved, color: '#10b981' },
            ]}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-5 sm:p-6"
        >
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
              <Activity className="h-4 w-4 text-blue-500" />
              Phân bổ trạng thái
            </h3>
            <span className="rounded-lg bg-slate-100/80 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800/80 dark:text-slate-400">
              {Object.values(data.counts).reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0)} hồ sơ
            </span>
          </div>
          <div className="space-y-2.5">
            <DistRow label="Đã nộp" value={data.counts.submitted} gradient={APP_STATUS_GRADIENT.SUBMITTED} />
            <DistRow label="Đang duyệt" value={data.counts.reviewing} gradient={APP_STATUS_GRADIENT.REVIEWING} />
            <DistRow label="Cần bổ sung" value={data.counts.needMore} gradient={APP_STATUS_GRADIENT.NEED_MORE_DOCUMENTS} />
            <DistRow label="Chờ SXD" value={data.counts.pendingSxd} gradient={APP_STATUS_GRADIENT.PENDING_SXD_REVIEW} />
            <DistRow label="Đã duyệt" value={data.counts.approved} gradient={APP_STATUS_GRADIENT.APPROVED} />
            <DistRow label="Từ chối" value={data.counts.rejected} gradient={APP_STATUS_GRADIENT.REJECTED} />
          </div>
        </motion.div>
      </div>

      {/* ── RECENT APPLICATIONS + NOTIFICATIONS ── */}
      <div className="grid gap-6 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card p-5 sm:p-6"
        >
          <div className="mb-3 flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-500" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              Hồ sơ mới nhất
            </h3>
          </div>
          <div className="divide-y divide-slate-100/70 dark:divide-slate-800/60">
            {loading ? (
              Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="flex items-center gap-3 py-2.5">
                  <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
                  <div className="flex-1">
                    <Skeleton className="h-3.5 w-40" />
                    <Skeleton className="mt-1 h-3 w-24" />
                  </div>
                  <Skeleton className="h-5 w-14 rounded-md" />
                </div>
              ))
            ) : data.recent.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">
                Chưa có hồ sơ nào được nộp.
              </p>
            ) : (
              data.recent.map((a) => {
                const statusLabel = APP_STATUS_LABEL[a.applicationStatus]
                return (
                  <motion.button
                    key={a.applicationId}
                    type="button"
                    whileHover={{ x: 2 }}
                    onClick={() => navigate('applications')}
                    className="flex w-full items-center gap-3 py-2 text-left transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-xs font-bold text-white">
                      {(a.applicantFullName || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                        {a.applicantFullName || '(chưa rõ)'}
                      </p>
                      <p className="truncate text-[11px] text-slate-500">
                        {a.projectName || '—'}
                        {a.citizenId ? ` · CCCD ${a.citizenId}` : ''}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      {statusLabel && (
                        <span className="inline-block rounded-md bg-blue-500/10 px-2 py-0.5 text-[11px] font-medium text-blue-600 dark:text-blue-400">
                          {statusLabel}
                        </span>
                      )}
                      {a.submittedAt && (
                        <p className="mt-0.5 text-[10px] text-slate-400">
                          {formatDate(a.submittedAt)}
                        </p>
                      )}
                    </div>
                  </motion.button>
                )
              })
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="glass-card p-5 sm:p-6"
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-blue-500" />
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Thông báo gần đây
              </h3>
              {unreadCount > 0 && (
                <span className="inline-flex min-w-[20px] items-center justify-center rounded-full bg-[#DA251D] px-1.5 text-[10px] font-bold text-white">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-[11px]"
                disabled={unreadCount === 0}
                onClick={() => void markAllAsRead()}
                title="Đánh dấu tất cả đã đọc"
              >
                <CheckCheck className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-[11px]"
                onClick={() => navigate('notifications')}
              >
                Xem tất cả
              </Button>
            </div>
          </div>
          <div className="divide-y divide-slate-100/70 dark:divide-slate-800/60">
            {notifLoading && recent.length === 0 ? (
              Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="flex items-center gap-3 py-2.5">
                  <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
                  <div className="flex-1">
                    <Skeleton className="h-3.5 w-40" />
                    <Skeleton className="mt-1 h-3 w-24" />
                  </div>
                </div>
              ))
            ) : recent.length === 0 ? (
              <div className="py-4">
                <EmptyState
                  title="Chưa có thông báo"
                  description="Các thông báo về hồ sơ, duyệt và sự cố sẽ xuất hiện tại đây."
                />
              </div>
            ) : (
              recent.map((n: NotificationDto) => {
                const tone = notifTypeTone(n.notificationType)
                const toneClasses: Record<typeof tone, string> = {
                  default: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
                  success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
                  warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
                  danger: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
                  secondary: 'bg-slate-500/10 text-slate-600 dark:text-slate-400',
                }
                return (
                  <button
                    key={n.notificationId}
                    type="button"
                    onClick={() => {
                      if (!n.isRead) void markAsRead(n.notificationId)
                    }}
                    className={`flex w-full items-start gap-3 py-2 text-left transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800/40 ${!n.isRead ? 'bg-primary/[0.03]' : ''
                      }`}
                  >
                    <div
                      className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${toneClasses[tone]
                        }`}
                    >
                      <Bell className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className={`truncate text-sm ${!n.isRead
                            ? 'font-bold text-slate-900 dark:text-white'
                            : 'font-medium text-slate-700 dark:text-slate-200'
                          }`}
                      >
                        {n.title}
                      </p>
                      <p className="line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
                        {n.content}
                      </p>
                      <div className="mt-1 flex items-center gap-2 text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
                        <span>{notifTypeLabel(n.notificationType)}</span>
                        <span>·</span>
                        <span>{timeAgo(n.createdAt)}</span>
                      </div>
                    </div>
                    {!n.isRead && (
                      <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#DA251D]" aria-label="Chưa đọc" />
                    )}
                  </button>
                )
              })
            )}
          </div>
        </motion.div>
      </div>

      <CreateProjectModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={refresh}
      />
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────────
// Sub-components
// ──────────────────────────────────────────────────────────────────────────────

function KpiCard({
  icon,
  label,
  value,
  sub,
  tone,
  delay,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  sub?: string
  tone: 'blue' | 'indigo' | 'cyan' | 'amber'
  delay: number
}) {
  const toneMap = {
    blue: { bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400' },
    indigo: { bg: 'bg-indigo-500/10', text: 'text-indigo-600 dark:text-indigo-400' },
    cyan: { bg: 'bg-cyan-500/10', text: 'text-cyan-600 dark:text-cyan-400' },
    amber: { bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400' },
  } as const
  const t = toneMap[tone]
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="glass-card group p-5 hover:scale-[1.02] transition-transform sm:p-6"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-1.5 text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
          {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
        </div>
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${t.bg} ${t.text} shadow-sm group-hover:scale-110 transition-transform`}
        >
          {icon}
        </div>
      </div>
    </motion.div>
  )
}

function DistRow({
  label,
  value,
  gradient,
}: {
  label: string
  value: number
  gradient: string | undefined
}) {
  const g = gradient ?? DEFAULT_GRADIENT
  // Use a single shared max for visual comparison
  const max = Math.max(value, 1)
  const pct = Math.min(100, (value / max) * 100)
  if (value === 0) return null
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-300">
          <span className={`h-2 w-2 rounded-full bg-gradient-to-r ${g}`} />
          {label}
        </span>
        <span className="font-semibold text-slate-600 dark:text-slate-400">{value}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100/60 dark:bg-slate-800/60">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${g}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
