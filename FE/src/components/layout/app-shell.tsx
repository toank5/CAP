import { ApplicantSubNav, APPLICANT_SUB_NAV_ROUTES } from '@/components/layout/applicant-sub-nav'
import { AdminSubNav, ADMIN_SUB_NAV_ROUTES } from '@/components/layout/admin-sub-nav'
import { BrandLogo } from '@/components/brand/brand-logo'
import { GovBreadcrumb } from '@/components/layout/gov-breadcrumb'
import { GovFooter } from '@/components/layout/gov-footer'
import { GovTopBar } from '@/components/layout/gov-top-bar'
import { UserWelcomeBar } from '@/components/layout/user-welcome-bar'
import { Button } from '@/components/ui/button'
import { BRAND } from '@/lib/brand'
import { useHashRoute, navigate } from '@/hooks/useHashRoute'
import { isLoggedIn, publicNavRoutes, navRoutes, getRouteConfig, canAccess, getRole, roleHome, ADMIN_ROLE, type RouteId } from '@/router'

const PUBLIC = publicNavRoutes()

function HeaderNavLink({ id, active }: { id: RouteId; active: boolean }) {
  const cfg = getRouteConfig(id)
  return (
    <button
      type="button"
      onClick={() => navigate(id)}
      className={`relative shrink-0 px-4 py-3 text-sm font-semibold transition-colors ${
        active
          ? 'bg-white/15 text-white after:absolute after:bottom-0 after:left-2 after:right-2 after:h-0.5 after:rounded-full after:bg-[#FFCD00]'
          : 'text-white/85 hover:bg-white/10 hover:text-white'
      }`}
    >
      {cfg.label}
    </button>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const route = useHashRoute()
  const logged = isLoggedIn()
  const role = getRole()
  const navIds = logged ? navRoutes(role) : PUBLIC

  const isFullBleed = route === 'landing'
  const isApplicant = logged && role === 'Applicant'
  const isAdmin = logged && role === ADMIN_ROLE
  const showApplicantNav = isApplicant && APPLICANT_SUB_NAV_ROUTES.includes(route)
  const showAdminNav = isAdmin && ADMIN_SUB_NAV_ROUTES.includes(route)
  const visibleNavIds = navIds.filter((id) => !logged || canAccess(role, id))
  const showHeaderNav = !showApplicantNav && !showAdminNav && visibleNavIds.length > 0

  const headerCta = (() => {
    if (!logged) return { label: 'Đăng ký ngay', short: 'Đăng ký', route: 'register' as RouteId }
    if (isAdmin) return { label: 'Thêm cán bộ', short: 'Cán bộ', route: 'create-staff' as RouteId }
    if (isApplicant) return { label: 'Đăng ký hồ sơ', short: 'Hồ sơ', route: 'create-application' as RouteId }
    return null
  })()

  return (
    <div className="flex min-h-screen flex-col">
      <GovTopBar />

      {/* Sọc cờ Việt Nam */}
      <div className="flex h-1">
        <div className="flex-1 bg-[#DA251D]" />
        <div className="flex-1 bg-[#FFCD00]" />
        <div className="flex-1 bg-[#005BAC]" />
      </div>

      <header className="sticky top-0 z-50 bg-white shadow-[0_2px_16px_rgb(0_61_122_/_12%)] dark:bg-slate-900">
        {/* Hàng thương hiệu */}
        <div className="border-b border-primary/10">
          <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 lg:gap-5 lg:px-8">
            <button
              type="button"
              onClick={() => navigate(logged ? roleHome(role) : 'landing')}
              className="flex min-w-0 flex-1 items-center text-left"
              aria-label="Trang chủ RHS"
            >
              <BrandLogo size="sm" showPortal showAcronym className="hidden md:inline-flex max-w-[min(100%,520px)]" />
              <BrandLogo size="sm" showWordmark={false} className="md:hidden" />
              <span className="min-w-0 md:hidden">
                <span className="block text-[10px] font-bold leading-snug text-[#003D7A] dark:text-slate-100 line-clamp-2">
                  {BRAND.projectName}
                </span>
                <span className="mt-0.5 block text-[9px] font-semibold text-primary">{BRAND.acronym}</span>
              </span>
            </button>

            <div className="flex shrink-0 items-center gap-2">
              {!logged && (
                <Button variant="outline" size="sm" className="rounded-md border-primary/30 font-semibold text-primary" onClick={() => navigate('login')}>
                  Đăng nhập
                </Button>
              )}
              {headerCta && (
                <Button
                  size="sm"
                  className="rounded-md bg-[#DA251D] font-semibold shadow-sm hover:bg-[#b81e17]"
                  onClick={() => navigate(headerCta.route)}
                >
                  <span className="hidden sm:inline">{headerCta.label}</span>
                  <span className="sm:hidden">{headerCta.short}</span>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Menu ngang xanh — kiểu cổng DVC */}
        {showApplicantNav && <ApplicantSubNav />}
        {showAdminNav && <AdminSubNav />}
        {showHeaderNav && (
          <nav className="bg-[#005BAC]" aria-label="Menu chính">
            <div className="mx-auto flex max-w-7xl overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {visibleNavIds.map((id) => (
                <HeaderNavLink key={id} id={id} active={route === id} />
              ))}
            </div>
          </nav>
        )}
      </header>

      <main className={isFullBleed ? 'flex-1' : 'mx-auto w-full max-w-7xl flex-1 px-4 py-6 lg:px-8 lg:py-8'}>
        {!isFullBleed && <GovBreadcrumb />}
        {logged && !isFullBleed && <UserWelcomeBar />}
        {children}
      </main>

      <GovFooter />
    </div>
  )
}
