import {
  housingApplicationsApi,
  parseApplicationDetail,
} from '../api/housing-applications'
import { getRouteConfig } from '../router'
import { el, field, formatError } from '../ui/helpers'
import { pageHeader } from '../ui/page'

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Nháp',
  SUBMITTED: 'Đã nộp',
  UNDER_REVIEW: 'Đang thẩm định',
  NEED_MORE_DOCUMENTS: 'Cần bổ sung giấy tờ',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Từ chối',
}

function statusClass(status: string): string {
  if (status === 'APPROVED') return 'is-success'
  if (status === 'REJECTED') return 'is-failed'
  if (status === 'NEED_MORE_DOCUMENTS') return 'is-cancelled'
  if (status === 'DRAFT') return 'is-pending'
  return 'is-info'
}

export function traCuuView(): HTMLElement {
  const m = getRouteConfig('tra-cuu')
  const result = el('div', { class: 'panel-result', 'aria-live': 'polite' })
  const timeline = el('div', { class: 'lookup-timeline' })
  const detail = el('div', { class: 'lookup-detail is-hidden' })

  const form = el(
    'form',
    { class: 'form-card lookup-form' },
    field('Mã hồ sơ (UUID)', 'applicationId', 'text', { placeholder: 'Nhập mã hồ sơ...', required: 'true' }),
    el('button', { type: 'submit', class: 'btn-primary' }, m.cta),
  )

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    const id = new FormData(form).get('applicationId')?.toString().trim()
    if (!id) return

    result.textContent = 'Đang tra cứu...'
    result.className = 'panel-result is-info'
    detail.classList.add('is-hidden')
    timeline.replaceChildren()

    try {
      const raw = await housingApplicationsApi.getById(id)
      const app = parseApplicationDetail(raw)
      if (!app) throw new Error('Không tìm thấy hồ sơ')

      result.textContent = ''
      result.className = 'panel-result'
      detail.classList.remove('is-hidden')

      const status = app.applicationStatus
      detail.replaceChildren(
        el('div', { class: 'lookup-summary' },
          el('h3', {}, app.projectName || 'Dự án'),
          el('p', {}, `Người nộp: ${app.fullName ?? '—'}`),
          el('p', {}, `CCCD: ${app.citizenId}`),
          el('span', { class: `app-status ${statusClass(status)}` }, STATUS_LABELS[status] ?? status),
        ),
      )

      const histories = app.reviewHistories ?? []
      if (histories.length === 0) {
        timeline.replaceChildren(el('p', { class: 'lookup-empty' }, 'Chưa có lịch sử xử lý.'))
      } else {
        timeline.replaceChildren(
          el('h3', { class: 'lookup-timeline-title' }, 'Tiến độ xử lý'),
          el('ol', { class: 'lookup-steps' },
            ...histories.map((h) =>
              el('li', { class: 'lookup-step' },
                el('strong', {}, h.action),
                el('span', {}, `${new Date(h.changedAt).toLocaleString('vi-VN')} · ${h.changedByFullName}`),
                h.note ? el('p', {}, h.note) : el('span'),
              ),
            ),
          ),
        )
      }
    } catch (err) {
      result.textContent = formatError(err)
      result.className = 'panel-result is-failed'
    }
  })

  return el(
    'article',
    { class: 'page lookup-page' },
    pageHeader(m),
    el('div', { class: 'card' }, form, result, detail, timeline),
  )
}
