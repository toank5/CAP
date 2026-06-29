import {
  housingApplicationsApi,
  parseApplicationDetail,
  parsePagedApplications,
} from '../api/housing-applications'
import { housingProjectsApi } from '../api/housing-projects'
import { ekycApi, parseOcr } from '../api/ekyc'
import { getRole, getRouteConfig, navigate } from '../router'
import type { ApplicationDetailDto, ApplicationSummaryDto } from '../types'
import { el, fdStr, field, formatError, onFormSubmit, showResult } from '../ui/helpers'
import { pageHeader } from '../ui/page'

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Nháp',
  SUBMITTED: 'Đã nộp',
  UNDER_REVIEW: 'Đang thẩm định',
  NEED_MORE_DOCUMENTS: 'Cần bổ sung giấy tờ',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Từ chối',
}

const DOC_TYPE_LABELS: Record<string, string> = {
  HOUSING_CONDITION_PROOF: 'Giấy chứng nhận thực trạng nhà ở',
  POVERTY_HOUSEHOLD_CERTIFICATE: 'Giấy chứng nhận hộ nghèo/cận nghèo',
}

const HOUSING_STATUS_LABELS: Record<string, string> = {
  NO_HOUSE: 'Chưa có nhà ở',
  SMALL_HOUSE: 'Nhà diện tích dưới 15m²',
}

function statusBadge(status: string): HTMLElement {
  const label = STATUS_LABELS[status] ?? status
  const cls =
    status === 'APPROVED'
      ? 'is-success'
      : status === 'REJECTED'
        ? 'is-failed'
        : status === 'DRAFT'
          ? 'is-pending'
          : status === 'NEED_MORE_DOCUMENTS'
            ? 'is-cancelled'
            : 'is-info'
  return el('span', { class: `app-status ${cls}` }, label)
}

function selectField(
  label: string,
  name: string,
  options: { value: string; label: string }[],
  extra: Record<string, string> = {},
): HTMLDivElement {
  const id = name
  const select = el('select', { name, id, ...extra })
  for (const opt of options) {
    select.append(el('option', { value: opt.value }, opt.label))
  }
  return el('div', { class: 'form-field' }, el('label', { for: id }, label), select)
}

function applicationCard(app: ApplicationSummaryDto, onOpen: () => void): HTMLElement {
  const card = el(
    'button',
    { type: 'button', class: 'app-card' },
    el('div', { class: 'app-card-head' },
      el('h3', { class: 'app-card-title' }, app.projectName || 'Dự án'),
      statusBadge(app.applicationStatus),
    ),
    el('p', { class: 'app-card-meta' }, `${app.applicantFullName} · CCCD: ${app.citizenId}`),
    el('p', { class: 'app-card-meta' },
      `Thu nhập: ${Number(app.estimatedMonthlyIncome).toLocaleString('vi-VN')} VNĐ/ tháng`,
    ),
    el('p', { class: 'app-card-meta' },
      `${app.documentCount} tài liệu · ${new Date(app.createdAt).toLocaleDateString('vi-VN')}`,
    ),
  )
  card.addEventListener('click', onOpen)
  return card
}

export function applicationsView(): HTMLElement {
  const m = getRouteConfig('applications')
  const role = getRole()
  const result = el('div', { class: 'panel-result', 'aria-live': 'polite' })
  const listHost = el('div', { class: 'app-list' })
  const isApplicant = role === 'Applicant'

  const filterForm = el(
    'form',
    { class: 'filter-card app-filter' },
    el('div', { class: 'app-filter-grid' },
      field('Tìm kiếm (họ tên / CCCD)', 'search', 'text', {}),
      selectField('Trạng thái', 'status', [
        { value: '', label: 'Tất cả' },
        ...Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label })),
      ]),
    ),
    el('button', { type: 'submit', class: 'btn-secondary' }, 'Lọc'),
  )

  const load = async (filter?: { search?: string; status?: string }) => {
    listHost.replaceChildren(el('p', { class: 'app-loading' }, 'Đang tải...'))
    try {
      const data = isApplicant
        ? await housingApplicationsApi.getMy({ pageIndex: 1, pageSize: 20, ...filter })
        : await housingApplicationsApi.getAll({ pageIndex: 1, pageSize: 20, ...filter })
      const apps = parsePagedApplications(data)

      if (apps.length === 0) {
        listHost.replaceChildren(
          el('p', { class: 'app-empty' },
            isApplicant
              ? 'Bạn chưa có hồ sơ nào.'
              : 'Không có hồ sơ phù hợp.',
          ),
        )
        return
      }

      listHost.replaceChildren(
        ...apps.map((app) =>
          applicationCard(app, () => {
            sessionStorage.setItem('applicationId', app.applicationId)
            navigate('application-detail')
          }),
        ),
      )
    } catch (err) {
      listHost.replaceChildren(el('p', { class: 'app-error' }, formatError(err)))
    }
  }

  filterForm.addEventListener('submit', (e) => {
    e.preventDefault()
    const fd = new FormData(filterForm)
    void load({
      search: fdStr(fd, 'search') || undefined,
      status: fdStr(fd, 'status') || undefined,
    })
  })

  const page = el(
    'article',
    { class: 'page app-page' },
    pageHeader(m),
    el('div', { class: 'card' },
      filterForm,
      listHost,
      result,
    ),
  )

  void load()
  return page
}

