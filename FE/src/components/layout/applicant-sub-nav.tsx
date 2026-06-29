import { Building2, FileText, Heart, Home, User } from 'lucide-react'
import { useHashRoute, navigate } from '@/hooks/useHashRoute'
import { type RouteId } from '@/router'
import { ROLE_THEMES } from '@/lib/role-theme'

const THEME = ROLE_THEMES.applicant

interface NavItem {
  route: RouteId
  label: string
  icon: React.ComponentType<{ className?: string }>
  aliases?: RouteId[]
}

const ITEMS: NavItem[] = [
  { route: 'home-user', label: 'Trang chủ', icon: Home },
  { route: 'applications', label: 'Hồ sơ', icon: FileText, aliases: ['application-detail'] },
  { route: 'quan-tam', label: 'Dự án quan tâm', icon: Heart },
  { route: 'projects', label: 'Dự án nhà ở', icon: Building2, aliases: ['project-detail', 'create-project'] },
  { route: 'profile', label: 'Tài khoản', icon: User, aliases: ['change-password'] },
]

export const APPLICANT_SUB_NAV_ROUTES: RouteId[] = [
  'home-user',
  'quan-tam',
  'applications',
  'application-detail',
  'projects',
  'project-detail',
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
    <nav className={`${THEME.navBg} text-white`} aria-label="Điều hướng người dùng">
      <div className="mx-auto flex max-w-7xl overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {ITEMS.map((item) => {
          const active = isActive(route, item)
          const Icon = item.icon
          return (
            <button
              key={item.route}
              type="button"
              onClick={() => navigate(item.route)}
              data-active={active}
              className={`relative inline-flex shrink-0 items-center gap-2 px-4 py-3 text-sm font-semibold transition-colors ${
                active
                  ? `${THEME.navActiveBg} ${THEME.navActiveTextColor}`
                  : `${THEME.navTextColor} ${THEME.navBgHover} hover:text-white`
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="whitespace-nowrap">{item.label}</span>
              {active && (
                <span className={`absolute inset-x-2 bottom-0 h-0.5 rounded-full ${THEME.activeBar}`} />
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
