import { ChevronRight, Home } from 'lucide-react'
import { getRouteConfig, roleHome, getRole, isLoggedIn, type RouteId } from '@/router'
import { useHashRoute, navigate } from '@/hooks/useHashRoute'

const HOME_LABEL: Partial<Record<RouteId, string>> = {
  'home-user': 'Trang chủ',
  'home-admin': 'Trang quản trị',
  'home-ward': 'Trang phường',
  'home-verifier': 'Trang thẩm định',
}

export function GovBreadcrumb() {
  const route = useHashRoute()
  const logged = isLoggedIn()
  const cfg = getRouteConfig(route)
  const role = getRole()

  const homeRoute = logged ? roleHome(role) : 'landing'
  const homeLabel = logged ? (HOME_LABEL[homeRoute] ?? 'Trang chủ') : 'Trang chủ'

  if (route === 'landing') return null

  return (
    <nav aria-label="Breadcrumb" className="gov-breadcrumb mb-5">
      <ol className="flex flex-wrap items-center gap-1 text-sm">
        <li>
          <button
            type="button"
            onClick={() => navigate(homeRoute)}
            className="inline-flex items-center gap-1 text-primary hover:text-[#003D7A] hover:underline"
          >
            <Home className="h-3.5 w-3.5" />
            {homeLabel}
          </button>
        </li>
        <li className="flex items-center gap-1 text-slate-400">
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="font-semibold text-[#003D7A] dark:text-slate-200">{cfg.label}</span>
        </li>
      </ol>
    </nav>
  )
}
