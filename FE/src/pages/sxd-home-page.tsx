import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Building2,
  CheckCircle2,
  CheckSquare,
  ChevronRight,
  FileText,
  Inbox,
  Radio,
  RefreshCw,
  Send,
  Sparkles,
  TrendingUp,
} from 'lucide-react'
import {
  housingApplicationsApi,
  parsePagedApplications,
} from '@/api/housing-applications'
import {
  housingProjectsApi,
} from '@/api/housing-projects'
import { AreaChart } from '@/components/ui/area-chart'
import { Button } from '@/components/ui/button'
import { navigate } from '@/hooks/useHashRoute'
import { formatError } from '@/lib/format-error'
import { countFromPaged, extractProjects } from '@/lib/parsers'
import type { ApplicationSummaryDto, HousingProjectDto } from '@/types'

// ──────────────────────────────────────────────────────────────────────────────
// Helpers & Mapping
// ──────────────────────────────────────────────────────────────────────────────

function buildWeekly(
  apps: ApplicationSummaryDto[],
  filterFn?: (a: ApplicationSummaryDto) => boolean,
): number[] {
  const weeks = new Array<number>(12).fill(0)
  const now = Date.now()
  const ONE_WEEK = 7 * 24 * 60 * 60 * 1000

  for (const app of apps) {
    if (filterFn && !filterFn(app)) continue
    const dateStr = app.submittedAt || (app as any).createdAt
    if (!dateStr) continue
    const t = new Date(dateStr).getTime()
    if (isNaN(t)) continue
    const diff = now - t
    if (diff < 0) continue
    const weekIdx = 11 - Math.floor(diff / ONE_WEEK)
    if (weekIdx >= 0 && weekIdx < 12) {
      weeks[weekIdx]++
    }
  }
  return weeks
}

const DEFAULT_GRADIENT = 'from-amber-500 to-amber-600'

// ──────────────────────────────────────────────────────────────────────────────
// Main SXD Home Page Component
// ──────────────────────────────────────────────────────────────────────────────

