import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, UserCheck, Users } from 'lucide-react'
import { adminApi } from '@/api/admin'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { navigate } from '@/hooks/useHashRoute'
import { isStaffActive, parseStaffList } from '@/lib/admin'
import { ROLE_THEMES } from '@/lib/role-theme'

export function AdminHomePage() {
  const theme = ROLE_THEMES.admin
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ total: 0, active: 0 })

  useEffect(() => {
    const load = async () => {
      try {
        const data = await adminApi.getStaffList({ pageSize: 1000 }).catch(() => null)
        const list = parseStaffList(data)
        setStats({
          total: list.length,
          active: list.filter((s) => isStaffActive(s.status)).length,
        })
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#003D7A] dark:text-white">Quản lý tài khoản hệ thống</h1>
        <p className="mt-1 text-sm text-slate-600">Quản trị viên chỉ phụ trách tạo, cập nhật, phân quyền và vô hiệu hoá tài khoản cán bộ.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="gov-card flex items-center gap-4 p-5"
        >
          <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${theme.activeBar} text-slate-900`}>
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tổng tài khoản cán bộ</p>
            <p className="text-3xl font-extrabold text-[#003D7A]">
              {loading ? '—' : stats.total}
            </p>
            {loading ? <Skeleton className="mt-1 h-3 w-24" /> : (
              <p className="mt-0.5 text-xs text-slate-500">{stats.active} đang hoạt động</p>
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="gov-card flex items-center gap-4 p-5"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
            <UserCheck className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Đang hoạt động</p>
            <p className="text-3xl font-extrabold text-[#003D7A]">
              {loading ? '—' : stats.active}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">Đăng nhập và xử lý hồ sơ</p>
          </div>
        </motion.div>
      </div>

      <div>
        <h2 className="gov-section-title">Thao tác nhanh</h2>
        <p className="mt-1 text-sm text-slate-600">Mọi chức năng đều xoay quanh tài khoản cán bộ trong hệ thống.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <motion.button
            type="button"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => navigate('admin-staff')}
            className="gov-card group overflow-hidden p-0 text-left transition hover:shadow-lg"
          >
            <div className={`bg-gradient-to-r ${theme.navBg.replace('bg-', 'from-').replace('/85', '')} to-[#003D7A] px-5 py-3`}>
              <div className="flex items-center gap-2 text-white">
                <Users className="h-5 w-5" />
                <span className="font-bold">Danh sách cán bộ</span>
              </div>
            </div>
            <div className="p-5">
              <p className="text-sm text-slate-600">Xem, sửa, khóa và đặt lại mật khẩu tài khoản cán bộ.</p>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                Mở danh sách <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
              </span>
            </div>
          </motion.button>

          <motion.button
            type="button"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            onClick={() => navigate('create-staff')}
            className="gov-card group overflow-hidden p-0 text-left transition hover:shadow-lg"
          >
            <div className="bg-gradient-to-r from-[#005BAC] to-[#003D7A] px-5 py-3">
              <div className="flex items-center gap-2 text-white">
                <UserCheck className="h-5 w-5" />
                <span className="font-bold">Thêm cán bộ mới</span>
              </div>
            </div>
            <div className="p-5">
              <p className="text-sm text-slate-600">Tạo tài khoản Ward Manager hoặc Verification Officer.</p>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                Tạo tài khoản <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
              </span>
            </div>
          </motion.button>
        </div>
      </div>

      <div className="rounded-2xl border border-dashed border-slate-200 bg-secondary/30 p-5 dark:border-slate-700 dark:bg-slate-900/30">
        <p className="text-sm text-slate-600">
          <strong className="text-[#003D7A]">Phạm vi quyền Admin:</strong> chỉ quản lý tài khoản cán bộ (thêm, sửa, phân quyền, khóa/mở, đặt lại mật khẩu). Các nghiệp vụ khác (dự án, hồ sơ, thanh toán) do Ward Manager và Verification Officer phụ trách.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={() => navigate('admin-staff')}
        >
          Đến trang quản lý cán bộ
        </Button>
      </div>
    </div>
  )
}
