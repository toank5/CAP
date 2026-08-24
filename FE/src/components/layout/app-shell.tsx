import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ApplicantSubNav, APPLICANT_SUB_NAV_ROUTES } from '@/components/layout/applicant-sub-nav'
import { AdminSubNav, ADMIN_SUB_NAV_ROUTES } from '@/components/layout/admin-sub-nav'
import { DeveloperSubNav, DEVELOPER_SUB_NAV_ROUTES } from '@/components/layout/developer-sub-nav'
import { SxdSubNav, SXD_SUB_NAV_ROUTES } from '@/components/layout/sxd-sub-nav'
import { BrandLogo } from '@/components/brand/brand-logo'
import { NotificationBell } from '@/components/layout/notification-bell'
import { roleAmbientId } from '@/components/layout/role-ambient'
import { ThemeToggle } from '@/components/layout/theme-toggle'
import { Button } from '@/components/ui/button'
import { resolveRoleTheme } from '@/lib/role-theme'
import { useHashRoute, navigate } from '@/hooks/useHashRoute'
import { isLoggedIn, ADMIN_ROLE, AUTH_FORM_ROUTES, getRole, type RouteId } from '@/router'
import { Sparkles, ChevronDown, LogOut, User, Settings, UserCircle2 } from 'lucide-react'
import { useUserProfile } from '@/providers/user-profile-provider'
import { clearTokens } from '@/lib/token'

function LandingHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
      <div className="mx-auto flex max-w-full items-center justify-between gap-3 px-6 py-3 lg:px-8">
        <button
          type="button"
          onClick={() => navigate('landing')}
          className="flex min-w-0 items-center text-left"
          aria-label="Trang chủ"
        >
          <BrandLogo size="sm" showPortal showAcronym className="inline-flex max-w-[min(100%,520px)]" />
        </button>
        <div className="flex shrink-0 items-center gap-2">
          <ThemeToggle />
          <Button variant="outline" size="sm" className="rounded-lg font-semibold" onClick={() => navigate('login')}>
            Đăng nhập
          </Button>
        </div>
      </div>
    </header>
  )
}

function AuthHeader() {
  return (
    <header className="border-b border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
      <div className="mx-auto flex max-w-full items-center justify-between gap-3 px-6 py-3 lg:px-8">
        <button
          type="button"
          onClick={() => navigate('landing')}
          className="flex min-w-0 items-center text-left"
          aria-label="Trang chủ"
        >
          <BrandLogo size="sm" showPortal showAcronym className="inline-flex max-w-[min(100%,520px)]" />
        </button>
        <div className="flex shrink-0 items-center gap-2">
          <ThemeToggle />
          <Button variant="outline" size="sm" className="rounded-lg font-semibold" onClick={() => navigate('landing')}>
            Trang chủ
          </Button>
        </div>
      </div>
    </header>
  )
}

