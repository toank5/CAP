import { ApplicantSubNav, APPLICANT_SUB_NAV_ROUTES } from '@/components/layout/applicant-sub-nav'
import { AdminSubNav, ADMIN_SUB_NAV_ROUTES } from '@/components/layout/admin-sub-nav'
import { BrandLogo } from '@/components/brand/brand-logo'
import { BRAND } from '@/lib/brand'
import { GovBreadcrumb } from '@/components/layout/gov-breadcrumb'
import { GovFooter } from '@/components/layout/gov-footer'
import { GovTopBar } from '@/components/layout/gov-top-bar'
import { NotificationBell } from '@/components/layout/notification-bell'
import { UserWelcomeBar } from '@/components/layout/user-welcome-bar'
import { Button } from '@/components/ui/button'
import { resolveRoleTheme } from '@/lib/role-theme'
import { useHashRoute, navigate } from '@/hooks/useHashRoute'
import { isLoggedIn, publicNavRoutes, navRoutes, getRouteConfig, canAccess, getRole, ADMIN_ROLE, AUTH_FORM_ROUTES, type RouteId } from '@/router'

const PUBLIC = publicNavRoutes()

function HeaderNavLink({ id, active }: { id: RouteId; active: boolean }) {
  const cfg = getRouteConfig(id)
  return (
    <button
      type="button"
      onClick={() => navigate(id)}
      className="relative shrink-0 px-4 py-3 text-sm font-semibold transition-colors text-white/85 hover:bg-white/10 hover:text-white data-[active=true]:bg-white/15 data-[active=true]:text-white"
      data-active={active ? 'true' : 'false'}
    >
      {cfg.label}
      {active && (
        <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-[#FFCD00]" />
      )}
    </button>
  )
}

function LandingHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-primary/15 bg-white shadow-[0_2px_16px_rgb(0_61_122_/_12%)]">
      <div className="flex h-1">
        <div className="flex-1 bg-[#DA251D]" />
        <div className="flex-1 bg-[#FFCD00]" />
        <div className="flex-1 bg-[#005BAC]" />
      </div>
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 lg:px-8">
        <button
          type="button"
          onClick={() => navigate('landing')}
          className="flex min-w-0 items-center text-left"
          aria-label="Trang chủ"
        >
          <BrandLogo size="sm" showPortal showAcronym className="inline-flex max-w-[min(100%,520px)]" />
        </button>
        <Button
          variant="outline"
          size="sm"
          className="rounded-md border-primary/30 font-semibold text-primary"
          onClick={() => navigate('login')}
        >
          Đăng nhập
        </Button>
      </div>
    </header>
  )
}

function AuthHeader() {
  return (
    <header className="border-b border-primary/15 bg-white shadow-[0_2px_16px_rgb(0_61_122_/_12%)]">
      <div className="flex h-1">
        <div className="flex-1 bg-[#DA251D]" />
        <div className="flex-1 bg-[#FFCD00]" />
        <div className="flex-1 bg-[#005BAC]" />
      </div>
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 lg:px-8">
        <button
          type="button"
          onClick={() => navigate('landing')}
          className="flex min-w-0 items-center text-left"
          aria-label="Trang chủ"
        >
          <BrandLogo size="sm" showPortal showAcronym className="inline-flex max-w-[min(100%,520px)]" />
        </button>
        <Button
          variant="outline"
          size="sm"
          className="rounded-md border-primary/30 font-semibold text-primary"
          onClick={() => navigate('landing')}
        >
          Trang chủ
        </Button>
      </div>
    </header>
  )
}

