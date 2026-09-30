import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  CreditCard,
  Database,
  ShieldCheck,
  Sparkles,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react'
import { adminApi } from '@/api/admin'
import { housingApplicationsApi, parsePagedApplications } from '@/api/housing-applications'
import { housingProjectsApi } from '@/api/housing-projects'
import { Button } from '@/components/ui/button'
import { KpiCard } from '@/components/ui/kpi-card'
import { Sparkline } from '@/components/ui/sparkline'
import { AreaChart } from '@/components/ui/area-chart'
import { navigate } from '@/hooks/useHashRoute'
import { isStaffActive, parseStaffList } from '@/lib/admin'
import { countFromPaged, extractProjects } from '@/lib/parsers'

interface DashData {
  totalStaff: number
  activeStaff: number
  inactiveStaff: number
  suspendedStaff: number
  totalApplications: number
  pendingApps: number
  approvedApps: number
  rejectedApps: number
  totalProjects: number
  sxdStaff: number
  developerStaff: number
  weeklySignups: number[]
  weeklyApplications: number[]
  weeklyProjects: number[]
  hasSignupDates: boolean
  hasApplicationDates: boolean
  hasProjectDates: boolean
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

function hasCreatedAt<T extends { createdAt?: string }>(items: T[]): boolean {
  return items.some((it) => {
    if (!it.createdAt) return false
    return !Number.isNaN(new Date(it.createdAt).getTime())
  })
}

function buildBuckets<T extends { createdAt?: string }>(items: T[], now = Date.now()): number[] {
  const buckets = new Array(12).fill(0)
  if (items.length === 0) return buckets
  const startMs = now - 11 * WEEK_MS
  items.forEach((it) => {
    if (!it.createdAt) return
    const t = new Date(it.createdAt).getTime()
    if (Number.isNaN(t)) return
    const idx = Math.floor((t - startMs) / WEEK_MS)
    if (idx >= 0 && idx < 12) buckets[idx] += 1
  })
  return buckets
}

async function loadRecentPages<T extends { createdAt?: string }>(
  loadPage: (page: number) => Promise<{ total: number; items: T[] }>,
  pageSize: number,
  maxPages: number,
): Promise<{ total: number; items: T[] }> {
  const windowStart = Date.now() - 11 * WEEK_MS
  const items: T[] = []
  let total = 0
  for (let page = 1; page <= maxPages; page++) {
    const batch = await loadPage(page)
    total = batch.total
    items.push(...batch.items)
    if (batch.items.length < pageSize) break
    const times = batch.items
      .map((it) => (it.createdAt ? new Date(it.createdAt).getTime() : Number.NaN))
      .filter((t) => !Number.isNaN(t))
    if (times.length > 0 && Math.min(...times) < windowStart) break
  }
  return { total, items }
}

export function AdminHomePage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<DashData>({
    totalStaff: 0,
    activeStaff: 0,
    inactiveStaff: 0,
    suspendedStaff: 0,
    totalApplications: 0,
    pendingApps: 0,
    approvedApps: 0,
    rejectedApps: 0,
    totalProjects: 0,
    sxdStaff: 0,
    developerStaff: 0,
    weeklySignups: new Array(12).fill(0),
    weeklyApplications: new Array(12).fill(0),
    weeklyProjects: new Array(12).fill(0),
    hasSignupDates: false,
    hasApplicationDates: false,
    hasProjectDates: false,
  })

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const [
          staffRes,
          allAppsRes,
          pendingRes,
          approvedRes,
          rejectedRes,
          projectsRes,
          appsRes,
        ] = await Promise.allSettled([
          adminApi.getStaffList({ pageSize: 1000 }),
          housingApplicationsApi.getAll({ pageSize: 1 }),
          housingApplicationsApi.getAll({ pageSize: 1, status: 'PENDING_SXD_REVIEW' }),
          housingApplicationsApi.getAll({ pageSize: 1, status: 'APPROVED' }),
          housingApplicationsApi.getAll({ pageSize: 1, status: 'REJECTED' }),
          loadRecentPages(
            async (page) => {
              const res = await housingProjectsApi.list({ pageIndex: page, pageSize: 100 })
              return { total: countFromPaged(res), items: extractProjects(res) }
            },
            100,
            5,
          ),
          loadRecentPages(
            async (page) => {
              const res = await housingApplicationsApi.getAll({ pageIndex: page, pageSize: 50 })
              return { total: countFromPaged(res), items: parsePagedApplications(res) }
            },
            50,
            8,
          ),
        ])

