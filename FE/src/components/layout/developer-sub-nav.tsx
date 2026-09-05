import {
  Home,
  FileText,
  Building2,
  Gavel,
  Radio,
  FileSignature,
} from 'lucide-react'
import { useHashRoute, navigate } from '@/hooks/useHashRoute'
import { type RouteId } from '@/router'

interface NavItem {
  route: RouteId
  label: string
  icon: React.ComponentType<{ className?: string }>
  aliases?: RouteId[]
}

const ITEMS: NavItem[] = [
  { route: 'home-developer', label: 'Trang chủ', icon: Home },
  {
    route: 'applications',
    label: 'Thẩm định hồ sơ',
    icon: FileText,
    aliases: ['application-detail'],
  },
  {
    route: 'projects',
    label: 'Dự án',
    icon: Building2,
    aliases: ['project-detail', 'create-project'],
  },
  {
    route: 'lottery-sessions',
    label: 'Bốc thăm',
    icon: Gavel,
    aliases: ['my-lottery'],
  },
  {
    route: 'lottery-live',
    label: 'Bốc thăm trực tiếp',
    icon: Radio,
  },
  {
    route: 'contracts',
    label: 'Hợp đồng',
    icon: FileSignature,
    aliases: ['contract-detail', 'contract-create'],
  },
]

// Tất cả route của Housing Developer dùng sub-nav này.
export const DEVELOPER_SUB_NAV_ROUTES: RouteId[] = [
  'home-developer',
  'applications',
  'application-detail',
  'projects',
  'project-detail',
  'create-project',
  'lottery-sessions',
  'lottery-live',
  'my-lottery',
  'contracts',
  'contract-detail',
  'contract-create',
  'dashboard',
  'profile',
  'change-password',
  'notifications',
  'report-issue',
]

function isActive(current: RouteId, item: NavItem): boolean {
  if (current === item.route) return true
  return item.aliases?.includes(current) ?? false
}

/** Menu điều hướng dành cho Chủ đầu tư (hỗ trợ hiển thị trên TopNav). */
export function DeveloperSubNav({ inline = false }: { inline?: boolean }) {
  const route = useHashRoute()

  return (
    <nav aria-label="Điều hướng chủ đầu tư" className="flex items-center">
      <div className={`flex items-center gap-1 xl:gap-2 ${inline ? '' : 'mx-auto max-w-[1760px] px-4 lg:px-6'}`}>
        {ITEMS.map((item) => {
          const active = isActive(route, item)
          const Icon = item.icon
          return (
            <button
              key={item.route}
              type="button"
              onClick={() => navigate(item.route)}
              className={`relative inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs xl:text-[13px] font-semibold transition-all duration-150 whitespace-nowrap ${
                active
                  ? 'bg-blue-600 font-bold text-white shadow-md shadow-blue-500/25 dark:bg-blue-600 dark:text-white'
                  : 'text-slate-700 hover:bg-blue-50 hover:text-blue-700 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white'
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