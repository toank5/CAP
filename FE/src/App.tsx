import { useEffect, useRef, lazy, Suspense } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AppShell } from '@/components/layout/app-shell'
import { PaymentNotice } from '@/components/layout/payment-notice'
import { EkycNotice } from '@/components/layout/ekyc-notice'
import { EkycGateModal } from '@/components/layout/ekyc-gate-modal'
import { useHashRoute } from '@/hooks/useHashRoute'
import { getCachedVerified, refreshVerifiedCache, setCachedVerified } from '@/lib/verification'
import { Loader2 } from 'lucide-react'
import {
  AUTH_FORM_ROUTES,
  canAccess,
  getRole,
  getRouteConfig,
  isLoggedIn,
  navigate,
  roleHome,
  type RouteId,
} from '@/router'

// Lazy-loaded pages for lightning fast initial load
const LandingPage = lazy(() => import('@/pages/landing-page').then(m => ({ default: m.LandingPage })))
const LookupPage = lazy(() => import('@/pages/lookup-page').then(m => ({ default: m.LookupPage })))
const HousingSearchPage = lazy(() => import('@/pages/housing-search-page').then(m => ({ default: m.HousingSearchPage })))
const AnnouncementsPage = lazy(() => import('@/pages/announcements-page').then(m => ({ default: m.AnnouncementsPage })))
const SxdAnnouncementsPage = lazy(() => import('@/pages/announcements-page').then(m => ({ default: m.SxdAnnouncementsPage })))
const LoginPage = lazy(() => import('@/pages/login-page').then(m => ({ default: m.LoginPage })))
const RegisterPage = lazy(() => import('@/pages/auth-pages').then(m => ({ default: m.RegisterPage })))
const VerifyOtpPage = lazy(() => import('@/pages/auth-pages').then(m => ({ default: m.VerifyOtpPage })))
const VerifyIdentityPage = lazy(() => import('@/pages/verify-identity-page').then(m => ({ default: m.VerifyIdentityPage })))
const ResendOtpPage = lazy(() => import('@/pages/auth-pages').then(m => ({ default: m.ResendOtpPage })))
const ForgotPasswordPage = lazy(() => import('@/pages/auth-pages').then(m => ({ default: m.ForgotPasswordPage })))
const ResetPasswordPage = lazy(() => import('@/pages/auth-pages').then(m => ({ default: m.ResetPasswordPage })))
const ChangePasswordPage = lazy(() => import('@/pages/auth-pages').then(m => ({ default: m.ChangePasswordPage })))

const ApplicantHomePage = lazy(() => import('@/pages/role-home-page').then(m => ({ default: m.ApplicantHomePage })))
const AdminHomePage = lazy(() => import('@/pages/admin-home-page').then(m => ({ default: m.AdminHomePage })))
const StaffRoleHomePage = lazy(() => import('@/pages/role-home-page').then(m => ({ default: m.StaffRoleHomePage })))
const InterestedPage = lazy(() => import('@/pages/role-home-page').then(m => ({ default: m.InterestedPage })))
const SessionDashboardPage = lazy(() => import('@/pages/session-dashboard-page').then(m => ({ default: m.SessionDashboardPage })))
const ProfilePage = lazy(() => import('@/pages/profile-page').then(m => ({ default: m.ProfilePage })))

const ApplicationsPage = lazy(() => import('@/pages/applications-pages').then(m => ({ default: m.ApplicationsPage })))
const CreateApplicationPage = lazy(() => import('@/pages/applications-pages').then(m => ({ default: m.CreateApplicationPage })))
const ApplicationDetailPage = lazy(() => import('@/pages/applications-pages').then(m => ({ default: m.ApplicationDetailPage })))

const ProjectsPage = lazy(() => import('@/pages/projects-pages').then(m => ({ default: m.ProjectsPage })))
const CreateProjectPage = lazy(() => import('@/pages/projects-pages').then(m => ({ default: m.CreateProjectPage })))
const ProjectDetailPage = lazy(() => import('@/pages/projects-pages').then(m => ({ default: m.ProjectDetailPage })))