export function createApplicationView(): HTMLElement {
  const m = getRouteConfig('create-application')
  const result = el('div', { class: 'panel-result', 'aria-live': 'polite' })
  const projectSelect = selectField('Dự án nhà ở', 'projectId', [{ value: '', label: 'Đang tải dự án...' }], {
    required: 'true',
  })

  const ocrSection = el(
    'div',
    { class: 'ekyc-section' },
    el('h4', { class: 'section-title' }, 'Quét CCCD (tùy chọn)'),
    el('p', { class: 'section-hint' }, 'Upload ảnh CCCD để tự điền họ tên, số CCCD và địa chỉ.'),
    el('input', { type: 'file', accept: 'image/jpeg,image/png', class: 'ekyc-file', id: 'ocr-file' }),
    el('button', { type: 'button', class: 'btn-secondary ekyc-btn' }, 'Trích xuất OCR'),
  )

  const form = el(
    'form',
    { class: 'form-card app-form' },
    projectSelect,
    ocrSection,
    field('Họ và tên', 'fullName', 'text', { required: 'true' }),
    field('Số CCCD', 'citizenId', 'text', { required: 'true', pattern: '\\d{9}(\\d{3})?', maxlength: '12' }),
    field('Nghề nghiệp', 'occupation', 'text', {}),
    field('Nơi làm việc', 'workPlace', 'text', {}),
    field('Nơi ở hiện tại', 'currentResidence', 'text', { required: 'true' }),
    field('Địa chỉ thường trú/tạm trú', 'permanentAddress', 'text', { required: 'true' }),
    selectField('Thực trạng nhà ở', 'housingStatus', [
      { value: 'NO_HOUSE', label: HOUSING_STATUS_LABELS.NO_HOUSE },
      { value: 'SMALL_HOUSE', label: HOUSING_STATUS_LABELS.SMALL_HOUSE },
    ], { required: 'true' }),
    field('Thu nhập hàng tháng (VNĐ)', 'estimatedMonthlyIncome', 'number', {
      required: 'true',
      min: '0',
      step: '1000',
    }),
    el('button', { type: 'submit', class: 'btn-primary' }, 'Tạo hồ sơ nháp'),
  )

  ocrSection.querySelector('.ekyc-btn')?.addEventListener('click', async () => {
    const input = ocrSection.querySelector<HTMLInputElement>('#ocr-file')
    const file = input?.files?.[0]
    if (!file) {
      showResult(result, null, new Error('Chọn ảnh CCCD trước.'))
      return
    }
    try {
      const data = await ekycApi.ocr(file)
      const ocr = parseOcr(data)
      if (ocr?.name) form.querySelector<HTMLInputElement>('[name=fullName]')!.value = ocr.name
      if (ocr?.id) form.querySelector<HTMLInputElement>('[name=citizenId]')!.value = ocr.id
      if (ocr?.address || ocr?.home) {
        const addr = ocr.address || ocr.home || ''
        form.querySelector<HTMLInputElement>('[name=currentResidence]')!.value = addr
        form.querySelector<HTMLInputElement>('[name=permanentAddress]')!.value = addr
      }
      showResult(result, data)
    } catch (err) {
      showResult(result, null, err)
    }
  })

  void housingProjectsApi.list().then((data) => {
    const select = projectSelect.querySelector('select')!
    select.replaceChildren()
    const items =
      data && typeof data === 'object'
        ? ((data as Record<string, unknown>).items ??
            (data as Record<string, unknown>).Items ??
            data)
        : []
    const projects = Array.isArray(items) ? items : []
    if (projects.length === 0) {
      select.append(el('option', { value: '' }, 'Không có dự án'))
      projectSelect.append(
        el('p', { class: 'section-hint app-error' },
          'Chưa có dự án nhà ở trong hệ thống. Admin/Quản lý phường cần tạo dự án trước (mục Dự án).',
        ),
      )
      return
    }
    for (const p of projects as Record<string, unknown>[]) {
      const id = String(p.id ?? p.Id ?? '')
      const name = String(p.name ?? p.Name ?? id)
      select.append(el('option', { value: id }, name))
    }
  }).catch(() => {
    projectSelect.querySelector('select')!.replaceChildren(
      el('option', { value: '' }, 'Không tải được danh sách dự án'),
    )
  })

  onFormSubmit(form, result, async (fd) => {
    const projectId = fdStr(fd, 'projectId')
    if (!projectId) throw new Error('Chọn dự án nhà ở.')
    const body = {
      projectId,
      fullName: fdStr(fd, 'fullName'),
      citizenId: fdStr(fd, 'citizenId'),
      occupation: fdStr(fd, 'occupation') || null,
      workPlace: fdStr(fd, 'workPlace') || null,
      currentResidence: fdStr(fd, 'currentResidence'),
      permanentAddress: fdStr(fd, 'permanentAddress'),
      housingStatus: fdStr(fd, 'housingStatus'),
      estimatedMonthlyIncome: parseFloat(fdStr(fd, 'estimatedMonthlyIncome')) || 0,
    }
    const data = await housingApplicationsApi.create(body)
    const appId =
      data && typeof data === 'object'
        ? String(
            (data as Record<string, unknown>).applicationId ??
              (data as Record<string, unknown>).ApplicationId ??
              '',
          )
        : ''
    if (appId) {
      sessionStorage.setItem('applicationId', appId)
      setTimeout(() => navigate('application-detail'), 800)
    }
    return data
  })

  return el(
    'article',
    { class: 'page app-page' },
    pageHeader(m),
    el('div', { class: 'card' }, form, result),
  )
}

