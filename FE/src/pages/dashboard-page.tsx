import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Building2,
  FileText,
  TrendingUp,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { housingApplicationsApi, parsePagedApplications } from '@/api/housing-applications'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { KpiSkeleton } from '@/components/ui/skeleton'
import { navigate } from '@/hooks/useHashRoute'
import { getRole, roleHome } from '@/router'
import { formatDate } from '@/lib/utils'

const TREND = [
  { m: 'T1', apps: 120, approved: 78 },
  { m: 'T2', apps: 165, approved: 102 },
  { m: 'T3', apps: 148, approved: 95 },
  { m: 'T4', apps: 210, approved: 140 },
  { m: 'T5', apps: 190, approved: 128 },
  { m: 'T6', apps: 230, approved: 160 },
]

const DISTRIBUTION = [
  { name: 'Quận 9', value: 35, fill: '#005BAC' },
  { name: 'Thủ Đức', value: 28, fill: '#00B4D8' },
  { name: 'Quận 7', value: 22, fill: '#22C55E' },
  { name: 'Khác', value: 15, fill: '#94A3B8' },
]

const ACTIVITY = [
  { text: 'Hồ sơ #A102 chuyển sang thẩm định', time: '5 phút trước' },
  { text: 'Dự án An Bình cập nhật 3 căn trống', time: '1 giờ trước' },
  { text: 'Báo cáo tháng 6 đã sẵn sàng', time: 'Hôm qua' },
]

function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  delay,
}: {
  label: string
  value: string | number
  hint?: string
  icon: React.ComponentType<{ className?: string }>
  delay: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      whileHover={{ y: -4 }}
      className="glass-card p-6"
    >
      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-accent/15 dark:text-accent">
          <Icon className="h-5 w-5" />
        </div>
        <ArrowUpRight className="h-4 w-4 text-slate-400" />
      </div>
      <p className="mt-4 text-3xl font-bold tracking-tight">{value}</p>
      <p className="mt-1 text-sm font-medium text-slate-700 dark:text-slate-300">{label}</p>
      {hint && <p className="mt-1 text-xs text-success">{hint}</p>}
    </motion.div>
  )
}

export function DashboardPage() {
  const role = getRole()
  const home = roleHome(role)

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-apps'],
    queryFn: () => housingApplicationsApi.getMy({ pageSize: 5 }),
    retry: false,
  })

  const apps = parsePagedApplications(data)
  const pending = apps.filter((a) => a.applicationStatus === 'UNDER_REVIEW' || a.applicationStatus === 'SUBMITTED').length

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-xs font-bold uppercase tracking-widest text-accent">Phân tích thông minh</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Bảng điều khiển</h1>
        <p className="mt-2 text-slate-500">
          {role || 'Người dùng'} · Cập nhật thời gian thực ·{' '}
          <button type="button" className="text-primary underline-offset-2 hover:underline" onClick={() => navigate(home)}>
            Về trang chủ vai trò
          </button>
        </p>
      </motion.div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {isLoading ? (
          <>
            <KpiSkeleton />
            <KpiSkeleton />
            <KpiSkeleton />
            <KpiSkeleton />
          </>
        ) : (
          <>
            <KpiCard icon={FileText} label="Hồ sơ của bạn" value={apps.length} hint="+12% tháng này" delay={0} />
            <KpiCard icon={Activity} label="Đang xử lý" value={pending} delay={0.05} />
            <KpiCard icon={Building2} label="Dự án quản lý" value="48" delay={0.1} />
            <KpiCard icon={TrendingUp} label="Tỷ lệ duyệt" value="78%" hint="Chỉ số KPI" delay={0.15} />
          </>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4 text-accent" /> Xu hướng hồ sơ
            </CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={TREND}>
                <defs>
                  <linearGradient id="fillApps" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#005BAC" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#005BAC" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgb(148 163 184 / 0.2)" />
                <XAxis dataKey="m" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Area type="monotone" dataKey="apps" stroke="#005BAC" fill="url(#fillApps)" strokeWidth={2} name="Hồ sơ" />
                <Area type="monotone" dataKey="approved" stroke="#22C55E" fill="transparent" strokeWidth={2} name="Duyệt" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Phân bổ nhà ở</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={DISTRIBUTION} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>
                  {DISTRIBUTION.map((e) => (
                    <Cell key={e.name} fill={e.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">Hồ sơ gần đây</CardTitle>
            <button type="button" className="text-sm font-medium text-primary hover:underline" onClick={() => navigate('applications')}>
              Xem tất cả
            </button>
          </CardHeader>
          <CardContent>
            {apps.length === 0 ? (
              <EmptyState
                title="Chưa có hồ sơ"
                description="Hồ sơ của bạn (nếu có) sẽ hiển thị tại đây."
                actionLabel="Xem dự án"
                onAction={() => navigate('projects')}
              />
            ) : (
              <ul className="space-y-3">
                {apps.map((a) => (
                  <motion.li
                    key={a.applicationId}
                    whileHover={{ x: 4 }}
                    className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-100 p-3 transition hover:border-accent/30 hover:bg-secondary/50 dark:border-slate-800 dark:hover:bg-slate-800/50"
                    onClick={() => {
                      sessionStorage.setItem('applicationId', a.applicationId)
                      navigate('application-detail')
                    }}
                  >
                    <div>
                      <p className="font-medium">{a.projectName}</p>
                      <p className="text-xs text-slate-500">{a.applicationStatus} · {formatDate(a.createdAt)}</p>
                    </div>
                    <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">{a.applicationStatus}</span>
                  </motion.li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Hoạt động gần đây</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4">
              {ACTIVITY.map((item) => (
                <li key={item.text} className="flex gap-3 border-l-2 border-accent/40 pl-4">
                  <div>
                    <p className="text-sm font-medium">{item.text}</p>
                    <p className="text-xs text-slate-500">{item.time}</p>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bản đồ dự án (xem trước)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700">
            <iframe
              title="Bản đồ dự án TP.HCM"
              className="h-64 w-full"
              loading="lazy"
              src="https://maps.google.com/maps?q=Ho+Chi+Minh+City&z=11&output=embed"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
