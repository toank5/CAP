import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  CreditCard,
  Database,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Users,
} from 'lucide-react'
import { adminApi } from '@/api/admin'
import { housingApplicationsApi } from '@/api/housing-applications'
import { housingProjectsApi } from '@/api/housing-projects'
import { Button } from '@/components/ui/button'
import { KpiCard } from '@/components/ui/kpi-card'
import { navigate } from '@/hooks/useHashRoute'
import { isStaffActive, parseStaffList } from '@/lib/admin'
import { countFromPaged } from '@/lib/parsers'

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
        ] = await Promise.allSettled([
          adminApi.getStaffList({ pageSize: 1000 }),
          housingApplicationsApi.getAll({ pageSize: 1 }),
          housingApplicationsApi.getAll({ pageSize: 1, status: 'PENDING_SXD_REVIEW' }),
          housingApplicationsApi.getAll({ pageSize: 1, status: 'APPROVED' }),
          housingApplicationsApi.getAll({ pageSize: 1, status: 'REJECTED' }),
          housingProjectsApi.list({ pageIndex: 1, pageSize: 1 }),
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
        const proj = projectsRes.status === 'fulfilled' ? countFromPaged(projectsRes.value) : 0

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
    },
    {
      label: 'Dự án nhà ở',
      value: loading ? '—' : data.totalProjects,
      hint: `${data.approvedApps} hồ sơ đã duyệt`,
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