function detailSection(title: string, ...rows: HTMLElement[]): HTMLElement {
  return el(
    'section',
    { class: 'app-detail-section' },
    el('h4', { class: 'section-title' }, title),
    el('div', { class: 'app-detail-grid' }, ...rows),
  )
}

function detailRow(label: string, value: string): HTMLElement {
  return el('div', { class: 'app-detail-row' },
    el('span', { class: 'app-detail-label' }, label),
    el('span', { class: 'app-detail-value' }, value),
  )
}

function renderDetail(app: ApplicationDetailDto, host: HTMLElement, result: HTMLElement): void {
  const role = getRole()
  host.replaceChildren()

  const header = el(
    'div',
    { class: 'app-detail-head' },
    el('h3', {}, app.projectName),
    statusBadge(app.applicationStatus),
  )

  const info = detailSection(
    'Thông tin đăng ký',
    detailRow('Họ tên', app.fullName),
    detailRow('CCCD', app.citizenId),
    detailRow('Nghề nghiệp', app.occupation || '—'),
    detailRow('Nơi làm việc', app.workPlace || '—'),
    detailRow('Nơi ở hiện tại', app.currentResidence),
    detailRow('Thường trú/tạm trú', app.permanentAddress),
    detailRow('Thực trạng nhà ở', HOUSING_STATUS_LABELS[app.housingStatus] ?? app.housingStatus),
    detailRow('Thu nhập/tháng', `${Number(app.estimatedMonthlyIncome).toLocaleString('vi-VN')} VNĐ`),
    detailRow('Ngày tạo', new Date(app.createdAt).toLocaleString('vi-VN')),
  )

  if (app.officerFullName) {
    info.append(detailRow('Cán bộ thẩm định', app.officerFullName))
  }

  const docsList = el('div', { class: 'app-docs-list' })
  const docs = app.documents ?? []
  if (docs.length === 0) {
    docsList.append(el('p', { class: 'app-empty' }, 'Chưa có tài liệu đính kèm.'))
  } else {
    for (const doc of docs) {
      const row = el(
        'div',
        { class: 'app-doc-row' },
        el('div', {},
          el('strong', {}, DOC_TYPE_LABELS[doc.documentType] ?? doc.documentType),
          el('p', { class: 'app-card-meta' }, `${doc.fileName} · ${(doc.fileSizeBytes / 1024).toFixed(0)} KB`),
        ),
        el('a', { href: doc.fileUrl, target: '_blank', rel: 'noopener', class: 'btn-ghost' }, 'Xem PDF'),
      )
      if (
        role === 'Applicant' &&
        (app.applicationStatus === 'DRAFT' || app.applicationStatus === 'NEED_MORE_DOCUMENTS')
      ) {
        const delBtn = el('button', { type: 'button', class: 'btn-ghost is-danger' }, 'Xóa')
        delBtn.addEventListener('click', async () => {
          try {
            await housingApplicationsApi.deleteDocument(app.applicationId, doc.documentId)
            const refreshed = await housingApplicationsApi.getById(app.applicationId)
            renderDetail(parseApplicationDetail(refreshed)!, host, result)
            showResult(result, { success: true, message: 'Đã xóa tài liệu.' })
          } catch (err) {
            showResult(result, null, err)
          }
        })
        row.append(delBtn)
      }
      docsList.append(row)
    }
  }

  const docsSection = el('section', { class: 'app-detail-section' },
    el('h4', { class: 'section-title' }, 'Tài liệu đính kèm (PDF, tối đa 10MB)'),
    docsList,
  )

  if (
    role === 'Applicant' &&
    (app.applicationStatus === 'DRAFT' || app.applicationStatus === 'NEED_MORE_DOCUMENTS')
  ) {
    const uploadForm = el(
      'form',
      { class: 'app-upload-form' },
      selectField('Loại giấy tờ', 'documentType', [
        { value: 'HOUSING_CONDITION_PROOF', label: DOC_TYPE_LABELS.HOUSING_CONDITION_PROOF },
        { value: 'POVERTY_HOUSEHOLD_CERTIFICATE', label: DOC_TYPE_LABELS.POVERTY_HOUSEHOLD_CERTIFICATE },
      ]),
      el('div', { class: 'form-field' },
        el('label', { for: 'doc-file' }, 'File PDF'),
        el('input', { type: 'file', name: 'file', id: 'doc-file', accept: 'application/pdf', required: 'true' }),
      ),
      el('button', { type: 'submit', class: 'btn-secondary' }, 'Upload tài liệu'),
    )
    uploadForm.addEventListener('submit', async (e) => {
      e.preventDefault()
      const fd = new FormData(uploadForm)
      const file = fd.get('file') as File | null
      const documentType = fdStr(fd, 'documentType')
      if (!file?.size) {
        showResult(result, null, new Error('Chọn file PDF.'))
        return
      }
      try {
        await housingApplicationsApi.uploadDocument(app.applicationId, documentType, file)
        const refreshed = await housingApplicationsApi.getById(app.applicationId)
        renderDetail(parseApplicationDetail(refreshed)!, host, result)
        showResult(result, { success: true, message: 'Upload tài liệu thành công.' })
      } catch (err) {
        showResult(result, null, err)
      }
    })
    docsSection.append(uploadForm)
  }

  const actions = el('div', { class: 'app-actions toolbar' })

  if (role === 'Applicant' && app.applicationStatus === 'DRAFT') {
    const submitBtn = el('button', { type: 'button', class: 'btn-primary' }, 'Nộp hồ sơ')
    submitBtn.addEventListener('click', async () => {
      try {
        await housingApplicationsApi.submit(app.applicationId)
        const refreshed = await housingApplicationsApi.getById(app.applicationId)
        renderDetail(parseApplicationDetail(refreshed)!, host, result)
        showResult(result, { success: true, message: 'Đã nộp hồ sơ thành công.' })
      } catch (err) {
        showResult(result, null, err)
      }
    })
    actions.append(submitBtn)
  }

  if (role === 'Verification Officer' && ['SUBMITTED', 'NEED_MORE_DOCUMENTS'].includes(app.applicationStatus)) {
    const assignBtn = el('button', { type: 'button', class: 'btn-primary' }, 'Nhận hồ sơ thẩm định')
    assignBtn.addEventListener('click', async () => {
      try {
        await housingApplicationsApi.assign(app.applicationId)
        const refreshed = await housingApplicationsApi.getById(app.applicationId)
        renderDetail(parseApplicationDetail(refreshed)!, host, result)
        showResult(result, { success: true, message: 'Đã nhận hồ sơ.' })
      } catch (err) {
        showResult(result, null, err)
      }
    })
    actions.append(assignBtn)
  }

  if (role === 'Verification Officer' && app.applicationStatus === 'UNDER_REVIEW') {
    const approveBtn = el('button', { type: 'button', class: 'btn-primary' }, 'Phê duyệt')
    approveBtn.addEventListener('click', () => {
      void reviewAction(app.applicationId, 'vo', 'APPROVE', host, result)
    })
    const rejectBtn = el('button', { type: 'button', class: 'btn-secondary is-danger' }, 'Từ chối')
    rejectBtn.addEventListener('click', () => {
      void reviewAction(app.applicationId, 'vo', 'REJECT', host, result, true)
    })
    actions.append(approveBtn, rejectBtn)
  }

  if (role === 'Ward Manager' && app.applicationStatus === 'UNDER_REVIEW') {
    const wmApprove = el('button', { type: 'button', class: 'btn-primary' }, 'Phê duyệt')
    wmApprove.addEventListener('click', () => {
      void reviewAction(app.applicationId, 'wm', 'APPROVE', host, result)
    })
    const wmMore = el('button', { type: 'button', class: 'btn-secondary' }, 'Yêu cầu bổ sung')
    wmMore.addEventListener('click', () => {
      void reviewAction(app.applicationId, 'wm', 'REQUEST_MORE_DOCUMENTS', host, result, true)
    })
    const wmReject = el('button', { type: 'button', class: 'btn-secondary is-danger' }, 'Từ chối')
    wmReject.addEventListener('click', () => {
      void reviewAction(app.applicationId, 'wm', 'REJECT', host, result, true)
    })
    actions.append(wmApprove, wmMore, wmReject)
  }

  const historySection = el('section', { class: 'app-detail-section' },
    el('h4', { class: 'section-title' }, 'Lịch sử xét duyệt'),
  )
  const histories = app.reviewHistories ?? []
  if (histories.length === 0) {
    historySection.append(el('p', { class: 'app-empty' }, 'Chưa có lịch sử.'))
  } else {
    const ul = el('ul', { class: 'app-history' })
    for (const h of histories) {
      ul.append(
        el('li', {},
          el('strong', {}, `${STATUS_LABELS[h.oldStatus] ?? h.oldStatus} → ${STATUS_LABELS[h.newStatus] ?? h.newStatus}`),
          el('span', { class: 'app-card-meta' },
            ` · ${h.changedByFullName} · ${new Date(h.changedAt).toLocaleString('vi-VN')}`,
          ),
          h.note ? el('p', {}, h.note) : el('span'),
        ),
      )
    }
    historySection.append(ul)
  }

  host.append(header, info, docsSection, actions, historySection)
}