const PaymentsPage = lazy(() => import('@/pages/payments-pages').then(m => ({ default: m.PaymentsPage })))
const AdminStaffPage = lazy(() => import('@/pages/admin-pages').then(m => ({ default: m.AdminStaffPage })))
const CreateStaffPage = lazy(() => import('@/pages/admin-pages').then(m => ({ default: m.CreateStaffPage })))
const StaffDetailPage = lazy(() => import('@/pages/admin-pages').then(m => ({ default: m.StaffDetailPage })))
const NotificationsPage = lazy(() => import('@/pages/notifications-page').then(m => ({ default: m.NotificationsPage })))
const ReportIssuePage = lazy(() => import('@/pages/report-issue-page').then(m => ({ default: m.ReportIssuePage })))

const LotterySessionsPage = lazy(() => import('@/pages/lottery-pages').then(m => ({ default: m.LotterySessionsPage })))
const LotteryCreatePage = lazy(() => import('@/pages/lottery-pages').then(m => ({ default: m.LotteryCreatePage })))
const LotteryDetailPage = lazy(() => import('@/pages/lottery-pages').then(m => ({ default: m.LotteryDetailPage })))
const LotteryLobbyPage = lazy(() => import('@/pages/lottery-pages').then(m => ({ default: m.LotteryLobbyPage })))
const LotteryLivePage = lazy(() => import('@/pages/lottery-pages').then(m => ({ default: m.LotteryLivePage })))
const MyLotteryPage = lazy(() => import('@/pages/my-lottery-page').then(m => ({ default: m.MyLotteryPage })))

const ContractsPage = lazy(() => import('@/pages/contract-pages').then(m => ({ default: m.ContractsPage })))
const ContractCreatePage = lazy(() => import('@/pages/contract-pages').then(m => ({ default: m.ContractCreatePage })))
const ContractDetailPage = lazy(() => import('@/pages/contract-pages').then(m => ({ default: m.ContractDetailPage })))
const MyApartmentPage = lazy(() => import('@/pages/my-apartment-page').then(m => ({ default: m.MyApartmentPage })))

const AuditListPage = lazy(() => import('@/pages/audit-pages').then(m => ({ default: m.AuditListPage })))
const AuditCreatePage = lazy(() => import('@/pages/audit-pages').then(m => ({ default: m.AuditCreatePage })))
const AuditDetailPage = lazy(() => import('@/pages/audit-pages').then(m => ({ default: m.AuditDetailPage })))

const SxdProjectsPage = lazy(() => import('@/pages/sxd-projects-pages').then(m => ({ default: m.SxdProjectsPage })))
const SxdProjectDetailPage = lazy(() => import('@/pages/sxd-projects-pages').then(m => ({ default: m.SxdProjectDetailPage })))
const SxdPaymentsPage = lazy(() => import('@/pages/sxd-payments-page').then(m => ({ default: m.SxdPaymentsPage })))

const SystemLogsPage = lazy(() => import('@/pages/admin-extras-pages').then(m => ({ default: m.SystemLogsPage })))
const CategoriesPage = lazy(() => import('@/pages/admin-extras-pages').then(m => ({ default: m.CategoriesPage })))

function PageLoadingFallback() {
  return (
    <div className="flex min-h-[50vh] w-full flex-col items-center justify-center gap-3 text-slate-500 dark:text-slate-400">
      <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      <span className="text-xs font-semibold tracking-wide">Đang tải dữ liệu…</span>
    </div>
  )
}

