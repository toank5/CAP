import { Bell, FolderTree, Home, ListTree, User, Users } from 'lucide-react'
import { useHashRoute, navigate } from '@/hooks/useHashRoute'
import { type RouteId } from '@/router'

interface NavItem {
  route: RouteId
  label: string
  icon: React.ComponentType<{ className?: string }>
  aliases?: RouteId[]
}

const ITEMS: NavItem[] = [
  { route: 'home-admin', label: 'Trang chủ', icon: Home },
  { route: 'admin-staff', label: 'Quản lý cán bộ', icon: Users, aliases: ['create-staff', 'staff-detail'] },
  { route: 'admin-logs', label: 'Log hệ thống', icon: ListTree },
  { route: 'admin-categories', label: 'Quản lý danh mục', icon: FolderTree },
  { route: 'notifications', label: 'Thông báo', icon: Bell },
  { route: 'profile', label: 'Hồ sơ', icon: User, aliases: ['change-password'] },
]

export const ADMIN_SUB_NAV_ROUTES: RouteId[] = [
  'home-admin',
  'admin-staff',
  'create-staff',
  'staff-detail',
  'admin-logs',
  'admin-categories',
  'profile',
  'change-password',
  'notifications',
]

function isActive(current: RouteId, item: NavItem): boolean {
  if (current === item.route) return true
  return item.aliases?.includes(current) ?? false
}

export function AdminSubNav() {
  const route = useHashRoute()

  return (
    <nav aria-label="Điều hướng quản trị">
      <div className="mx-auto flex max-w-[1760px] items-center gap-1 px-4 lg:px-6">
        {ITEMS.map((item) => {
          const active = isActive(route, item)
          const Icon = item.icon
          return (
            <button
              key={item.route}
              type="button"
              onClick={() => navigate(item.route)}
              className={`relative inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? 'bg-white text-slate-900 font-semibold shadow-sm dark:bg-slate-700 dark:text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
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
