import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AppShell } from '@/components/layout/app-shell'
import { PaymentNotice } from '@/components/layout/payment-notice'
import { EkycNotice } from '@/components/layout/ekyc-notice'
import { useHashRoute } from '@/hooks/useHashRoute'
import { getCachedVerified, refreshVerifiedCache, setCachedVerified } from '@/lib/verification'
import {
  ChangePasswordPage,
  ForgotPasswordPage,
  RegisterPage,
  ResendOtpPage,
  ResetPasswordPage,
  VerifyOtpPage,
} from '@/pages/auth-pages'
import { VerifyIdentityPage } from '@/pages/verify-identity-page'
import {
  ApplicationDetailPage,
  ApplicationsPage,
  CreateApplicationPage,
} from '@/pages/applications-pages'
import { AdminStaffPage, CreateStaffPage, StaffDetailPage } from '@/pages/admin-pages'
import { LandingPage } from '@/pages/landing-page'
import { LoginPage } from '@/pages/login-page'
import { HousingSearchPage } from '@/pages/housing-search-page'
import { AnnouncementsPage, SxdAnnouncementsPage } from '@/pages/announcements-page'
import { LookupPage } from '@/pages/lookup-page'
import { NotificationsPage } from '@/pages/notifications-page'
import { PaymentsPage } from '@/pages/payments-pages'
import { ProfilePage } from '@/pages/profile-page'
import { CreateProjectPage, ProjectDetailPage, ProjectsPage } from '@/pages/projects-pages'
import { ReportIssuePage } from '@/pages/report-issue-page'
import {
  LotteryCreatePage,
  LotteryDetailPage,
  LotteryLivePage,
  LotteryLobbyPage,
  LotterySessionsPage,
} from '@/pages/lottery-pages'
import { MyLotteryPage } from '@/pages/my-lottery-page'
import {
  ContractCreatePage,
  ContractDetailPage,
  ContractsPage,
} from '@/pages/contract-pages'
import { MyApartmentPage } from '@/pages/my-apartment-page'
import { AuditDetailPage, AuditListPage, AuditCreatePage } from '@/pages/audit-pages'
import { SxdProjectDetailPage, SxdProjectsPage } from '@/pages/sxd-projects-pages'
import { SxdPaymentsPage } from '@/pages/sxd-payments-page'
import {
  CategoriesPage,
  SystemLogsPage,
} from '@/pages/admin-extras-pages'
import { AdminHomePage } from '@/pages/admin-home-page'
import {
  ApplicantHomePage,
  InterestedPage,
  StaffRoleHomePage,
} from '@/pages/role-home-page'
import { SessionDashboardPage } from '@/pages/session-dashboard-page'
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
      <AnimatePresence mode="wait">
        <motion.div
          key={route}
          initial={{ opacity: 0, y: centered ? 8 : 0 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className={centered ? 'flex min-h-[60vh] items-center justify-center' : ''}
        >
          <RouteView route={route} />
        </motion.div>
      </AnimatePresence>
    </AppShell>
  )
}
