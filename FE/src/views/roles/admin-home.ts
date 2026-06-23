import { adminApi } from '../../api/admin'
import { housingApplicationsApi } from '../../api/housing-applications'
import { housingProjectsApi } from '../../api/housing-projects'
import { paymentApi } from '../../api/payment'
import { usersApi } from '../../api/users'
import {
  activityPanel,
  activityRow,
  buildRolePage,
  countFromPaged,
  extractList,
  setWelcome,
  statCard,
  type QuickAction,
} from './shared'
import { el } from '../../ui/helpers'
import { navigate } from '../../router'

const ACTIONS: QuickAction[] = [
  { title: 'Quản lý cán bộ', desc: 'Thêm, sửa, phân quyền tài khoản cán bộ.', route: 'admin-staff' },
  { title: 'Thêm cán bộ mới', desc: 'Tạo nhanh tài khoản cán bộ.', route: 'create-staff', cta: 'Tạo →' },
  { title: 'Dự án nhà ở', desc: 'Quản lý toàn bộ dự án trên hệ thống.', route: 'projects' },
  { title: 'Tạo dự án', desc: 'Khởi tạo dự án nhà ở xã hội mới.', route: 'create-project', cta: 'Tạo →' },
  { title: 'Hồ sơ đăng ký', desc: 'Theo dõi hồ sơ người dân nộp trên hệ thống.', route: 'applications' },
  { title: 'Thanh toán', desc: 'Giám sát giao dịch VNPay Sandbox.', route: 'payments' },
  { title: 'Bảng điều phối', desc: 'Kiểm tra phiên và quyền hệ thống.', route: 'dashboard' },
  { title: 'Hồ sơ cá nhân', desc: 'Cập nhật thông tin tài khoản admin.', route: 'profile' },
]

export function adminHomeView(): HTMLElement {
  const statsHost = el('div', { class: 'role-stats-inner' },
    statCard('—', 'Cán bộ', 'Đang tải'),
    statCard('—', 'Dự án', 'Đang tải'),
    statCard('—', 'Hồ sơ', 'Đang tải'),
    statCard('—', 'Thanh toán', 'Đang tải'),
  )

  const staffRows = el('div', { class: 'role-activity-list' })
  const staffSection = activityPanel('Cán bộ gần đây', 'Chưa có dữ liệu cán bộ.', staffRows)

  const page = buildRolePage(
    'home-admin',
    'Trung tâm quản trị hệ thống nhà ở xã hội — toàn quyền vận hành nền tảng.',
    statsHost,
    ACTIONS,
    [staffSection],
  )

  const welcome = page.querySelector('.role-welcome') as HTMLElement

  void (async () => {
    const [profile, staff, projects, apps, payments] = await Promise.allSettled([
      usersApi.getProfile(),
      adminApi.getStaffList(),
      housingProjectsApi.list({ pageSize: 1 }),
      housingApplicationsApi.getAll({ pageSize: 1 }).catch(() => null),
      paymentApi.getMyPayments(),
    ])

    if (profile.status === 'fulfilled') {
      const p = profile.value as Record<string, unknown>
      const name = String(p.fullName ?? p.FullName ?? '')
      setWelcome(welcome, name)
    } else {
      setWelcome(welcome)
    }

    const staffCount = staff.status === 'fulfilled' ? extractList(staff.value).length : 0
    const projectCount = projects.status === 'fulfilled' ? countFromPaged(projects.value) : 0
    const appCount = apps.status === 'fulfilled' && apps.value ? countFromPaged(apps.value) : '—'
    const payCount = payments.status === 'fulfilled' ? countFromPaged(payments.value) : 0

    statsHost.replaceChildren(
      statCard(staffCount, 'Cán bộ', 'Trong hệ thống'),
      statCard(projectCount, 'Dự án', 'Đang quản lý'),
      statCard(appCount, 'Hồ sơ', 'Tổng đăng ký'),
      statCard(payCount, 'Thanh toán', 'Giao dịch của bạn'),
    )

    if (staff.status === 'fulfilled') {
      const list = extractList(staff.value).slice(0, 5) as Record<string, unknown>[]
      if (list.length === 0) {
        staffRows.replaceChildren(el('p', { class: 'role-empty' }, 'Chưa có cán bộ nào.'))
      } else {
        staffRows.replaceChildren(
          ...list.map((s) => {
            const id = String(s.id ?? s.Id ?? '')
            const name = String(s.fullName ?? s.FullName ?? '—')
            const email = String(s.email ?? s.Email ?? '')
            const role = String(s.role ?? s.Role ?? '')
            return activityRow(
              name,
              `${email} · ${role}`,
              el('span', { class: 'role-tag' }, 'Cán bộ'),
              () => {
                sessionStorage.setItem('staffId', id)
                navigate('staff-detail')
              },
            )
          }),
        )
      }
    }
  })()

  return page
}
