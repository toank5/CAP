import { Building2, CreditCard, FileText, Heart, Home, User } from 'lucide-react'
import { useHashRoute, navigate } from '@/hooks/useHashRoute'
import { type RouteId } from '@/router'

interface NavItem {
  route: RouteId
  label: string
  icon: React.ComponentType<{ className?: string }>
  aliases?: RouteId[]
}

const ITEMS: NavItem[] = [
  { route: 'home-user', label: 'Trang chủ', icon: Home },
  { route: 'applications', label: 'Hồ sơ đăng ký', icon: FileText, aliases: ['create-application', 'application-detail'] },
  { route: 'quan-tam', label: 'Dự án quan tâm', icon: Heart },
  { route: 'projects', label: 'Dự án nhà ở', icon: Building2, aliases: ['project-detail', 'create-project'] },
  { route: 'payments', label: 'Thanh toán', icon: CreditCard, aliases: ['create-payment'] },
  { route: 'profile', label: 'Tài khoản', icon: User, aliases: ['change-password'] },
]

export const APPLICANT_SUB_NAV_ROUTES: RouteId[] = [
  'home-user',
  'quan-tam',
  'applications',
  'create-application',
  'application-detail',
  'projects',
  'project-detail',
  'create-project',
  'payments',
  'create-payment',
  'profile',
  'change-password',
]

function isActive(current: RouteId, item: NavItem): boolean {
  if (current === item.route) return true
  return item.aliases?.includes(current) ?? false
}

/** Menu ngang xanh dương — kiểu cổng dịch vụ công */
export function ApplicantSubNav() {
  const route = useHashRoute()

  return (
    <nav className="bg-[#005BAC]" aria-label="Điều hướng người dùng">
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
