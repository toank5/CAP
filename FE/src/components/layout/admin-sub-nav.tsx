import { Bell, FolderTree, Home, ListTree, Users } from 'lucide-react'
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

export function AdminSubNav({ inline = false }: { inline?: boolean }) {
  const route = useHashRoute()

  return (
    <nav aria-label="Điều hướng quản trị" className="flex items-center">
      <div className={`flex items-center gap-1 xl:gap-2 ${inline ? '' : 'mx-auto max-w-[1760px] px-4 lg:px-6'}`}>
        {ITEMS.map((item) => {
          const active = isActive(route, item)
          const Icon = item.icon
          return (
            <button
              key={item.route}
              type="button"
              onClick={() => navigate(item.route)}
              className={`relative inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs xl:text-[13px] font-semibold transition-all duration-150 whitespace-nowrap ${active
                  ? 'bg-rose-600 font-bold text-white shadow-md shadow-rose-500/25 dark:bg-rose-600 dark:text-white'
                  : 'text-slate-700 hover:bg-rose-50 hover:text-rose-700 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white'
                }`}
            >
              <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
              <span>{item.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
