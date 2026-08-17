import {
  Home,
  FileText,
  Building2,
  Gavel,
  Radio,
  FileSignature,
  ScrollText,
  User,
  CheckSquare,
  Wallet,
  Bell,
} from 'lucide-react'

import { useHashRoute, navigate } from '@/hooks/useHashRoute'
import { type RouteId } from '@/router'
import { ROLE_THEMES } from '@/lib/role-theme'

const THEME = ROLE_THEMES.sxd

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
  { route: 'lottery-live', label: 'Bốc thăm trực tiếp', icon: Radio },
  {
    route: 'sxd-payments',
    label: 'Thanh toán',
    icon: Wallet,
  },
  {
    route: 'sxd-announcements',
    label: 'Thông báo',
    icon: Bell,
  },
  {
    route: 'audit-list',
    label: 'Hậu kiểm',
    icon: ScrollText,
    aliases: ['audit-detail'],
  },
  {
    route: 'contracts',
    label: 'Hợp đồng',
    icon: FileSignature,
    aliases: ['contract-detail'],
  },
  { route: 'profile', label: 'Tài khoản', icon: User, aliases: ['change-password'] },
]

// Tất cả route của Sở Xây dựng dùng sub-nav này.
export const SXD_SUB_NAV_ROUTES: RouteId[] = [
  'home-sxd',
  'applications',
  'application-detail',
  'sxd-projects',
  'sxd-project-detail',
  'sxd-announcements',
  'lottery-sessions',
  'lottery-detail',
  'lottery-live',
  'sxd-payments',
  'audit-list',
  'audit-detail',
  'contracts',
  'contract-detail',
  'profile',
  'change-password',
  'notifications',
]

function isActive(current: RouteId, item: NavItem): boolean {
  if (current === item.route) return true
  return item.aliases?.includes(current) ?? false
}

/** Menu phẳng tối giản dành cho Sở Xây dựng. */
export function SxdSubNav() {
  const route = useHashRoute()

  return (
    <nav aria-label="Điều hướng Sở Xây dựng">
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
                  ? `${THEME.navActiveBg} ${THEME.navActiveTextColor} font-semibold`
                  : `text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white`
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
