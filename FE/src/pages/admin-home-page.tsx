import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  CreditCard,
  Database,
  Flag,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Users,
} from 'lucide-react'
import { adminApi } from '@/api/admin'
import { Button } from '@/components/ui/button'
import { KpiCard } from '@/components/ui/kpi-card'
import { navigate } from '@/hooks/useHashRoute'
import { parseStaffListResponse, type StaffRow } from '@/lib/admin'

interface DashData {
  totalStaff: number
  activeStaff: number
  inactiveStaff: number
  suspendedStaff: number
  totalApplications: number
  pendingApps: number
  approvedApps: number
  totalProjects: number
  totalApartments: number
  sxdStaff: number
  developerStaff: number
  activeSxd: number
  activeDeveloper: number
}

const STAFF_ROLES = {
  developer: 'Housing Developer',
  sxd: 'Department Of Construction',
} as const

function readRecord(data: unknown): Record<string, unknown> {
  if (!data || typeof data !== 'object') return {}
  const root = data as Record<string, unknown>
  const nested = root.data ?? root.Data
  if (nested && typeof nested === 'object' && !Array.isArray(nested)) return nested as Record<string, unknown>
  return root
}

function readNum(data: unknown, ...keys: string[]): number {
  const row = readRecord(data)
  for (const key of keys) {
    const value = row[key]
    if (typeof value === 'number' && !Number.isNaN(value)) return value
  }
  return 0
}

function tallyStatus(items: StaffRow[]) {
  let active = 0
  let inactive = 0
  let suspended = 0
  for (const item of items) {
    const status = (item.status || '').toLowerCase()
    if (status === 'active') active += 1
    else if (status === 'inactive') inactive += 1
    else if (status === 'suspended') suspended += 1
  }
  return { active, inactive, suspended }
}

async function loadRole(role: string) {
  const data = await adminApi.getStaffList({ pageNumber: 1, pageSize: 100, role })
  return parseStaffListResponse(data)
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
    totalProjects: 0,
    totalApartments: 0,
    sxdStaff: 0,
    developerStaff: 0,
    activeSxd: 0,
    activeDeveloper: 0,
  })

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const [devRes, sxdRes, overviewRes, ratioRes] = await Promise.allSettled([
          loadRole(STAFF_ROLES.developer),
          loadRole(STAFF_ROLES.sxd),
          adminApi.getDashboardOverview(),
          adminApi.getApplicationRatio(),
        ])

        const devList = devRes.status === 'fulfilled' ? devRes.value : null
        const sxdList = sxdRes.status === 'fulfilled' ? sxdRes.value : null
        const devTally = tallyStatus(devList?.items ?? [])
        const sxdTally = tallyStatus(sxdList?.items ?? [])
        const dev = devList?.totalCount ?? devTally.active + devTally.inactive + devTally.suspended
        const sxd = sxdList?.totalCount ?? sxdTally.active + sxdTally.inactive + sxdTally.suspended
        const overview = overviewRes.status === 'fulfilled' ? overviewRes.value : null
        const ratio = ratioRes.status === 'fulfilled' ? ratioRes.value : null
        const approved = readNum(ratio, 'approvedCount', 'ApprovedCount') + readNum(ratio, 'approvedByTimeoutCount', 'ApprovedByTimeoutCount')

        if (!cancelled) {
          setData({
            totalStaff: dev + sxd,
            activeStaff: devTally.active + sxdTally.active,
            inactiveStaff: devTally.inactive + sxdTally.inactive,
            suspendedStaff: devTally.suspended + sxdTally.suspended,
            totalApplications: readNum(ratio, 'totalApplications', 'TotalApplications') || readNum(overview, 'totalApplications', 'TotalApplications'),
            pendingApps: readNum(ratio, 'pendingCount', 'PendingCount'),
            approvedApps: approved,
            totalProjects: readNum(overview, 'totalProjects', 'TotalProjects'),
            totalApartments: readNum(overview, 'totalApartments', 'TotalApartments'),
            sxdStaff: sxd,
            developerStaff: dev,
            activeSxd: sxdTally.active,
            activeDeveloper: devTally.active,
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

  const stats = [
    {
      label: 'Tổng tài khoản cán bộ',
      value: loading ? '—' : data.totalStaff,
      hint: `${data.activeStaff} đang hoạt động`,
      icon: <Users className="h-6 w-6" />,
      accent: 'from-cyan-500 via-sky-500 to-cyan-500',
      accentSoft: 'from-cyan-500/30 via-sky-500/20 to-transparent',
      trend: data.totalStaff > 0 ? { value: `${data.sxdStaff} SXD · ${data.developerStaff} CĐT`, positive: true } : undefined,
    },
    {
      label: 'Đang hoạt động',
      value: loading ? '—' : data.activeStaff,
      hint: `${data.activeDeveloper} CĐT · ${data.activeSxd} SXD · ${data.inactiveStaff} ngừng · ${data.suspendedStaff} tạm khóa`,
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
      hint: `${data.pendingApps} đang xử lý · ${data.approvedApps} đã duyệt`,
      icon: <Database className="h-6 w-6" />,
      accent: 'from-blue-500 via-blue-600 to-cyan-500',
      accentSoft: 'from-blue-500/30 via-blue-600/20 to-transparent',
      trend: data.totalApplications > 0
        ? { value: `${Math.round((data.approvedApps / data.totalApplications) * 100)}% đã duyệt`, positive: true }
        : undefined,
    },
    {
      label: 'Dự án nhà ở',
      value: loading ? '—' : data.totalProjects,
      hint: `${data.totalApartments} căn hộ`,
      icon: <ShieldCheck className="h-6 w-6" />,
      accent: 'from-amber-500 via-orange-500 to-amber-500',
      accentSoft: 'from-amber-500/30 via-orange-500/20 to-transparent',
    },
  ]

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
              <Button size="sm" variant="outline" onClick={() => navigate('admin-issue-reports')} className="rounded-md border-primary/30 bg-white font-semibold text-primary hover:bg-primary/5">
                <Flag className="mr-1 h-3.5 w-3.5 text-rose-600" /> Báo cáo sự cố
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
    </div>
  )
}