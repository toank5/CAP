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
  Eye,
  FileText,
  Home,
  Inbox,
  Layers,
  Plus,
  RefreshCw,
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
// Helpers & Mapping trạng thái
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
  SUBMITTED: 'from-blue-500 to-indigo-600',
  REVIEWING: 'from-cyan-500 to-sky-600',
  NEED_MORE_DOCUMENTS: 'from-amber-400 to-orange-500',
  PENDING_SXD_REVIEW: 'from-purple-500 to-indigo-600',
  APPROVED: 'from-emerald-400 to-teal-500',
  DEPOSIT_PAID: 'from-emerald-500 to-green-600',
  REJECTED: 'from-rose-500 to-pink-600',
  DRAFT: 'from-slate-400 to-slate-500',
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
// Interface Data
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

// ──────────────────────────────────────────────────────────────────────────────
// Component chính: DeveloperHomePage
// ──────────────────────────────────────────────────────────────────────────────

export function DeveloperHomePage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const { recent: notifRecent, unreadCount, refreshList, markAsRead, markAllAsRead } = useNotifications()
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
      // 1. Danh sách dự án
      const projectsRaw = await housingProjectsApi.list({ pageSize: 100 })
      const projects = extractProjects(projectsRaw)

      // 2. Evaluation từng dự án
      const evalEntries = await Promise.allSettled(
        projects
          .filter((p): p is HousingProjectDto & { id: string } => !!p.id)
          .map(async (p) => {
            const res = await housingProjectsApi.getEvaluation(p.id)
            const parsed = parseProjectEvaluation(res)
            return parsed ? ([p.id, parsed] as const) : null
          }),
      )
      const evaluations: Record<string, ProjectApplicationEvaluationDto> = {}
      evalEntries.forEach((r) => {
        if (r.status === 'fulfilled' && r.value) {
          evaluations[r.value[0]] = r.value[1]
        }
      })

      // 3. Đếm hồ sơ theo trạng thái
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

      const allApps = allRes.status === 'fulfilled' ? parsePagedApplications(allRes.value) : []

      // 4. Tổng số căn khả dụng
      const totalUnits = projects.reduce((s, p) => s + (p.availableUnits ?? 0), 0)
      const openProjects = projects.filter((p) => {
        const s = String(p.status || '').toUpperCase()
        return s === 'OPEN' || s.includes('OPEN') || s.includes('RECEIVING')
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

  const totalActionNeeded = data.counts.submitted + data.counts.reviewing
  const totalAllApps = Object.values(data.counts).reduce(
    (s, v, i) => (i >= 3 ? s + Number(v || 0) : s),
    0,
  )

  return (
    <div className="space-y-8 pb-12">
      {/* ── 1. EXECUTIVE HERO CONTROL BANNER ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative overflow-hidden rounded-3xl border border-blue-900/40 bg-gradient-to-br from-slate-900 via-slate-850 to-blue-950 p-6 text-white shadow-2xl lg:p-8"
      >
        {/* Ambient background glow elements */}
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-72 w-72 rounded-full bg-indigo-500/15 blur-3xl" />
        <div className="pointer-events-none absolute right-12 bottom-0 opacity-5">
          <Building2 className="h-64 w-64" />
        </div>

        <div className="relative z-10 flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div className="max-w-2xl space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/20 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-blue-300 backdrop-blur-md border border-blue-400/30">
                <Sparkles className="h-3.5 w-3.5 text-blue-400" />
                Cổng Chủ Đầu Tư
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-[11px] font-semibold text-emerald-300 border border-emerald-500/30">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Hệ thống trực tuyến
              </span>
            </div>

            <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl lg:text-4xl">
              Trung tâm Điều hành &amp; Thẩm định Dự án
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xl">
              Quản lý danh mục nhà ở xã hội, tiếp nhận xét duyệt hồ sơ trực tuyến, điều phối bốc thăm công khai và đồng bộ dữ liệu pháp lý Sở Xây dựng TP.HCM.
            </p>

            {/* Quick Metrics Tags */}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-slate-300">
              <div className="flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-1.5 backdrop-blur-md">
                <Building2 className="h-3.5 w-3.5 text-blue-400" />
                <span><strong>{loading ? '…' : data.counts.totalProjects}</strong> dự án</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-1.5 backdrop-blur-md">
                <Home className="h-3.5 w-3.5 text-emerald-400" />
                <span><strong>{loading ? '…' : data.counts.totalUnits}</strong> căn khả dụng</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-1.5 backdrop-blur-md">
                <Inbox className="h-3.5 w-3.5 text-amber-400" />
                <span><strong>{loading ? '…' : totalActionNeeded}</strong> hồ sơ cần duyệt</span>
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-3 lg:flex-col lg:items-end">
            <Button
              onClick={() => setShowCreate(true)}
              className="h-11 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 px-6 font-bold text-white shadow-lg shadow-blue-500/30 transition-all hover:scale-105 hover:from-blue-600 hover:to-indigo-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              Tạo dự án mới
            </Button>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => navigate('applications')}
                className="h-10 rounded-xl border-white/20 bg-white/10 px-4 text-xs font-semibold text-white backdrop-blur-md hover:bg-white/20 hover:text-white"
              >
                <FileText className="mr-1.5 h-3.5 w-3.5 text-blue-300" />
                Thẩm định hồ sơ
              </Button>
              <button
                type="button"
                onClick={refresh}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white backdrop-blur-md transition hover:bg-white/20"
                title="Làm mới số liệu"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Error alert banner */}
      {error && (
        <div className="flex items-center justify-between rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
          <span>⚠️ {error}</span>
          <button type="button" onClick={refresh} className="font-bold underline text-xs">
            Thử lại
          </button>
        </div>
      )}

      {/* ── 2. KPI METRICS CARDS ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          delay={0.05}
          icon={<Building2 className="h-6 w-6" />}
          label="Dự án của tôi"
          value={loading ? '—' : data.counts.totalProjects}
          badge={loading ? undefined : `${data.counts.openProjects} đang mở bán`}
          sub="Tổng số dự án trên toàn hệ thống"
          tone="blue"
          onClick={() => navigate('projects')}
        />
        <KpiCard
          delay={0.1}
          icon={<Home className="h-6 w-6" />}
          label="Quỹ căn hộ khả dụng"
          value={loading ? '—' : data.counts.totalUnits}
          badge="Sẵn sàng phân phối"
          sub="Tổng số lượng căn hộ cung ứng"
          tone="emerald"
          onClick={() => navigate('projects')}
        />
        <KpiCard
          delay={0.15}
          icon={<Inbox className="h-6 w-6" />}
          label="Hồ sơ chờ thẩm định"
          value={loading ? '—' : totalActionNeeded}
          badge={
            loading
              ? undefined
              : `${data.counts.submitted} mới · ${data.counts.reviewing} đang duyệt`
          }
          sub="Cần thẩm định hồ sơ theo quy định"
          tone="cyan"
          highlight={totalActionNeeded > 0}
          onClick={() => navigate('applications')}
        />
        <KpiCard
          delay={0.2}
          icon={<AlertTriangle className="h-6 w-6" />}
          label="Cần bổ sung & Giải trình"
          value={loading ? '—' : data.counts.needMore}
          badge="Đang chờ công dân"
          sub="Hồ sơ thiếu chứng từ hoặc giấy tờ"
          tone="amber"
          onClick={() => navigate('applications')}
        />
      </div>

      {/* ── 3. URGENT / PRIORITY ACTION BOX ── */}
      {!loading && urgentProjects.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border-2 border-amber-400/80 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-5 sm:p-6 dark:border-amber-500/60 dark:bg-amber-950/20"
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-white shadow-md shadow-amber-500/30">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Dự án cần xử lý &amp; Tổ chức bốc thăm ưu tiên
                </h3>
                <p className="text-xs text-slate-500">
                  Số lượng hồ sơ hợp lệ vượt quá quỹ căn hoặc sắp đến hạn kết thúc tiếp nhận hồ sơ.
                </p>
              </div>
            </div>
            <span className="rounded-full bg-amber-500/20 px-3 py-1 text-xs font-bold text-amber-700 dark:text-amber-300">
              {urgentProjects.length} dự án cần lưu ý
            </span>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {urgentProjects.slice(0, 4).map(({ project, evaluation, scenario, daysToClose }) => (
              <div
                key={project.id}
                onClick={() => navigate('project-detail')}
                className="group flex cursor-pointer items-start justify-between gap-3 rounded-2xl border border-amber-200/80 bg-white/90 p-4 shadow-sm transition hover:border-amber-400 hover:shadow-md dark:border-amber-900/50 dark:bg-slate-900/90"
              >
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
                      {scenario.text}
                    </span>
                    {daysToClose != null && daysToClose >= 0 && (
                      <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                        ⏳ Đóng sau {daysToClose} ngày
                      </span>
                    )}
                  </div>
                  <p className="truncate text-sm font-bold text-slate-900 group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400">
                    {project.projectName || project.name}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-300">
                    <span>Hợp lệ: <strong>{evaluation.totalQualifiedApplications}</strong></span>
                    <span>·</span>
                    <span>Quỹ căn: <strong className="text-blue-600 dark:text-blue-400">{evaluation.availableUnits}</strong></span>
                    {evaluation.priorityCount > 0 && (
                      <>
                        <span>·</span>
                        <span className="font-semibold text-rose-600 dark:text-rose-400">
                          {evaluation.priorityCount} ưu tiên
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-400 transition group-hover:bg-blue-500 group-hover:text-white dark:bg-slate-800">
                  <ChevronRight className="h-4 w-4" />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── 4. ANALYTICS & STATUS DISTRIBUTION ── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: 12-week Trend Chart */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="rounded-3xl border border-slate-200/80 bg-white/90 p-5 sm:p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/90 lg:col-span-2"
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Xu hướng tiếp nhận &amp; Phê duyệt 12 tuần
                </h3>
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                Thống kê động lượng nộp hồ sơ của công dân theo chu kỳ tuần
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 rounded-xl bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                <Send className="h-3.5 w-3.5" />
                Tiếp nhận: {data.weekly.submitted.reduce((a, b) => a + b, 0)}
              </span>
              <span className="flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Đã duyệt: {data.weekly.approved.reduce((a, b) => a + b, 0)}
              </span>
            </div>
          </div>
          <div className="pt-2">
            <AreaChart
              height={220}
              series={[
                { name: 'Tiếp nhận', data: data.weekly.submitted, color: '#3b82f6' },
                { name: 'Đã duyệt', data: data.weekly.approved, color: '#10b981' },
              ]}
            />
          </div>
        </motion.div>

        {/* Right: Application Status Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-3xl border border-slate-200/80 bg-white/90 p-5 sm:p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/90 flex flex-col justify-between"
        >
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  <Activity className="h-4 w-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Phân bổ hồ sơ
                </h3>
              </div>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {totalAllApps} hồ sơ
              </span>
            </div>

            <div className="space-y-3">
              <DistRow
                label="Đã nộp (Mới)"
                value={data.counts.submitted}
                total={totalAllApps}
                gradient={APP_STATUS_GRADIENT.SUBMITTED}
              />
              <DistRow
                label="Đang thẩm định"
                value={data.counts.reviewing}
                total={totalAllApps}
                gradient={APP_STATUS_GRADIENT.REVIEWING}
              />
              <DistRow
                label="Cần bổ sung hồ sơ"
                value={data.counts.needMore}
                total={totalAllApps}
                gradient={APP_STATUS_GRADIENT.NEED_MORE_DOCUMENTS}
              />
              <DistRow
                label="Chờ Sở Xây Dựng"
                value={data.counts.pendingSxd}
                total={totalAllApps}
                gradient={APP_STATUS_GRADIENT.PENDING_SXD_REVIEW}
              />
              <DistRow
                label="Đã phê duyệt"
                value={data.counts.approved}
                total={totalAllApps}
                gradient={APP_STATUS_GRADIENT.APPROVED}
              />
              <DistRow
                label="Từ chối hồ sơ"
                value={data.counts.rejected}
                total={totalAllApps}
                gradient={APP_STATUS_GRADIENT.REJECTED}
              />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>Tỷ lệ duyệt hồ sơ:</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              {data.counts.approved + data.counts.rejected > 0
                ? `${Math.round(
                    (data.counts.approved / (data.counts.approved + data.counts.rejected)) * 100,
                  )}%`
                : '100%'}
            </span>
          </div>
        </motion.div>
      </div>

      {/* ── 5. ACTIVE PROJECTS PORTFOLIO SHOWCASE ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="rounded-3xl border border-slate-200/80 bg-white/90 p-5 sm:p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/90"
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Danh sách Dự án đang điều phối
              </h3>
              <p className="text-xs text-slate-500">
                Theo dõi tình trạng quỹ căn hộ, tiến độ hồ sơ và tình trạng phê duyệt
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('projects')}
            className="rounded-xl text-xs font-bold"
          >
            Xem tất cả dự án <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl border border-slate-100 p-4 dark:border-slate-800">
                <Skeleton className="aspect-[16/10] w-full rounded-2xl" />
                <Skeleton className="mt-3 h-4 w-3/4" />
                <Skeleton className="mt-2 h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : data.projects.length === 0 ? (
          <div className="py-12 text-center">
            <EmptyState
              title="Chưa có dự án nào"
              description="Bạn chưa đăng ký dự án nhà ở xã hội nào. Bắt đầu bằng cách tạo dự án đầu tiên của bạn."
            />
            <Button
              onClick={() => setShowCreate(true)}
              className="mt-4 rounded-xl bg-blue-600 font-semibold text-white shadow-md hover:bg-blue-700"
            >
              <Plus className="mr-1.5 h-4 w-4" /> Tạo dự án ngay
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.projects.slice(0, 6).map((project) => {
              const evalInfo = project.id ? data.evaluations[project.id] : undefined
              const isApproved =
                String(project.status || '').toUpperCase() === 'APPROVED' ||
                String(project.status || '').toUpperCase() === 'OPEN'
              const applied = evalInfo?.totalQualifiedApplications ?? 0
              const units = project.availableUnits ?? 0
              const fillPct = units > 0 ? Math.min(100, Math.round((applied / units) * 100)) : 0
              const firstImg = project.images?.[0]
              const thumb = project.thumbnailUrl || (typeof firstImg === 'string' ? firstImg : (firstImg as any)?.imageUrl)

              return (
                <div
                  key={project.id}
                  className="group flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 transition-all hover:border-blue-400 hover:bg-white hover:shadow-md dark:border-slate-800 dark:bg-slate-850/50 dark:hover:bg-slate-800"
                >
                  <div className="space-y-3">
                    {/* Project Image & Badge */}
                    <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50">
                      {thumb ? (
                        <img
                          src={thumb}
                          alt={project.projectName}
                          className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-900/30 to-slate-850 text-blue-300">
                          <Building2 className="h-12 w-12 opacity-60" />
                        </div>
                      )}
                      <div className="absolute right-2.5 top-2.5">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-bold shadow-md backdrop-blur-md ${
                            isApproved
                              ? 'bg-emerald-500/90 text-white'
                              : 'bg-amber-500/90 text-white'
                          }`}
                        >
                          {project.status || 'Đang mở bán'}
                        </span>
                      </div>
                    </div>

                    <div>
                      <h4 className="line-clamp-1 text-sm font-bold text-slate-900 group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400">
                        {project.projectName || project.name}
                      </h4>
                      <p className="line-clamp-1 text-xs text-slate-500 mt-0.5">
                        📍 {project.ward || project.district || 'TP. Hồ Chí Minh'}
                      </p>
                    </div>

                    {/* Quick Stats Grid */}
                    <div className="grid grid-cols-2 gap-2 rounded-xl bg-white p-2.5 text-xs dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/60">
                      <div>
                        <p className="text-[10px] text-slate-400">Quỹ căn hộ</p>
                        <p className="font-bold text-slate-800 dark:text-slate-200">
                          {units} căn
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400">Hồ sơ đã nộp</p>
                        <p className="font-bold text-blue-600 dark:text-blue-400">
                          {applied} hồ sơ
                        </p>
                      </div>
                    </div>

                    {/* Interest / Demand Meter */}
                    <div>
                      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 mb-1">
                        <span>Tỷ lệ nộp hồ sơ</span>
                        <span className={fillPct >= 100 ? 'text-amber-600 font-bold' : 'text-slate-700 dark:text-slate-300'}>
                          {fillPct}% {fillPct >= 100 ? '(Vượt căn)' : ''}
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                        <div
                          className={`h-full rounded-full transition-all ${
                            fillPct >= 100 ? 'bg-amber-500' : 'bg-blue-500'
                          }`}
                          style={{ width: `${Math.min(100, fillPct)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate('projects')}
                      className="flex-1 rounded-xl text-xs font-semibold h-8"
                    >
                      <Eye className="mr-1 h-3 w-3" /> Chi tiết
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => navigate('applications')}
                      className="flex-1 rounded-xl bg-blue-600 text-xs font-semibold text-white h-8 hover:bg-blue-700"
                    >
                      <FileText className="mr-1 h-3 w-3" /> Duyệt hồ sơ
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </motion.div>

      {/* ── 6. RECENT APPLICATIONS & LIVE NOTIFICATIONS ── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left: Recent Applicants Feed */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-3xl border border-slate-200/80 bg-white/90 p-5 sm:p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/90"
        >
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Users className="h-4 w-4" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Hồ sơ tiếp nhận gần đây
              </h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('applications')}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              Xem tất cả
            </Button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {loading ? (
              Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="flex items-center gap-3 py-3">
                  <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="mt-1.5 h-3 w-24" />
                  </div>
                  <Skeleton className="h-6 w-20 rounded-md" />
                </div>
              ))
            ) : data.recent.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                Chưa có hồ sơ mới nào được nộp vào các dự án của bạn.
              </div>
            ) : (
              data.recent.map((a) => {
                const statusLabel = APP_STATUS_LABEL[a.applicationStatus] || a.applicationStatus
                return (
                  <div
                    key={a.applicationId}
                    onClick={() => navigate('applications')}
                    className="group flex cursor-pointer items-center justify-between gap-3 py-3 transition hover:bg-slate-50/80 dark:hover:bg-slate-800/40 rounded-xl px-2 -mx-2"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-xs font-bold text-white shadow-xs">
                        {(a.applicantFullName || '?').charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-900 group-hover:text-blue-600 dark:text-slate-100 dark:group-hover:text-blue-400">
                          {a.applicantFullName || '(Chưa cập nhật tên)'}
                        </p>
                        <p className="truncate text-xs text-slate-500">
                          {a.projectName || '—'} {a.citizenId ? `· CCCD ${a.citizenId}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="inline-block rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                        {statusLabel}
                      </span>
                      {a.submittedAt && (
                        <p className="mt-0.5 text-[10px] text-slate-400">
                          {formatDate(a.submittedAt)}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </motion.div>

        {/* Right: Operational Notifications Feed */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="rounded-3xl border border-slate-200/80 bg-white/90 p-5 sm:p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/90"
        >
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Bell className="h-4 w-4" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Thông báo &amp; Cảnh báo điều hành
              </h3>
              {unreadCount > 0 && (
                <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-xs">
                  {unreadCount} mới
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs"
                disabled={unreadCount === 0}
                onClick={() => void markAllAsRead()}
                title="Đánh dấu tất cả đã đọc"
              >
                <CheckCheck className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400"
                onClick={() => navigate('notifications')}
              >
                Xem tất cả
              </Button>
            </div>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {notifLoading && notifRecent.length === 0 ? (
              Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="flex items-center gap-3 py-3">
                  <Skeleton className="h-9 w-9 shrink-0 rounded-xl" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="mt-1.5 h-3 w-28" />
                  </div>
                </div>
              ))
            ) : notifRecent.length === 0 ? (
              <div className="py-8 text-center">
                <EmptyState
                  title="Không có thông báo mới"
                  description="Các cập nhật hồ sơ, kết quả thẩm định và sự cố sẽ được hiển thị tại đây."
                />
              </div>
            ) : (
              notifRecent.map((n: NotificationDto) => {
                const tone = notifTypeTone(n.notificationType)
                const toneBg = {
                  default: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
                  success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
                  warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
                  danger: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
                  secondary: 'bg-slate-500/10 text-slate-600 dark:text-slate-400',
                }[tone]

                return (
                  <div
                    key={n.notificationId}
                    onClick={() => {
                      if (!n.isRead) void markAsRead(n.notificationId)
                    }}
                    className={`group flex cursor-pointer items-start gap-3 py-3 transition hover:bg-slate-50/80 dark:hover:bg-slate-800/40 rounded-xl px-2 -mx-2 ${
                      !n.isRead ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''
                    }`}
                  >
                    <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${toneBg}`}>
                      <Bell className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`truncate text-xs ${!n.isRead ? 'font-bold text-slate-900 dark:text-white' : 'font-medium text-slate-700 dark:text-slate-300'}`}>
                          {n.title}
                        </p>
                        <span className="shrink-0 text-[10px] text-slate-400">
                          {timeAgo(n.createdAt)}
                        </span>
                      </div>
                      <p className="line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
                        {n.content}
                      </p>
                    </div>
                    {!n.isRead && (
                      <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-rose-500" />
                    )}
                  </div>
                )
              })
            )}
          </div>
        </motion.div>
      </div>

      {/* Modal tạo dự án */}
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
  badge,
  tone,
  delay,
  highlight,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  sub?: string
  badge?: string
  tone: 'blue' | 'emerald' | 'cyan' | 'amber'
  delay: number
  highlight?: boolean
  onClick?: () => void
}) {
  const toneMap = {
    blue: {
      bg: 'bg-blue-500/10',
      text: 'text-blue-600 dark:text-blue-400',
      border: 'border-blue-200/80 dark:border-blue-900/40',
      hover: 'hover:border-blue-400 hover:shadow-blue-500/10',
    },
    emerald: {
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-600 dark:text-emerald-400',
      border: 'border-emerald-200/80 dark:border-emerald-900/40',
      hover: 'hover:border-emerald-400 hover:shadow-emerald-500/10',
    },
    cyan: {
      bg: 'bg-cyan-500/10',
      text: 'text-cyan-600 dark:text-cyan-400',
      border: 'border-cyan-200/80 dark:border-cyan-900/40',
      hover: 'hover:border-cyan-400 hover:shadow-cyan-500/10',
    },
    amber: {
      bg: 'bg-amber-500/10',
      text: 'text-amber-600 dark:text-amber-400',
      border: 'border-amber-200/80 dark:border-amber-900/40',
      hover: 'hover:border-amber-400 hover:shadow-amber-500/10',
    },
  } as const

  const t = toneMap[tone]

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      onClick={onClick}
      className={`group relative flex flex-col justify-between rounded-3xl border bg-white/90 p-5 sm:p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg dark:bg-slate-900/90 cursor-pointer ${
        t.border
      } ${t.hover} ${highlight ? 'ring-2 ring-blue-500/30' : ''}`}
    >
      <div>
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {label}
          </p>
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-2xl ${t.bg} ${t.text} transition-transform duration-200 group-hover:scale-110 shadow-xs`}
          >
            {icon}
          </div>
        </div>

        <div className="mt-3">
          <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            {value}
          </p>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1">
        {badge && (
          <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {badge}
          </span>
        )}
        {sub && <p className="text-[11px] text-slate-400 line-clamp-1">{sub}</p>}
      </div>
    </motion.div>
  )
}

function DistRow({
  label,
  value,
  total,
  gradient,
}: {
  label: string
  value: number
  total: number
  gradient?: string
}) {
  const g = gradient ?? DEFAULT_GRADIENT
  const pct = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-300">
          <span className={`h-2 w-2 rounded-full bg-gradient-to-r ${g}`} />
          {label}
        </span>
        <div className="flex items-center gap-2 font-semibold">
          <span className="text-slate-900 dark:text-white">{value}</span>
          <span className="text-[10px] text-slate-400 font-normal">({pct}%)</span>
        </div>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${g} transition-all duration-500`}
          style={{ width: `${Math.max(value > 0 ? 4 : 0, pct)}%` }}
        />
      </div>
    </div>
  )
}

