import { BRAND } from './brand'
import {
  canAccess,
  getRole,
  getRouteConfig,
  isLoggedIn,
  navigate,
  navRoutes,
  roleHome,
  onRouteChange,
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
import { adminStaffView, createStaffView, staffDetailView } from './views/admin'
import { el } from './ui/helpers'
import { appFooter, brandLogo, govTricolorBar, marketingHero } from './ui/shell'

const viewMap: Record<RouteId, () => HTMLElement> = {
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
}

function navIcon(id: RouteId): string {
  if (id.startsWith('home-')) return '⌂'
  if (id === 'quan-tam') return '♥'
  if (id === 'profile') return '◉'
  if (id === 'projects') return '▣'
  if (id === 'payments') return '₫'
  if (id === 'dashboard') return '◫'
  if (id === 'admin-staff') return '⚙'
  return '•'
}

function renderNav(nav: HTMLElement, activeId: RouteId): void {
  nav.replaceChildren()
  if (!isLoggedIn()) return
  const role = getRole()

  const links = el('div', { class: 'topnav-links' })
  for (const id of navRoutes(role)) {
    if (!canAccess(role, id)) continue
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
  const main = el('main', { class: 'main' })
  const pageHost = el('div', { class: 'page-host' })
  main.append(breadcrumb, pageHost)

  const hero = marketingHero()
  const contentArea = el('div', { class: 'content-area' }, hero, main)
  const layoutBody = el('div', { class: 'layout-body' }, contentArea)

  root.append(header, nav, layoutBody, appFooter())

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
    hero.classList.toggle('is-hidden', logged)
    layoutBody.classList.toggle('is-authenticated', logged)
    document.body.dataset.route = id
    document.body.classList.toggle('auth-screen', !logged)

    renderNav(nav, id)
    renderBreadcrumb(breadcrumb, id)
    pageHost.replaceChildren(viewMap[id]())
    document.title = `${config.title} · ${BRAND.shortName}`
  })
}
