import { BRAND } from './brand'
import {
  canAccess,
  consumePaymentNotice,
  getRole,
  getRouteConfig,
  isLoggedIn,
  navigate,
  navRoutes,
  paymentNoticeMessage,
  roleHome,
  onRouteChange,
  publicNavRoutes,
  AUTH_FORM_ROUTES,
  type RouteId,
} from './router'
import {
  changePasswordView,
  forgotPasswordView,
  googleLoginView,
  loginView,
  registerView,
  resendOtpView,
  resetPasswordView,
  verifyOtpView,
} from './views/auth'
import {
  adminHomeView,
  interestedView,
  userHomeView,
  verifierHomeView,
  wardHomeView,
} from './views/home'
import { dashboardView, profileView } from './views/users'
import { createProjectView, projectDetailView, projectsView } from './views/projects'
import { createPaymentView, paymentsView } from './views/payment'
import {
  applicationDetailView,
  applicationsView,
  createApplicationView,
} from './views/applications'
import { adminStaffView, createStaffView, staffDetailView } from './views/admin'
import { landingView } from './views/landing'
import { traCuuView } from './views/lookup'
import { el } from './ui/helpers'
import { appFooter, brandLogo, govTricolorBar, marketingHero } from './ui/shell'

const viewMap: Record<RouteId, () => HTMLElement> = {
  landing: landingView,
  'tra-cuu': traCuuView,
  login: loginView,
  register: registerView,
  'verify-otp': verifyOtpView,
  'resend-otp': resendOtpView,
  'google-login': googleLoginView,
  'forgot-password': forgotPasswordView,
  'reset-password': resetPasswordView,
  'home-admin': adminHomeView,
  'home-ward': wardHomeView,
  'home-verifier': verifierHomeView,
  'home-user': userHomeView,
  'quan-tam': interestedView,
  dashboard: dashboardView,
  profile: profileView,
  'change-password': changePasswordView,
  projects: projectsView,
  'create-project': createProjectView,
  'project-detail': projectDetailView,
  payments: paymentsView,
  'create-payment': createPaymentView,
  'admin-staff': adminStaffView,
  'create-staff': createStaffView,
  'staff-detail': staffDetailView,
  applications: applicationsView,
  'create-application': createApplicationView,
  'application-detail': applicationDetailView,
}

function navIcon(id: RouteId): string {
  if (id === 'landing') return '⌂'
  if (id === 'tra-cuu') return '▤'
  if (id.startsWith('home-')) return '⌂'
  if (id === 'quan-tam') return '♥'
  if (id === 'profile') return '◉'
  if (id === 'projects') return '▣'
  if (id === 'payments') return '₫'
  if (id === 'applications' || id === 'application-detail' || id === 'create-application') return '▤'
  if (id === 'dashboard') return '◫'
  if (id === 'admin-staff') return '⚙'
  return '•'
}

function renderNav(nav: HTMLElement, activeId: RouteId): void {
  nav.replaceChildren()
  const links = el('div', { class: 'topnav-links' })

  const routeIds = isLoggedIn() ? navRoutes(getRole()) : publicNavRoutes()

  for (const id of routeIds) {
    if (isLoggedIn() && !canAccess(getRole(), id)) continue
    const cfg = getRouteConfig(id)
    const a = el(
      'a',
      {
        href: `#/${id}`,
        class: `topnav-link${activeId === id ? ' active' : ''}`,
      },
      el('span', { class: 'topnav-icon', 'aria-hidden': 'true' }, navIcon(id)),
      el('span', { class: 'topnav-label' }, cfg.label),
    )
    a.addEventListener('click', (e) => {
      e.preventDefault()
      navigate(id)
    })
    links.append(a)
  }
  nav.append(links)
}

function renderBreadcrumb(host: HTMLElement, routeId: RouteId): void {
  const config = getRouteConfig(routeId)
  host.replaceChildren(
    el('nav', { class: 'breadcrumb', 'aria-label': 'Đường dẫn' },
      el('a', { href: '#/', class: 'crumb' }, 'Trang chủ'),
      el('span', { class: 'crumb-sep' }, '›'),
      el('span', { class: 'crumb current' }, config.title),
    ),
  )
}

export function mountApp(root: HTMLElement): void {
  root.className = 'app-root'

  const header = el(
    'header',
    { class: 'app-header' },
    govTricolorBar(),
    el('div', { class: 'header-main' },
      el('div', { class: 'header-brand' },
        brandLogo(),
        el('div', { class: 'header-titles' },
          el('p', { class: 'org-line' }, BRAND.orgLine),
          el('h1', { class: 'app-name' }, BRAND.nameVi),
          el('p', { class: 'app-tagline' }, BRAND.taglineVi),
        ),
      ),
    ),
  )

  const nav = el('nav', { class: 'topnav', 'aria-label': 'Menu điều hướng' })
  const breadcrumb = el('div', { class: 'breadcrumb-bar' })
  const paymentBanner = el('div', { class: 'payment-notice', 'aria-live': 'polite' })
  const main = el('main', { class: 'main' })
  const pageHost = el('div', { class: 'page-host' })
  main.append(paymentBanner, breadcrumb, pageHost)

  const hero = marketingHero()
  const contentArea = el('div', { class: 'content-area' }, hero, main)
  const layoutBody = el('div', { class: 'layout-body' }, contentArea)

  root.append(header, nav, layoutBody, appFooter())

  let activePaymentNotice = consumePaymentNotice()

  const renderPaymentBanner = (): void => {
    if (!activePaymentNotice) {
      paymentBanner.replaceChildren()
      paymentBanner.classList.remove('is-visible')
      return
    }
    const msg = paymentNoticeMessage(activePaymentNotice)
    paymentBanner.className = `payment-notice is-visible ${msg.className}`
    paymentBanner.replaceChildren(
      el('p', { class: 'payment-notice-text' }, msg.text),
      el('button', { type: 'button', class: 'payment-notice-close', 'aria-label': 'Đóng' }, '×'),
    )
    paymentBanner.querySelector('.payment-notice-close')?.addEventListener('click', () => {
      activePaymentNotice = null
      paymentBanner.replaceChildren()
      paymentBanner.classList.remove('is-visible')
    })
  }

  renderPaymentBanner()

  onRouteChange((id) => {
    const config = getRouteConfig(id)
    if (config.auth && !isLoggedIn()) {
      navigate('login')
      return
    }

    if (config.auth && isLoggedIn() && !canAccess(getRole(), id)) {
      navigate(roleHome(getRole()))
      return
    }

    const logged = isLoggedIn()
    const isPublicPage = id === 'landing' || id === 'tra-cuu'
    hero.classList.toggle('is-hidden', logged || isPublicPage)
    layoutBody.classList.toggle('is-authenticated', logged)
    layoutBody.classList.toggle('is-public-page', !logged && isPublicPage)
    document.body.dataset.route = id
    document.body.classList.toggle('auth-screen', AUTH_FORM_ROUTES.has(id))

    renderNav(nav, id)
    if (!isPublicPage && !AUTH_FORM_ROUTES.has(id)) {
      renderBreadcrumb(breadcrumb, id)
      breadcrumb.classList.remove('is-hidden')
    } else {
      breadcrumb.classList.add('is-hidden')
    }
    pageHost.replaceChildren(viewMap[id]())
    renderPaymentBanner()
    document.title = `${config.title} · ${BRAND.shortName}`
  })
}
