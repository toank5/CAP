import { Building2, CreditCard, FileText, LayoutDashboard, Shield, User, Users } from 'lucide-react'
import { useHashRoute, navigate } from '@/hooks/useHashRoute'
import { type RouteId } from '@/router'

interface NavItem {
  route: RouteId
  label: string
  icon: React.ComponentType<{ className?: string }>
  aliases?: RouteId[]
}

const ITEMS: NavItem[] = [
  { route: 'home-admin', label: 'Tổng quan', icon: LayoutDashboard },
  { route: 'admin-staff', label: 'Quản lý cán bộ', icon: Users, aliases: ['create-staff', 'staff-detail'] },
  { route: 'applications', label: 'Hồ sơ đăng ký', icon: FileText, aliases: ['application-detail'] },
  { route: 'projects', label: 'Dự án nhà ở', icon: Building2, aliases: ['create-project', 'project-detail'] },
  { route: 'payments', label: 'Thanh toán', icon: CreditCard, aliases: ['create-payment'] },
  { route: 'dashboard', label: 'Hệ thống', icon: Shield },
  { route: 'profile', label: 'Tài khoản', icon: User, aliases: ['change-password'] },
]

export const ADMIN_SUB_NAV_ROUTES: RouteId[] = [
  'home-admin',
  'admin-staff',
  'create-staff',
  'staff-detail',
  'applications',
  'application-detail',
  'projects',
  'create-project',
  'project-detail',
  'payments',
  'create-payment',
  'dashboard',
  'profile',
  'change-password',
]

function isActive(current: RouteId, item: NavItem): boolean {
  if (current === item.route) return true
  return item.aliases?.includes(current) ?? false
}

export function AdminSubNav() {
  const route = useHashRoute()

  return (
    <nav className="bg-[#003D7A]" aria-label="Điều hướng quản trị">
      <div className="mx-auto flex max-w-7xl overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {ITEMS.map((item) => {
          const active = isActive(route, item)
          const Icon = item.icon
          return (
            <button
              key={item.route}
              type="button"
              onClick={() => navigate(item.route)}
              className={`relative inline-flex shrink-0 items-center gap-2 px-4 py-3 text-sm font-semibold transition-colors ${
                active
                  ? 'bg-white/15 text-white after:absolute after:bottom-0 after:left-2 after:right-2 after:h-0.5 after:rounded-full after:bg-[#FFCD00]'
                  : 'text-white/85 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="whitespace-nowrap">{item.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
