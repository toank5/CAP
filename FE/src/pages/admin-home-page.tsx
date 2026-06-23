import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Building2, FileText, Shield, UserCheck, Users } from 'lucide-react'
import { adminApi } from '@/api/admin'
import { housingApplicationsApi, parsePagedApplications } from '@/api/housing-applications'
import { housingProjectsApi } from '@/api/housing-projects'
import { GovHeroBanner } from '@/components/layout/gov-hero-banner'
import { Skeleton } from '@/components/ui/skeleton'
import { navigate } from '@/hooks/useHashRoute'
import { parseStaffList } from '@/lib/admin'
import { countFromPaged, extractProjects } from '@/lib/parsers'
import { type RouteId } from '@/router'

interface AdminStat {
  label: string
  value: string | number
  icon: React.ComponentType<{ className?: string }>
  route: RouteId
  hint?: string
}

interface QuickLink {
  title: string
  desc: string
  route: RouteId
  icon: React.ComponentType<{ className?: string }>
  accent: string
}

const QUICK_LINKS: QuickLink[] = [
  {
    title: 'Thêm cán bộ',
    desc: 'Tạo tài khoản Quản lý phường hoặc Cán bộ thẩm định',
    route: 'create-staff',
    icon: UserCheck,
    accent: 'from-[#005BAC] to-[#003D7A]',
  },
  {
    title: 'Tạo dự án nhà ở',
    desc: 'Công bố dự án mới lên cổng thông tin',
    route: 'create-project',
    icon: Building2,
    accent: 'from-[#DA251D] to-[#b81e17]',
  },
  {
    title: 'Theo dõi hồ sơ',
    desc: 'Xem và xử lý hồ sơ đăng ký toàn hệ thống',
    route: 'applications',
    icon: FileText,
    accent: 'from-emerald-600 to-emerald-800',
  },
  {
    title: 'Quản lý cán bộ',
    desc: 'Danh sách, phân quyền và trạng thái tài khoản',
    route: 'admin-staff',
    icon: Users,
    accent: 'from-violet-600 to-violet-800',
  },
]

function StatTile({ stat, index }: { stat: AdminStat; index: number }) {
  const Icon = stat.icon
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      onClick={() => navigate(stat.route)}
      className="gov-card group flex flex-col p-5 text-left transition hover:shadow-lg hover:shadow-primary/15"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="rounded-lg bg-secondary p-2.5 text-primary transition group-hover:bg-primary group-hover:text-white">
          <Icon className="h-5 w-5" />
        </div>
        <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:text-primary" />
      </div>
      <p className="mt-4 text-3xl font-bold text-[#003D7A] dark:text-white">{stat.value}</p>
      <p className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-300">{stat.label}</p>
      {stat.hint && <p className="mt-1 text-xs text-slate-500">{stat.hint}</p>}
    </motion.button>
  )
}

export function AdminHomePage() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ staff: 0, projects: 0, applications: 0, pending: 0 })

  useEffect(() => {
    const load = async () => {
      try {
        const [staffRes, projectsRes, appsRes] = await Promise.all([
          adminApi.getStaffList().catch(() => null),
          housingProjectsApi.list({ pageSize: 1 }).catch(() => null),
          housingApplicationsApi.getAll({ pageSize: 50 }).catch(() => null),
        ])
        const apps = parsePagedApplications(appsRes)
        setStats({
          staff: parseStaffList(staffRes).length,
          projects: countFromPaged(projectsRes) || extractProjects(projectsRes).length,
          applications: countFromPaged(appsRes) || apps.length,
          pending: apps.filter((a) => ['SUBMITTED', 'UNDER_REVIEW'].includes(a.applicationStatus)).length,
        })
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  const statTiles: AdminStat[] = [
    { label: 'Cán bộ', value: loading ? '—' : stats.staff, icon: Users, route: 'admin-staff', hint: 'Quản lý phường & thẩm định' },
    { label: 'Dự án nhà ở', value: loading ? '—' : stats.projects, icon: Building2, route: 'projects' },
    { label: 'Hồ sơ đăng ký', value: loading ? '—' : stats.applications, icon: FileText, route: 'applications' },
    { label: 'Chờ xử lý', value: loading ? '—' : stats.pending, icon: Shield, route: 'applications', hint: 'Đã nộp / thẩm định' },
  ]

  return (
    <div className="space-y-6">
      <GovHeroBanner
        badge="Khu vực quản trị"
        title="Bảng điều khiển hệ thống RHS"
        subtitle="Quản lý cán bộ, dự án nhà ở xã hội và hồ sơ đăng ký — minh bạch, tập trung, theo quy trình nhà nước."
      />

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-36" />)}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {statTiles.map((s, i) => <StatTile key={s.label} stat={s} index={i} />)}
        </div>
      )}

      <div>
        <h2 className="gov-section-title">Thao tác nhanh</h2>
        <p className="mt-1 text-sm text-slate-600">Các chức năng quản trị thường dùng</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {QUICK_LINKS.map((link, i) => {
            const Icon = link.icon
            return (
              <motion.button
                key={link.route}
                type="button"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.05 }}
                onClick={() => navigate(link.route)}
                className="gov-card group overflow-hidden p-0 text-left transition hover:shadow-lg"
              >
                <div className={`bg-gradient-to-r ${link.accent} px-5 py-3`}>
                  <div className="flex items-center gap-2 text-white">
                    <Icon className="h-5 w-5" />
                    <span className="font-bold">{link.title}</span>
                  </div>
                </div>
                <div className="p-5">
                  <p className="text-sm text-slate-600 dark:text-slate-400">{link.desc}</p>
                  <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                    Thực hiện <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                  </span>
                </div>
              </motion.button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