function UserAccountCluster() {
  const { greeting, avatarUrl, initials } = useUserProfile()
  const role = getRole()
  const theme = resolveRoleTheme(role, true)
  const ThemeIcon = theme.Icon
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
      >
        {/* Avatar */}
        <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-gradient-to-br from-blue-500 to-indigo-600 text-xs font-bold text-white dark:border-slate-600">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            initials
          )}
        </div>
        {/* Name + badge */}
        <div className="hidden min-w-0 text-left lg:block">
          <p className="truncate text-xs font-semibold text-slate-900 dark:text-slate-100">{greeting}</p>
          <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white ${theme.brandAccent}`}>
            <ThemeIcon className="h-2.5 w-2.5" />
            {theme.badge}
          </span>
        </div>
        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.97 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800"
            >
              <div className={`h-1 w-full bg-gradient-to-r ${theme.brandAccent}`} />
              <div className="p-2">
                <p className="px-3 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400">{theme.badgeFull}</p>
                <button
                  type="button"
                  onClick={() => { setOpen(false); navigate('profile') }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  <User className="h-4 w-4 text-slate-400" />
                  Tài khoản
                </button>
                <button
                  type="button"
                  onClick={() => { setOpen(false); navigate('change-password') }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  <Settings className="h-4 w-4 text-slate-400" />
                  Đổi mật khẩu
                </button>
                <div className="my-1.5 border-t border-slate-100 dark:border-slate-700" />
                <button
                  type="button"
                  onClick={() => { setOpen(false); clearTokens(); navigate('login') }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                >
                  <LogOut className="h-4 w-4" />
                  Đăng xuất
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

function InternalHeader({ logged, role }: { logged: boolean; role: string }) {
  const theme = resolveRoleTheme(role, logged)
  const route = useHashRoute()
  const isApplicant = logged && role === 'Applicant'
  const isAdmin = logged && role === ADMIN_ROLE
  const isDeveloper = logged && role === 'Housing Developer'
  const isSxd = logged && role === 'Department Of Construction'
  const showApplicantNav = isApplicant && APPLICANT_SUB_NAV_ROUTES.includes(route)
  const showAdminNav = isAdmin && ADMIN_SUB_NAV_ROUTES.includes(route)
  const showDeveloperNav = isDeveloper && DEVELOPER_SUB_NAV_ROUTES.includes(route)
  const showSxdNav = isSxd && SXD_SUB_NAV_ROUTES.includes(route)

  return (
    <div>
      {/* Top bar */}
      <header className="border-b border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        <div className="mx-auto flex h-14 max-w-[1760px] items-center gap-3 px-4 lg:px-6">
          {/* Logo */}
          <button
            type="button"
            onClick={() => navigate(logged ? (theme.homeRoute as RouteId) : 'landing')}
            className="flex min-w-0 items-center text-left"
            aria-label="Trang chủ"
          >
            <BrandLogo size="sm" showPortal showAcronym className="max-w-[min(100%,480px)]" />
          </button>

          <div className="flex-1" />

          {/* Right cluster */}
          <div className="flex shrink-0 items-center gap-2">
            <ThemeToggle />
            {logged && (
              <Button
                variant="ghost"
                size="sm"
                className={`hidden gap-2 rounded-lg font-semibold sm:inline-flex ${
                  route === 'profile' || route === 'change-password'
                    ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
                }`}
                onClick={() => navigate('profile')}
                aria-label="Tài khoản"
              >
                <UserCircle2 className="h-4 w-4" />
                <span>Tài khoản</span>
              </Button>
            )}
            {logged && <NotificationBell />}
            {logged && <UserAccountCluster />}
            {!logged && (
              <Button variant="outline" size="sm" className="rounded-lg font-semibold" onClick={() => navigate('login')}>
                Đăng nhập
              </Button>
            )}
            {logged && (
              <Button
                size="sm"
                className={`rounded-lg font-semibold text-white ${theme.ctaBg} ${theme.ctaBgHover}`}
                onClick={() => navigate(theme.ctaRoute as RouteId)}
              >
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                {theme.ctaLabel}
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Sub-nav */}
      {(showApplicantNav || showAdminNav || showDeveloperNav || showSxdNav) && (
        <div className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50">
          {showApplicantNav && <ApplicantSubNav />}
          {showAdminNav && <AdminSubNav />}
          {showDeveloperNav && <DeveloperSubNav />}
          {showSxdNav && <SxdSubNav />}
        </div>
      )}
    </div>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const route = useHashRoute()
  const logged = isLoggedIn()
  const role = getRole()

  const isFullBleed = route === 'landing'
  const isAuthForm = AUTH_FORM_ROUTES.has(route)
  const ambientId = roleAmbientId(logged, role)

  return (
    <div className={`flex min-h-screen flex-col ${!isFullBleed ? `ambient-glow-${ambientId}` : ''}`}>
      {isFullBleed ? (
        <LandingHeader />
      ) : isAuthForm ? (
        <AuthHeader />
      ) : (
        <InternalHeader logged={logged} role={role} />
      )}

      <main className="mx-auto w-full max-w-[1760px] flex-1 px-4 py-6 lg:px-6">
        {children}
      </main>
    </div>
  )
}
