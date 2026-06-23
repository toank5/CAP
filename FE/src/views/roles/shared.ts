import { getRole, getRouteConfig, navigate, type RouteId } from '../../router'
import { el } from '../../ui/helpers'

export interface RoleTheme {
  className: string
  badge: string
  icon: string
}

export const ROLE_THEMES: Record<string, RoleTheme> = {
  'System Administrator': {
    className: 'role-admin',
    badge: 'Quản trị viên',
    icon: '⚙',
  },
  'Ward Manager': {
    className: 'role-ward',
    badge: 'Quản lý phường',
    icon: '◫',
  },
  'Verification Officer': {
    className: 'role-verifier',
    badge: 'Cán bộ thẩm định',
    icon: '✓',
  },
  Applicant: {
    className: 'role-applicant',
    badge: 'Người dùng',
    icon: '⌂',
  },
}

export interface QuickAction {
  title: string
  desc: string
  route: RouteId
  cta?: string
}

export interface WorkflowStep {
  num: string
  title: string
  desc: string
}

export function countFromPaged(data: unknown): number {
  if (!data || typeof data !== 'object') return 0
  const o = data as Record<string, unknown>
  if (typeof o.totalCount === 'number') return o.totalCount
  if (typeof o.TotalCount === 'number') return o.TotalCount
  const items = o.items ?? o.Items ?? o.data ?? o.Data
  return Array.isArray(items) ? items.length : 0
}

export function extractList(data: unknown): unknown[] {
  if (!data || typeof data !== 'object') return []
  const o = data as Record<string, unknown>
  const items = o.items ?? o.Items ?? o.data ?? o.Data ?? o.staff ?? o.Staff
  if (Array.isArray(items)) return items
  if (Array.isArray(data)) return data as unknown[]
  return []
}

export function statCard(value: string | number, label: string, hint?: string): HTMLElement {
  return el(
    'div',
    { class: 'role-stat' },
    el('span', { class: 'role-stat-value' }, String(value)),
    el('span', { class: 'role-stat-label' }, label),
    hint ? el('span', { class: 'role-stat-hint' }, hint) : el('span'),
  )
}

export function quickActionCard(action: QuickAction): HTMLElement {
  const btn = el(
    'button',
    { type: 'button', class: 'role-action' },
    el('span', { class: 'role-action-title' }, action.title),
    el('span', { class: 'role-action-desc' }, action.desc),
    el('span', { class: 'role-action-cta' }, action.cta ?? 'Mở →'),
  )
  btn.addEventListener('click', () => navigate(action.route))
  return btn
}

export function workflowPanel(steps: WorkflowStep[]): HTMLElement {
  return el(
    'aside',
    { class: 'role-workflow' },
    el('h3', { class: 'role-panel-title' }, 'Quy trình làm việc'),
    el(
      'ol',
      { class: 'role-steps' },
      ...steps.map((s) =>
        el('li', { class: 'role-step' },
          el('span', { class: 'role-step-num' }, s.num),
          el('div', {},
            el('strong', {}, s.title),
            el('p', {}, s.desc),
          ),
        ),
      ),
    ),
  )
}

export function activityPanel(
  title: string,
  emptyText: string,
  rowsHost: HTMLElement,
): HTMLElement {
  return el(
    'section',
    { class: 'role-activity' },
    el('h3', { class: 'role-panel-title' }, title),
    rowsHost,
    el('p', { class: 'role-empty is-hidden' }, emptyText),
  )
}

export function activityRow(
  primary: string,
  secondary: string,
  badge: HTMLElement,
  onClick: () => void,
): HTMLElement {
  const row = el(
    'button',
    { type: 'button', class: 'role-activity-row' },
    el('div', { class: 'role-activity-text' },
      el('strong', {}, primary),
      el('span', {}, secondary),
    ),
    badge,
  )
  row.addEventListener('click', onClick)
  return row
}

export function buildRolePage(
  routeId: RouteId,
  intro: string,
  statsHost: HTMLElement,
  actions: QuickAction[],
  extraSections: HTMLElement[] = [],
  sidebar?: HTMLElement,
): HTMLElement {
  const m = getRouteConfig(routeId)
  const role = getRole()
  const theme = ROLE_THEMES[role] ?? ROLE_THEMES.Applicant

  const welcome = el('p', { class: 'role-welcome' }, 'Đang tải thông tin...')
  const actionsGrid = el('div', { class: 'role-actions' }, ...actions.map(quickActionCard))

  const main = el(
    'div',
    { class: 'role-main' },
    el('section', { class: 'role-section' },
      el('h3', { class: 'role-panel-title' }, 'Thao tác nhanh'),
      actionsGrid,
    ),
    ...extraSections,
  )

  const body = sidebar
    ? el('div', { class: 'role-body' }, main, sidebar)
    : el('div', { class: 'role-body role-body-single' }, main)

  const page = el(
    'article',
    { class: `page role-page ${theme.className}` },
    el(
      'header',
      { class: 'role-hero' },
      el('span', { class: 'role-hero-icon', 'aria-hidden': 'true' }, theme.icon),
      el('span', { class: 'role-badge' }, theme.badge),
      el('h2', { class: 'role-title' }, m.title),
      el('p', { class: 'role-lead' }, intro),
      welcome,
    ),
    el('div', { class: 'role-stats' }, statsHost),
    body,
  )

  return page
}

export function setWelcome(elm: HTMLElement, name?: string | null): void {
  if (name?.trim()) {
    elm.textContent = `Xin chào, ${name.trim()}`
    return
  }
  const role = getRole()
  elm.textContent = `Vai trò: ${ROLE_THEMES[role]?.badge ?? role}`
}