export function SxdHomePage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const [data, setData] = useState<{
    projects: HousingProjectDto[]
    counts: {
      totalProjects: number
      openProjects: number
      totalUnits: number
      pendingSxd: number
      approved: number
      rejected: number
      needMore: number
      submitted: number
      reviewing: number
    }
    weekly: {
      submitted: number[]
      approved: number[]
    }
  }>({
    projects: [],
    counts: {
      totalProjects: 0,
      openProjects: 0,
      totalUnits: 0,
      pendingSxd: 0,
      approved: 0,
      rejected: 0,
      needMore: 0,
      submitted: 0,
      reviewing: 0,
    },
    weekly: {
      submitted: new Array(12).fill(0),
      approved: new Array(12).fill(0),
    },
  })

  const refresh = useCallback(() => {
    setLoading(true)
    setError(null)
    setReloadKey((k) => k + 1)
  }, [])

  const load = useCallback(async () => {
    try {
      const projectsRes = await housingProjectsApi.list({ pageSize: 100 })
      const projects: HousingProjectDto[] = extractProjects(projectsRes)

      const [
        pendingSxdRes,
        approvedRes,
        rejectedRes,
        needMoreRes,
        submittedRes,
        reviewingRes,
        allRes,
      ] = await Promise.allSettled([
        housingApplicationsApi.getAll({ pageSize: 1, status: 'PENDING_SXD_REVIEW' }),
        housingApplicationsApi.getAll({ pageSize: 1, status: 'APPROVED' }),
        housingApplicationsApi.getAll({ pageSize: 1, status: 'REJECTED' }),
        housingApplicationsApi.getAll({ pageSize: 1, status: 'NEED_MORE_DOCUMENTS' }),
        housingApplicationsApi.getAll({ pageSize: 1, status: 'SUBMITTED' }),
        housingApplicationsApi.getAll({ pageSize: 1, status: 'REVIEWING' }),
        housingApplicationsApi.getSxdDashboard({ pageSize: 1000 }),
      ])

      const allApps = allRes.status === 'fulfilled' ? parsePagedApplications(allRes.value) : []

      const totalUnits = projects.reduce((s, p) => s + (p.availableUnits ?? 0), 0)
      const openProjects = projects.filter((p) => {
        const s = String(p.status || '').toUpperCase()
        return s === 'OPEN' || s.includes('OPEN') || s.includes('RECEIVING')
      }).length

      setData({
        projects,
        counts: {
          totalProjects: projects.length,
          openProjects,
          totalUnits,
          pendingSxd: pendingSxdRes.status === 'fulfilled' ? countFromPaged(pendingSxdRes.value) : 0,
          approved: approvedRes.status === 'fulfilled' ? countFromPaged(approvedRes.value) : 0,
          rejected: rejectedRes.status === 'fulfilled' ? countFromPaged(rejectedRes.value) : 0,
          needMore: needMoreRes.status === 'fulfilled' ? countFromPaged(needMoreRes.value) : 0,
          submitted: submittedRes.status === 'fulfilled' ? countFromPaged(submittedRes.value) : 0,
          reviewing: reviewingRes.status === 'fulfilled' ? countFromPaged(reviewingRes.value) : 0,
        },
        weekly: {
          submitted: buildWeekly(allApps),
          approved: buildWeekly(allApps, (a) => a.applicationStatus === 'APPROVED'),
        },
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

  const totalAll = useMemo(() => {
    return (
      data.counts.pendingSxd +
      data.counts.approved +
      data.counts.rejected +
      data.counts.needMore +
      data.counts.reviewing +
      data.counts.submitted
    )
  }, [data.counts])

  const approvalRate = useMemo(() => {
    const processed = data.counts.approved + data.counts.rejected
    if (processed <= 0) return 0
    return Math.round((data.counts.approved / processed) * 100)
  }, [data.counts.approved, data.counts.rejected])

  return (
    <div className="w-full space-y-8 pb-12">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl border border-amber-500/20 bg-gradient-to-br from-slate-900 via-amber-950/40 to-slate-950 p-6 sm:p-8 text-white shadow-xl shadow-amber-950/10"
      >
        <div className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full bg-amber-500/15 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-1/4 h-56 w-56 rounded-full bg-orange-600/10 blur-3xl" />

        <div className="relative z-10 flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div className="space-y-3 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 px-3 py-1 text-xs font-bold text-amber-300 border border-amber-500/30 backdrop-blur-md">
                <Sparkles className="h-3.5 w-3.5" />
                CƠ QUAN QUẢN LÝ NHÀ NƯỚC
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2.5 py-1 text-xs font-semibold text-emerald-300 border border-emerald-500/30">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                SỞ XÂY DỰNG TP. HỒ CHÍ MINH
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white">
              Trung tâm Quản lý &amp; Giám sát Nhà ở Xã hội
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl">
              Phê duyệt quy hoạch &amp; hồ sơ pháp lý NOXH, thẩm định hồ sơ công dân mua/thuê, giám sát quy trình bốc thăm minh bạch và đồng bộ hợp đồng nhà ở toàn địa bàn Thành phố.
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-slate-300">
              <div className="flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-1.5 backdrop-blur-md">
                <Building2 className="h-3.5 w-3.5 text-amber-400" />
                <span><strong>{loading ? '…' : data.counts.totalProjects}</strong> dự án trên địa bàn</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-1.5 backdrop-blur-md">
                <Inbox className="h-3.5 w-3.5 text-orange-400" />
                <span><strong>{loading ? '…' : data.counts.pendingSxd}</strong> hồ sơ chờ Sở duyệt</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-1.5 backdrop-blur-md">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                <span><strong>{loading ? '…' : data.counts.approved}</strong> hồ sơ đã cấp quyền</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 lg:flex-col lg:items-end shrink-0">
            <Button
              onClick={() => navigate('applications')}
              className="h-11 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 px-6 font-bold text-white shadow-lg shadow-amber-500/30 transition-all hover:scale-105 hover:from-amber-600 hover:to-orange-700"
            >
              <FileText className="mr-2 h-4 w-4" />
              Thẩm định hồ sơ SXD
            </Button>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => navigate('sxd-projects')}
                className="h-10 rounded-xl border-white/20 bg-white/10 px-4 text-xs font-semibold text-white backdrop-blur-md hover:bg-white/20 hover:text-white"
              >
                <CheckSquare className="mr-1.5 h-3.5 w-3.5 text-amber-300" />
                Duyệt dự án
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('lottery-live')}
                className="h-10 rounded-xl border-white/20 bg-white/10 px-4 text-xs font-semibold text-white backdrop-blur-md hover:bg-white/20 hover:text-white"
              >
                <Radio className="mr-1.5 h-3.5 w-3.5 text-rose-400" />
                Bốc thăm trực tiếp
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

      {error && (
        <div className="flex items-center justify-between rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
          <span>⚠️ {error}</span>
          <button type="button" onClick={refresh} className="font-bold underline text-xs">
            Thử lại
          </button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          delay={0.05}
          icon={<Inbox className="h-6 w-6" />}
          label="Hồ sơ chờ Sở duyệt"
          value={loading ? '…' : data.counts.pendingSxd}
          badge={data.counts.pendingSxd > 0 ? 'Cần xử lý ngay' : 'Đã giải quyết xong'}
          sub="Hồ sơ do Chủ đầu tư đã sơ duyệt trình lên"
          tone="amber"
          highlight={data.counts.pendingSxd > 0}
          onClick={() => navigate('applications')}
        />

        <KpiCard
          delay={0.1}
          icon={<Building2 className="h-6 w-6" />}
          label="Dự án NOXH quản lý"
          value={loading ? '…' : data.counts.totalProjects}
          badge={`${data.counts.openProjects} đang mở tiếp nhận`}
          sub="Tổng số dự án trên toàn địa bàn TP.HCM"
          tone="blue"
          onClick={() => navigate('sxd-projects')}
        />

        <KpiCard
          delay={0.15}
          icon={<BadgeCheck className="h-6 w-6" />}
          label="Hồ sơ đã phê duyệt"
          value={loading ? '…' : data.counts.approved}
          badge={`${approvalRate}% tỉ lệ duyệt thành công`}
          sub="Công dân đủ điều kiện nhận quyền mua/thuê"
          tone="emerald"
          onClick={() => navigate('applications')}
        />

        <KpiCard
          delay={0.2}
          icon={<AlertTriangle className="h-6 w-6" />}
          label="Hồ sơ từ chối / Không đạt"
          value={loading ? '…' : data.counts.rejected}
          badge="Không đủ điều kiện"
          sub="Không thỏa tiêu chuẩn theo Luật Nhà ở"
          tone="rose"
          onClick={() => navigate('applications')}
        />
      </div>

      {data.counts.pendingSxd > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-amber-200 bg-amber-50/70 p-5 dark:border-amber-900/50 dark:bg-amber-950/20"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-5 w-5 animate-pulse" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                  Nhiệm vụ trọng tâm: Có {data.counts.pendingSxd} hồ sơ đang đợi phê duyệt thẩm quyền Sở Xây Dựng
                </h3>
                <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                  Các hồ sơ đã được Chủ đầu tư thẩm định ban đầu và chuyển tiếp lên Sở Xây Dựng để tiến hành hậu kiểm &amp; ban hành quyết định phê duyệt cuối cùng.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => navigate('applications')}
              className="rounded-xl bg-amber-600 font-bold text-white shadow-md shadow-amber-500/20 hover:bg-amber-700 shrink-0"
            >
              Phê duyệt ngay <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </div>
        </motion.div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="lg:col-span-2 rounded-3xl border border-slate-200/80 bg-white/90 p-5 sm:p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/90"
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
                <TrendingUp className="h-5 w-5 text-amber-500" />
                Động lượng Trình &amp; Phê duyệt Hồ sơ 12 tuần
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Thống kê số lượng hồ sơ được chuyển lên Sở và tiến độ ra quyết định
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-2.5 py-1 font-bold text-amber-600 dark:text-amber-400">
                <Send className="h-3 w-3" /> Trình SXD: {data.weekly.submitted.reduce((a, b) => a + b, 0)}
              </span>
              <span className="flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-2.5 py-1 font-bold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-3 w-3" /> Đã duyệt: {data.weekly.approved.reduce((a, b) => a + b, 0)}
              </span>
            </div>
          </div>

          <div className="-mx-2">
            <AreaChart
              height={220}
              series={[
                { name: 'Trình SXD', data: data.weekly.submitted, color: '#f59e0b' },
                { name: 'Đã phê duyệt', data: data.weekly.approved, color: '#10b981' },
              ]}
            />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-3xl border border-slate-200/80 bg-white/90 p-5 sm:p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/90 flex flex-col justify-between"
        >
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
                <Activity className="h-5 w-5 text-amber-500" />
                Phân bổ hồ sơ toàn hệ thống
              </h3>
              <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {totalAll} hồ sơ
              </span>
            </div>

            <div className="space-y-3.5">
              <DistRow label="Chờ Sở Xây Dựng duyệt" value={data.counts.pendingSxd} total={totalAll} gradient="from-amber-500 to-amber-600" />
              <DistRow label="Đã phê duyệt đủ điều kiện" value={data.counts.approved} total={totalAll} gradient="from-emerald-500 to-emerald-600" />
              <DistRow label="Đang thẩm định / sơ duyệt" value={data.counts.reviewing} total={totalAll} gradient="from-blue-500 to-indigo-600" />
              <DistRow label="Yêu cầu bổ sung tài liệu" value={data.counts.needMore} total={totalAll} gradient="from-orange-500 to-orange-600" />
              <DistRow label="Từ chối / Không đạt tiêu chuẩn" value={data.counts.rejected} total={totalAll} gradient="from-rose-500 to-rose-600" />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('applications')}
              className="w-full rounded-xl text-xs font-bold hover:bg-amber-50 hover:text-amber-700 dark:hover:bg-slate-800"
            >
              Xem toàn bộ danh sách hồ sơ <ChevronRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </div>
        </motion.div>
      </div>
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
  tone: 'amber' | 'blue' | 'emerald' | 'rose'
  delay: number
  highlight?: boolean
  onClick?: () => void
}) {
  const toneMap = {
    amber: {
      bg: 'bg-amber-500/10',
      text: 'text-amber-600 dark:text-amber-400',
      border: 'border-amber-200/80 dark:border-amber-900/40',
      hover: 'hover:border-amber-400 hover:shadow-amber-500/10',
    },
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
    rose: {
      bg: 'bg-rose-500/10',
      text: 'text-rose-600 dark:text-rose-400',
      border: 'border-rose-200/80 dark:border-rose-900/40',
      hover: 'hover:border-rose-400 hover:shadow-rose-500/10',
    },
  } as const

  const t = toneMap[tone]

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      onClick={onClick}
      className={`group relative flex flex-col justify-between rounded-3xl border bg-white/90 p-5 sm:p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg dark:bg-slate-900/90 cursor-pointer ${t.border
        } ${t.hover} ${highlight ? 'ring-2 ring-amber-500/30' : ''}`}
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