async function reviewAction(
  applicationId: string,
  reviewer: 'vo' | 'wm',
  action: string,
  host: HTMLElement,
  result: HTMLElement,
  needNote = false,
): Promise<void> {
  let note: string | null = null
  if (needNote) {
    note = window.prompt('Nhập ghi chú / lý do:')
    if (!note?.trim()) {
      showResult(result, null, new Error('Ghi chú là bắt buộc.'))
      return
    }
  }
  try {
    const body = { action, note: note?.trim() || null }
    if (reviewer === 'vo') {
      await housingApplicationsApi.voReview(applicationId, body)
    } else {
      await housingApplicationsApi.wmReview(applicationId, body)
    }
    const refreshed = await housingApplicationsApi.getById(applicationId)
    renderDetail(parseApplicationDetail(refreshed)!, host, result)
    showResult(result, { success: true, message: 'Cập nhật hồ sơ thành công.' })
  } catch (err) {
    showResult(result, null, err)
  }
}

export function applicationDetailView(): HTMLElement {
  const m = getRouteConfig('application-detail')
  const result = el('div', { class: 'panel-result', 'aria-live': 'polite' })
  const detailHost = el('div', { class: 'app-detail' })
  const backBtn = el('button', { type: 'button', class: 'btn-ghost' }, '← Danh sách hồ sơ')
  backBtn.addEventListener('click', () => navigate('applications'))

  const page = el(
    'article',
    { class: 'page app-page' },
    pageHeader(m),
    el('div', { class: 'card' },
      backBtn,
      detailHost,
      result,
    ),
  )

  const id = sessionStorage.getItem('applicationId')
  if (!id) {
    detailHost.replaceChildren(el('p', { class: 'app-error' }, 'Không tìm thấy hồ sơ. Quay lại danh sách.'))
    return page
  }

  detailHost.replaceChildren(el('p', { class: 'app-loading' }, 'Đang tải...'))
  void housingApplicationsApi.getById(id).then((data) => {
    const app = parseApplicationDetail(data)
    if (!app) {
      detailHost.replaceChildren(el('p', { class: 'app-error' }, 'Không đọc được dữ liệu hồ sơ.'))
      return
    }
    renderDetail(app, detailHost, result)
  }).catch((err) => {
    detailHost.replaceChildren(el('p', { class: 'app-error' }, formatError(err)))
  })

  return page
}