function InternalHeader({ logged, role }: { logged: boolean; role: string }) {
  const theme = resolveRoleTheme(role, logged)
  const ThemeIcon = theme.Icon
  const route = useHashRoute()
  const isApplicant = logged && role === 'Applicant'
  const isAdmin = logged && role === ADMIN_ROLE
  const showApplicantNav = isApplicant && APPLICANT_SUB_NAV_ROUTES.includes(route)
  const showAdminNav = isAdmin && ADMIN_SUB_NAV_ROUTES.includes(route)
  const navIds = logged ? navRoutes(role) : PUBLIC
  const visibleNavIds = navIds.filter((id) => !logged || canAccess(role, id))
  const showHeaderNav = !showApplicantNav && !showAdminNav && visibleNavIds.length > 0

  return (
    <div>
      <GovTopBar />
      <div className="flex h-1">
        <div className="flex-1 bg-[#DA251D]" />
        <div className="flex-1 bg-[#FFCD00]" />
        <div className="flex-1 bg-[#005BAC]" />
      </div>
      <header className="sticky top-0 z-50 bg-white shadow-[0_2px_16px_rgb(0_61_122_/_12%)] dark:bg-slate-900">
        <div className="border-b border-primary/10">
          <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 lg:gap-5 lg:px-8">
            <button
              type="button"
              onClick={() => navigate(logged ? (theme.homeRoute as RouteId) : 'landing')}
              className="flex min-w-0 flex-1 items-center text-left"
              aria-label="Trang chủ"
            >
              <BrandLogo size="sm" showPortal showAcronym className="hidden md:inline-flex max-w-[min(100%,520px)]" />
              <BrandLogo size="sm" showWordmark={false} className="md:hidden" />
              <span className="min-w-0 md:hidden">
                <span className="block text-[10px] font-bold leading-snug text-[#003D7A] dark:text-slate-100 line-clamp-2">{BRAND.projectName}</span>
                <span className="mt-0.5 block text-[9px] font-semibold text-primary">{BRAND.acronym}</span>
              </span>
            </button>
            {logged && (
              <span className={`hidden md:inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide text-white shadow-sm ${theme.brandAccent}`} title={theme.badgeFull}>
                <ThemeIcon className="h-3.5 w-3.5" />
                {theme.badge}
              </span>
            )}
            <div className="flex shrink-0 items-center gap-2">
              {logged && <NotificationBell />}
              {!logged && <Button variant="outline" size="sm" className="rounded-md border-primary/30 font-semibold text-primary" onClick={() => navigate('login')}>Đăng nhập</Button>}
              {logged && (
                <Button size="sm" className={`rounded-md font-bold shadow-sm ${theme.ctaBg} ${theme.ctaBgHover} ${theme.ctaText}`} onClick={() => navigate(theme.ctaRoute as RouteId)}>
                  <span className="hidden sm:inline">{theme.ctaLabel}</span>
                  <span className="sm:hidden">{theme.ctaShort}</span>
                </Button>
              )}
            </div>
          </div>
        </div>
        {showApplicantNav && <ApplicantSubNav />}
        {showAdminNav && <AdminSubNav />}
        {showHeaderNav && (
          <nav className={`${theme.navBg} text-white`} aria-label="Menu chính">
            <div className="mx-auto flex max-w-7xl overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {visibleNavIds.map((id) => <HeaderNavLink key={id} id={id} active={route === id} />)}
            </div>
          </nav>
        )}
      </header>
    </div>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const route = useHashRoute()
  const logged = isLoggedIn()
  const role = getRole()

  const isFullBleed = route === 'landing'
  const isAuthForm = AUTH_FORM_ROUTES.has(route)

  return (
    <div className="flex min-h-screen flex-col">
      {isFullBleed ? (
        <LandingHeader />
      ) : isAuthForm ? (
        <AuthHeader />
      ) : (
        <InternalHeader logged={logged} role={role} />
      )}

      <main className={isFullBleed ? 'flex-1' : 'mx-auto w-full max-w-7xl flex-1 px-4 py-6 lg:px-8 lg:py-8'}>
        {!isFullBleed && <GovBreadcrumb />}
        {logged && !isFullBleed && <UserWelcomeBar />}
        {children}
      </main>

      <GovFooter />
    </div>
  )
}
