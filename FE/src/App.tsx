import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AppShell } from '@/components/layout/app-shell'
import { PaymentNotice } from '@/components/layout/payment-notice'
import { useHashRoute } from '@/hooks/useHashRoute'
import {
  ChangePasswordPage,
  ForgotPasswordPage,
  RegisterPage,
  ResendOtpPage,
  ResetPasswordPage,
  VerifyOtpPage,
} from '@/pages/auth-pages'
import {
  ApplicationDetailPage,
  ApplicationsPage,
  CreateApplicationPage,
} from '@/pages/applications-pages'
import { AdminStaffPage, CreateStaffPage, StaffDetailPage } from '@/pages/admin-pages'
import { LandingPage } from '@/pages/landing-page'
import { LoginPage } from '@/pages/login-page'
import { HousingSearchPage } from '@/pages/housing-search-page'
import { LookupPage } from '@/pages/lookup-page'
import { NotificationsPage } from '@/pages/notifications-page'
import { CreatePaymentPage, PaymentsPage } from '@/pages/payments-pages'
import { ProfilePage } from '@/pages/profile-page'
import { CreateProjectPage, ProjectDetailPage, ProjectsPage } from '@/pages/projects-pages'
import { ReportIssuePage } from '@/pages/report-issue-page'
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
    case 'login': return <LoginPage />
    case 'register': return <RegisterPage />
    case 'verify-otp': return <VerifyOtpPage />
    case 'resend-otp': return <ResendOtpPage />
    case 'forgot-password': return <ForgotPasswordPage />
    case 'reset-password': return <ResetPasswordPage />
    case 'change-password': return <ChangePasswordPage />
    case 'home-user': return <ApplicantHomePage />
    case 'home-admin': return <AdminHomePage />
    case 'home-ward': return <StaffRoleHomePage routeId="home-ward" />
    case 'home-verifier': return <StaffRoleHomePage routeId="home-verifier" />
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
    case 'create-payment': return <CreatePaymentPage />
    case 'admin-staff': return <AdminStaffPage />
    case 'create-staff': return <CreateStaffPage />
    case 'staff-detail': return <StaffDetailPage />
    case 'notifications': return <NotificationsPage />
    case 'report-issue': return <ReportIssuePage />
    default: return null
  }
}

export function App() {
  const route = useHashRoute()
  const config = getRouteConfig(route)
  const role = getRole()
  const logged = isLoggedIn()

  useEffect(() => {
    if (config.auth && !logged) navigate('login')
    else if (config.auth && logged && !canAccess(role, route)) navigate(roleHome(role))
  }, [route, config.auth, logged, role])

  if (config.auth && !logged) return null
  if (config.auth && logged && !canAccess(role, route)) return null

  const centered = AUTH_FORM_ROUTES.has(route)
  const showPaymentNotice = logged && !centered && route !== 'landing'

  return (
    <AppShell>
      {showPaymentNotice && <PaymentNotice />}
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
