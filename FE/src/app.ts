import { BRAND } from './brand'
import {
  getRouteConfig,
  isLoggedIn,
  navigate,
  NAV_GROUP_LABELS,
  onRouteChange,
  routes,
  type NavGroup,
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
import { dashboardView, profileView } from './views/users'
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
  dashboard: dashboardView,
  profile: profileView,
  'change-password': changePasswordView,
}

const GROUP_ORDER: NavGroup[] = ['access', 'security', 'workspace']

function renderNav(nav: HTMLElement, activeId: RouteId): void {
  nav.replaceChildren()
  const logged = isLoggedIn()
  const visible = routes.filter((r) => {
    if (r.auth && !logged) return false
    if (!r.auth && logged && ['login', 'register'].includes(r.id)) return false
    return true
  })

  for (const group of GROUP_ORDER) {
    const items = visible.filter((r) => r.group === group)
    if (!items.length) continue

    const block = el('div', { class: 'nav-group' })
    block.append(el('span', { class: 'nav-group-label' }, NAV_GROUP_LABELS[group]))
    for (const r of items) {
      const a = el(
        'a',
        {
          href: `#/${r.id}`,
          class: `nav-link${activeId === r.id ? ' active' : ''}`,
        },
        r.label,
      )
      a.addEventListener('click', (e) => {
        e.preventDefault()
        navigate(r.id)
      })
      block.append(a)
    }
    nav.append(block)
  }

  if (logged) {
    const session = el('div', { class: 'nav-session' })
    session.append(
      el('span', { class: 'session-label' }, 'Trạng thái phiên'),
      el('div', { class: 'session-status' },
        el('span', { class: 'session-dot', 'aria-hidden': 'true' }),
        'Đã xác thực',
      ),
    )
    const out = el('button', { type: 'button', class: 'btn-ghost' }, 'Kết thúc phiên')
    out.addEventListener('click', () => {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      navigate('login')
    })
    nav.append(session, out)
  }
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

  const nav = el('nav', { class: 'sidebar', 'aria-label': 'Menu chức năng' })
  const breadcrumb = el('div', { class: 'breadcrumb-bar' })
  const main = el('main', { class: 'main' })
  const pageHost = el('div', { class: 'page-host' })
  main.append(breadcrumb, pageHost)

  const hero = marketingHero()
  const contentArea = el('div', { class: 'content-area' }, hero, main)
  const layoutBody = el('div', { class: 'layout-body' }, nav, contentArea)

  root.append(header, layoutBody, appFooter())

  onRouteChange((id) => {
    const config = getRouteConfig(id)
    if (config.auth && !isLoggedIn()) {
      navigate('login')
      return
    }

    const logged = isLoggedIn()
    hero.classList.toggle('is-hidden', logged)
    layoutBody.classList.toggle('is-authenticated', logged)
    document.body.dataset.route = id

    renderNav(nav, id)
    renderBreadcrumb(breadcrumb, id)
    pageHost.replaceChildren(viewMap[id]())
    document.title = `${config.title} · ${BRAND.shortName}`
  })
}
