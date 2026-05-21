import type { RouteConfig } from '../router'
import { el, onFormSubmit } from './helpers'

export function formPage(
  meta: Pick<RouteConfig, 'title' | 'subtitle' | 'cta'>,
  fields: HTMLElement[],
  handler: (fd: FormData) => Promise<unknown>,
): HTMLElement {
  const result = el('div', { class: 'panel-result', 'aria-live': 'polite' })
  const form = el(
    'form',
    { class: 'form-card' },
    ...fields,
    el('button', { type: 'submit', class: 'btn-primary' }, meta.cta),
  )

  const page = el(
    'article',
    { class: 'page' },
    pageHeader(meta),
    el('div', { class: 'card' }, form, result),
  )

  onFormSubmit(form, result, handler)
  return page
}

export function pageHeader(meta: Pick<RouteConfig, 'title' | 'subtitle'>): HTMLElement {
  return el(
    'header',
    { class: 'page-header' },
    el('h2', { class: 'page-title' }, meta.title),
    el('p', { class: 'page-desc' }, meta.subtitle),
  )
}

export function pageWithContent(
  meta: Pick<RouteConfig, 'title' | 'subtitle'>,
  ...nodes: HTMLElement[]
): HTMLElement {
  return el('article', { class: 'page' }, pageHeader(meta), el('div', { class: 'card' }, ...nodes))
}