function RouteView({ route }: { route: RouteId }) {
  switch (route) {
    case 'landing': return <LandingPage />
    case 'tra-cuu': return <LookupPage />
    case 'tim-nha': return <HousingSearchPage />
    case 'thong-bao': return <AnnouncementsPage />
    case 'login': return <LoginPage />
    case 'register': return <RegisterPage />
    case 'verify-otp': return <VerifyOtpPage />
    case 'verify-identity': return <VerifyIdentityPage />
    case 'resend-otp': return <ResendOtpPage />
    case 'forgot-password': return <ForgotPasswordPage />
    case 'reset-password': return <ResetPasswordPage />
    case 'change-password': return <ChangePasswordPage />
    case 'home-user': return <ApplicantHomePage />
    case 'home-admin': return <AdminHomePage />
    case 'home-developer': return <StaffRoleHomePage routeId="home-developer" />
    case 'home-sxd': return <StaffRoleHomePage routeId="home-sxd" />
    case 'quan-tam': return <InterestedPage />
    case 'dashboard': return <SessionDashboardPage />
    case 'profile': return <ProfilePage />
    case 'applications': return <ApplicationsPage />
    case 'create-application': return <CreateApplicationPage />
    case 'application-detail': return <ApplicationDetailPage />
    case 'projects': return <ProjectsPage />
    case 'create-project': return <CreateProjectPage />
    case 'project-detail': return <ProjectDetailPage />
    case 'payments': return <PaymentsPage />
    case 'admin-staff': return <AdminStaffPage />
    case 'create-staff': return <CreateStaffPage />
    case 'staff-detail': return <StaffDetailPage />
    case 'notifications': return <NotificationsPage />
    case 'report-issue': return <ReportIssuePage />
    case 'lottery-sessions': return <LotterySessionsPage />
    case 'lottery-create': return <LotteryCreatePage />
    case 'lottery-detail': return <LotteryDetailPage />
    case 'lottery-lobby': return <LotteryLobbyPage />
    case 'lottery-live': return <LotteryLivePage />
    case 'my-lottery': return <MyLotteryPage />
    case 'contracts': return <ContractsPage />
    case 'contract-create': return <ContractCreatePage />
    case 'contract-detail': return <ContractDetailPage />
    case 'my-apartment': return <MyApartmentPage />
    case 'audit-list': return <AuditListPage />
    case 'audit-create': return <AuditCreatePage />
    case 'audit-detail': return <AuditDetailPage />
    case 'sxd-projects': return <SxdProjectsPage />
    case 'sxd-project-detail': return <SxdProjectDetailPage />
    case 'sxd-announcements': return <SxdAnnouncementsPage />
    case 'sxd-payments': return <SxdPaymentsPage />
    case 'admin-logs': return <SystemLogsPage />
    case 'admin-categories': return <CategoriesPage />
    default: return null
  }
}

export function App() {
  const route = useHashRoute()
  const config = getRouteConfig(route)
  const role = getRole()
  const logged = isLoggedIn()
  // Warm cache eKYC (không ép redirect) — hard gate nằm ở nút đăng ký hồ sơ.
  const warmedRef = useRef(false)

  useEffect(() => {
    if (config.auth && !logged) {
      navigate('login')
      return
    }
    if (config.auth && logged && !canAccess(role, route)) {
      navigate(roleHome(role))
      return
    }
    if (logged && role === 'Applicant' && !warmedRef.current && getCachedVerified() === null) {
      warmedRef.current = true
      void refreshVerifiedCache().then((v) => {
        if (v !== null) setCachedVerified(v)
      })
    }
  }, [route, config.auth, logged, role])

  if (config.auth && !logged) return null
  if (config.auth && logged && !canAccess(role, route)) return null

  const centered = AUTH_FORM_ROUTES.has(route)
  const showPaymentNotice = logged && !centered && route !== 'landing'
  const showEkycNotice =
    logged &&
    role === 'Applicant' &&
    !centered &&
    route !== 'landing' &&
    route !== 'verify-identity'

  return (
    <AppShell>
      {showPaymentNotice && <PaymentNotice />}
      {showEkycNotice && <EkycNotice />}
      <EkycGateModal />
      <AnimatePresence mode="wait">
        <motion.div
          key={route}
          initial={{ opacity: 0, y: centered ? 8 : 0 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className={centered ? 'flex min-h-[60vh] items-center justify-center' : ''}
        >
          <Suspense fallback={<PageLoadingFallback />}>
            <RouteView route={route} />
          </Suspense>
        </motion.div>
      </AnimatePresence>
    </AppShell>
  )
}