        // Staff
        const staffList = staffRes.status === 'fulfilled' ? parseStaffList(staffRes.value) : []
        const active = staffList.filter((s) => isStaffActive(s.status)).length
        const inactive = staffList.filter((s) => s.status?.toLowerCase() === 'inactive').length
        const suspended = staffList.filter((s) => s.status?.toLowerCase() === 'suspended').length
        const sxd = staffList.filter((s) => s.roleName === 'Department Of Construction').length
        const dev = staffList.filter((s) => s.roleName === 'Housing Developer').length

        // Apps
        const allApps = allAppsRes.status === 'fulfilled' ? countFromPaged(allAppsRes.value) : 0
        const pend = pendingRes.status === 'fulfilled' ? countFromPaged(pendingRes.value) : 0
        const appr = approvedRes.status === 'fulfilled' ? countFromPaged(approvedRes.value) : 0
        const rej = rejectedRes.status === 'fulfilled' ? countFromPaged(rejectedRes.value) : 0
        const projectItems = projectsRes.status === 'fulfilled' ? projectsRes.value.items : []
        const applicationItems = appsRes.status === 'fulfilled' ? appsRes.value.items : []
        const proj = projectsRes.status === 'fulfilled' ? projectsRes.value.total : 0

        if (!cancelled) {
          setData({
            totalStaff: staffList.length,
            activeStaff: active,
            inactiveStaff: inactive,
            suspendedStaff: suspended,
            totalApplications: allApps,
            pendingApps: pend,
            approvedApps: appr,
            rejectedApps: rej,
            totalProjects: proj,
            sxdStaff: sxd,
            developerStaff: dev,
            weeklySignups: buildBuckets(staffList),
            weeklyApplications: buildBuckets(applicationItems),
            weeklyProjects: buildBuckets(projectItems),
            hasSignupDates: hasCreatedAt(staffList),
            hasApplicationDates: hasCreatedAt(applicationItems),
            hasProjectDates: hasCreatedAt(projectItems),
          })
          setLoading(false)
        }
      } catch {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const conversionRate = data.totalApplications > 0
    ? Math.round((data.approvedApps / Math.max(data.totalApplications, 1)) * 100)
    : 0

  const stats = [
    {
      label: 'Tổng tài khoản cán bộ',
      value: loading ? '—' : data.totalStaff,
      hint: `${data.activeStaff} đang hoạt động`,
      icon: <Users className="h-6 w-6" />,
      accent: 'from-cyan-500 via-sky-500 to-cyan-500',
      accentSoft: 'from-cyan-500/30 via-sky-500/20 to-transparent',
      trend: data.totalStaff > 0 ? { value: `${data.sxdStaff} SXD · ${data.developerStaff} CĐT`, positive: true } : undefined,
      sparkline: data.hasSignupDates ? (
        <Sparkline stroke="rgb(6 182 212)" fill="rgb(6 182 212)" data={data.weeklySignups} />
      ) : undefined,
    },
    {
      label: 'Đang hoạt động',
      value: loading ? '—' : data.activeStaff,
      hint: `${data.inactiveStaff} ngừng · ${data.suspendedStaff} tạm khóa`,
      icon: <UserCheck className="h-6 w-6" />,
      accent: 'from-emerald-500 via-teal-500 to-emerald-500',
      accentSoft: 'from-emerald-500/30 via-teal-500/20 to-transparent',
      trend: data.totalStaff > 0
        ? { value: `${Math.round((data.activeStaff / data.totalStaff) * 100)}% tổng`, positive: true }
        : undefined,
    },
    {
      label: 'Tổng hồ sơ',
      value: loading ? '—' : data.totalApplications,
      hint: `${data.pendingApps} chờ SXD duyệt`,
      icon: <Database className="h-6 w-6" />,
      accent: 'from-blue-500 via-blue-600 to-cyan-500',
      accentSoft: 'from-blue-500/30 via-blue-600/20 to-transparent',
      trend: data.totalApplications > 0 ? { value: `Tỉ lệ duyệt: ${conversionRate}%`, positive: true } : undefined,
      sparkline: data.hasApplicationDates ? (
        <Sparkline stroke="rgb(139 92 246)" fill="rgb(139 92 246)" data={data.weeklyApplications} />
      ) : undefined,
    },
    {
      label: 'Dự án nhà ở',
      value: loading ? '—' : data.totalProjects,
      hint: `${data.approvedApps} hồ sơ đã duyệt`,
      icon: <ShieldCheck className="h-6 w-6" />,
      accent: 'from-amber-500 via-orange-500 to-amber-500',
      accentSoft: 'from-amber-500/30 via-orange-500/20 to-transparent',
      sparkline: data.hasProjectDates ? (
        <Sparkline stroke="rgb(245 158 11)" fill="rgb(245 158 11)" data={data.weeklyProjects} />
      ) : undefined,
    },
  ]

  const chartSeries = [
    data.hasSignupDates ? { name: 'Tài khoản mới', data: data.weeklySignups, color: '#f59e0b' } : null,
    data.hasApplicationDates ? { name: 'Hồ sơ mới', data: data.weeklyApplications, color: '#8b5cf6' } : null,
    data.hasProjectDates ? { name: 'Dự án mới', data: data.weeklyProjects, color: '#06b6d4' } : null,
  ].filter((series): series is { name: string; data: number[]; color: string } => series != null)

  return (
    <div className="space-y-6">
      {/* Hero panel */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-sky-50 via-white to-cyan-50 p-6 text-slate-900 shadow-[0_18px_50px_-18px_rgb(15_23_42_/_20%)] dark:border-slate-700 dark:from-slate-100 dark:via-white dark:to-slate-100 dark:text-slate-900"
      >
        <div className="led-strip absolute inset-x-0 top-0" aria-hidden />
        <div aria-hidden className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-cyan-300/40 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-32 -left-10 h-64 w-64 rounded-full bg-sky-300/40 blur-3xl" />
        <div className="relative">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.16em] text-primary backdrop-blur-md">
              <Sparkles className="h-3 w-3 text-primary" />
              Trung tâm điều hành · System Administrator
            </span>
            <h1 className="mt-3 text-2xl font-extrabold leading-tight text-[#003D7A] md:text-3xl dark:text-[#003D7A]">
              Quản lý tài khoản hệ thống
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-600">
              Giám sát tài khoản Chủ đầu tư, Sở Xây dựng và người dùng.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" onClick={() => navigate('admin-staff')} className="glow-cta rounded-md bg-gradient-to-r from-cyan-500 to-sky-500 font-bold text-white shadow-lg shadow-cyan-500/30 hover:from-cyan-600 hover:to-sky-600">
                Quản lý <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
              <Button size="sm" variant="outline" onClick={() => navigate('create-staff')} className="rounded-md border-primary/30 bg-white font-semibold text-primary hover:bg-primary/5">
                <UserCheck className="mr-1 h-3.5 w-3.5" /> Thêm tài khoản
              </Button>
              <Button size="sm" variant="outline" onClick={() => navigate('admin-transactions')} className="rounded-md border-primary/30 bg-white font-semibold text-primary hover:bg-primary/5">
                <CreditCard className="mr-1 h-3.5 w-3.5 text-emerald-600" /> Lịch sử thanh toán
              </Button>
            </div>
          </div>
        </div>
      </motion.section>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s, i) => (
          <KpiCard key={s.label} {...s} className={`anim-up anim-up-d${Math.min(i + 1, 4)}`} />
        ))}
      </div>

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="relative overflow-hidden rounded-2xl border border-white/60 bg-white/85 shadow-[0_18px_50px_-18px_rgb(15_23_42_/_25%)] backdrop-blur-md dark:border-slate-700/70 dark:bg-slate-900/70"
      >
        <div className="led-strip absolute inset-x-0 top-0" aria-hidden />
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-primary/10 px-5 py-4 dark:border-slate-800">
          <div>
            <h2 className="gov-section-title">Phát sinh 12 tuần qua</h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Số tài khoản cán bộ, hồ sơ và dự án mới theo tuần, tính từ ngày tạo trên hệ thống.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {data.hasSignupDates && (
              <span className="chip-glass">
                <UserPlus className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                Tài khoản · {data.weeklySignups.reduce((a, b) => a + b, 0)}
              </span>
            )}
            {data.hasApplicationDates && (
              <span className="chip-glass">
                <Database className="h-3 w-3 text-violet-600 dark:text-violet-400" />
                Hồ sơ · {data.weeklyApplications.reduce((a, b) => a + b, 0)}
              </span>
            )}
            {data.hasProjectDates && (
              <span className="chip-glass">
                <ShieldCheck className="h-3 w-3 text-cyan-600 dark:text-cyan-400" />
                Dự án · {data.weeklyProjects.reduce((a, b) => a + b, 0)}
              </span>
            )}
          </div>
        </div>
        <div className="p-5">
          {chartSeries.length > 0 ? (
            <AreaChart height={260} series={chartSeries} />
          ) : (
            <p className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
              Chưa có ngày tạo để vẽ biểu đồ 12 tuần.
            </p>
          )}
        </div>
      </motion.section>
    </div>
  )
}