import {
  Home,
  FileText,
  Gavel,
  Radio,
  FileSignature,
  CheckSquare,
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
  { route: 'home-sxd', label: 'Trang chủ', icon: Home },
  {
    route: 'applications',
    label: 'Thẩm định hồ sơ',
    icon: FileText,
    aliases: ['application-detail'],
  },
  {
    route: 'sxd-projects',
    label: 'Duyệt dự án',
    icon: CheckSquare,
    aliases: ['sxd-project-detail'],
  },
  {
    route: 'lottery-sessions',
    label: 'Bốc thăm',
    icon: Gavel,
    aliases: ['lottery-detail'],
  },
  { route: 'lottery-live', label: 'Quay số trực tiếp', icon: Radio },
  {
    route: 'contracts',
    label: 'Hợp đồng',
    icon: FileSignature,
    aliases: ['contract-detail'],
  },
]

// Tất cả route của Sở Xây dựng dùng sub-nav này.
export const SXD_SUB_NAV_ROUTES: RouteId[] = [
  'home-sxd',
  'applications',
  'application-detail',
  'sxd-projects',
  'sxd-project-detail',
  'lottery-sessions',
  'lottery-live',
  'lottery-detail',
  'audit-list',
  'audit-detail',
  'contracts',
  'contract-detail',
  'profile',
  'change-password',
  'notifications',
  'report-issue',
]

function isActive(current: RouteId, item: NavItem): boolean {
  if (current === item.route) return true
  return item.aliases?.includes(current) ?? false
}

/** Menu điều hướng dành cho Sở Xây dựng (hỗ trợ hiển thị trên TopNav). */
export function SxdSubNav({ inline = false }: { inline?: boolean }) {
  const route = useHashRoute()

  return (
    <nav aria-label="Điều hướng Sở Xây dựng" className="flex items-center">
      <div className={`flex items-center gap-1 xl:gap-1.5 ${inline ? '' : 'mx-auto max-w-[1760px] px-4 lg:px-6'}`}>
        {ITEMS.map((item) => {
          const active = isActive(route, item)
          const Icon = item.icon
          return (
            <button
              key={item.route}
              type="button"
              onClick={() => navigate(item.route)}
              className={`relative inline-flex items-center gap-1.5 rounded-xl px-2.5 xl:px-3 py-1.5 text-xs xl:text-[13px] font-semibold transition-all duration-150 whitespace-nowrap ${
                active
                  ? 'bg-amber-600 font-bold text-white shadow-md shadow-amber-500/25 dark:bg-amber-600 dark:text-white'
                  : 'text-slate-700 hover:bg-amber-50 hover:text-amber-700 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white'
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
