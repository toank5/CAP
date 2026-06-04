import { housingProjectsApi } from '../api/housing-projects'
import { getRouteConfig, navigate } from '../router'
import { el, fdStr, field, onFormSubmit, showResult } from '../ui/helpers'
import { pageWithContent } from '../ui/page'

export function projectsView(): HTMLElement {
  const m = getRouteConfig('projects')
  const result = el('div', { class: 'panel-result', 'aria-live': 'polite' })
  const projectsList = el('div', { class: 'projects-list' })
  const createBtn = el('button', { type: 'button', class: 'btn-primary' }, 'Tạo dự án mới')

  let allProjects: any[] = []

  const filterForm = el(
    'form',
    { class: 'filter-card', style: 'padding: 12px; border: 1px solid #e0e0e0; border-radius: 8px; margin-bottom: 16px; background: #f9f9f9;' },
    el('div', { style: 'display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px;' },
      field('Tìm kiếm', 'search', 'text', {}),
      field('Địa điểm', 'location', 'text', {}),
      field('Giá tối đa', 'maxPrice', 'number', {}),
    ),
    field('Số đơn vị tối thiểu', 'minAvailable', 'number', {}),
    el('button', { type: 'submit', class: 'btn-secondary', style: 'margin-top: 8px;' }, 'Tìm kiếm'),
    el('button', { type: 'reset', class: 'btn-ghost', style: 'margin-top: 8px; margin-left: 8px;' }, 'Xóa bộ lọc'),
  )

  const applyFilters = () => {
    const formData = new FormData(filterForm)
    const search = fdStr(formData, 'search').toLowerCase()
    const location = fdStr(formData, 'location').toLowerCase()
    const maxPrice = parseFloat(fdStr(formData, 'maxPrice')) || Infinity
    const minAvailable = parseFloat(fdStr(formData, 'minAvailable')) || 0

    const filtered = allProjects.filter((project) => {
      const matchName = !search || project.name.toLowerCase().includes(search)
      const matchLocation = !location || project.location.toLowerCase().includes(location)
      const matchPrice = project.pricePerUnit <= maxPrice
      const matchAvailable = project.availableUnits >= minAvailable
      return matchName && matchLocation && matchPrice && matchAvailable
    })

    if (filtered.length === 0) {
      projectsList.replaceChildren(el('p', {}, 'Không tìm thấy dự án nào.'))
      return
    }

    const items = filtered.map((project: any) =>
      el(
        'div',
        { class: 'project-card', style: 'cursor: pointer; padding: 16px; border: 1px solid #ccc; border-radius: 8px; margin-bottom: 12px;' },
        el('h3', {}, project.name || 'N/A'),
        el('p', {}, `Địa điểm: ${project.location || 'N/A'}`),
        el('p', {}, `Giá: ${project.pricePerUnit?.toLocaleString('vi-VN') || 'N/A'} VNĐ`),
        el('p', {}, `Có sẵn: ${project.availableUnits || 0}/${project.totalUnits || 0} đơn vị`),
        el('button', { type: 'button', class: 'btn-secondary', style: 'margin-top: 8px;' }, 'Chi tiết'),
      ),
    )

    items.forEach((item, index) => {
      const btn = item.querySelector('button')
      if (btn) {
        btn.addEventListener('click', () => {
          const projectId = filtered[index].id
          navigate('project-detail')
          sessionStorage.setItem('projectId', projectId)
        })
      }
    })

    projectsList.replaceChildren(...items)
  }

  filterForm.addEventListener('submit', (e) => {
    e.preventDefault()
    applyFilters()
  })

  filterForm.addEventListener('reset', () => {
    setTimeout(() => {
      projectsList.replaceChildren(
        ...allProjects.map((project: any) =>
          el(
            'div',
            { class: 'project-card', style: 'cursor: pointer; padding: 16px; border: 1px solid #ccc; border-radius: 8px; margin-bottom: 12px;' },
            el('h3', {}, project.name || 'N/A'),
            el('p', {}, `Địa điểm: ${project.location || 'N/A'}`),
            el('p', {}, `Giá: ${project.pricePerUnit?.toLocaleString('vi-VN') || 'N/A'} VNĐ`),
            el('p', {}, `Có sẵn: ${project.availableUnits || 0}/${project.totalUnits || 0} đơn vị`),
            el('button', { type: 'button', class: 'btn-secondary', style: 'margin-top: 8px;' }, 'Chi tiết'),
          ),
        ),
      )
    }, 0)
  })

  const loadProjects = async () => {
    projectsList.replaceChildren(el('p', {}, 'Đang tải...'))
    try {
      const data = await housingProjectsApi.list()
      allProjects = (data as { data?: Array<any> })?.data ?? []

      if (allProjects.length === 0) {
        projectsList.replaceChildren(el('p', {}, 'Không có dự án nào.'))
      } else {
        applyFilters()
      }
    } catch (err) {
      projectsList.replaceChildren(el('p', { style: 'color: red;' }, String(err)))
    }
  }

  createBtn.addEventListener('click', () => {
    navigate('create-project')
  })

  const toolbar = el('div', { class: 'toolbar' }, createBtn)
  const page = pageWithContent(m, toolbar, filterForm, projectsList, result)

  // Load projects when view is shown
  const observer = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) {
      loadProjects()
    }
  })
  observer.observe(page)

  return page
}

export function createProjectView(): HTMLElement {
  const m = getRouteConfig('create-project')
  const result = el('div', { class: 'panel-result', 'aria-live': 'polite' })

  const form = el(
    'form',
    { class: 'form-card' },
    field('Tên dự án', 'name'),
    field('Địa điểm', 'location'),
    field('Mô tả', 'description', 'text', {}),
    field('Tổng số đơn vị', 'totalUnits', 'number'),
    field('Số đơn vị có sẵn', 'availableUnits', 'number'),
    field('Giá mỗi đơn vị', 'pricePerUnit', 'number'),
    field('Ngày bắt đầu xây dựng', 'constructionStartDate', 'date', {}),
    field('Ngày dự kiến hoàn thành', 'expectedCompletionDate', 'date', {}),
    el('button', { type: 'submit', class: 'btn-primary' }, m.cta),
  )

  onFormSubmit(form, result, async (fd) =>
    housingProjectsApi.create({
      name: fdStr(fd, 'name'),
      location: fdStr(fd, 'location'),
      description: fdStr(fd, 'description') || undefined,
      totalUnits: parseInt(fdStr(fd, 'totalUnits'), 10) || 0,
      availableUnits: parseInt(fdStr(fd, 'availableUnits'), 10) || 0,
      pricePerUnit: parseFloat(fdStr(fd, 'pricePerUnit')) || 0,
      constructionStartDate: fdStr(fd, 'constructionStartDate') || undefined,
      expectedCompletionDate: fdStr(fd, 'expectedCompletionDate') || undefined,
    }),
  )

  result.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).textContent?.includes('Chi tiết')) {
      navigate('projects')
    }
  })

  return pageWithContent(m, form, result)
}

export function projectDetailView(): HTMLElement {
  const m = getRouteConfig('project-detail')
  const result = el('div', { class: 'panel-result', 'aria-live': 'polite' })
  const projectId = sessionStorage.getItem('projectId')

  if (!projectId) {
    return pageWithContent(m, el('p', { style: 'color: red;' }, 'Không tìm thấy dự án'))
  }

  const form = el(
    'form',
    { class: 'form-card' },
    field('Tên dự án', 'name'),
    field('Địa điểm', 'location'),
    field('Mô tả', 'description', 'text', {}),
    field('Tổng số đơn vị', 'totalUnits', 'number'),
    field('Số đơn vị có sẵn', 'availableUnits', 'number'),
    field('Giá mỗi đơn vị', 'pricePerUnit', 'number'),
    field('Ngày bắt đầu xây dựng', 'constructionStartDate', 'date', {}),
    field('Ngày dự kiến hoàn thành', 'expectedCompletionDate', 'date', {}),
    el('div', { style: 'display: flex; gap: 8px; margin-top: 16px;' },
      el('button', { type: 'submit', class: 'btn-primary' }, 'Cập nhật'),
      el('button', { type: 'button', class: 'btn-danger', style: 'background: #dc3545;' }, 'Xóa'),
    ),
  )

  const loadProject = async () => {
    try {
      const data = await housingProjectsApi.getById(projectId)
      const project = (data as { data?: any })?.data

      if (project) {
        const nameInput = form.querySelector<HTMLInputElement>('[name=name]')
        const locationInput = form.querySelector<HTMLInputElement>('[name=location]')
        const descInput = form.querySelector<HTMLInputElement>('[name=description]')
        const totalUnitsInput = form.querySelector<HTMLInputElement>('[name=totalUnits]')
        const availableUnitsInput = form.querySelector<HTMLInputElement>('[name=availableUnits]')
        const priceInput = form.querySelector<HTMLInputElement>('[name=pricePerUnit]')
        const startDateInput = form.querySelector<HTMLInputElement>('[name=constructionStartDate]')
        const endDateInput = form.querySelector<HTMLInputElement>('[name=expectedCompletionDate]')

        if (nameInput) nameInput.value = project.name || ''
        if (locationInput) locationInput.value = project.location || ''
        if (descInput) descInput.value = project.description || ''
        if (totalUnitsInput) totalUnitsInput.value = project.totalUnits || 0
        if (availableUnitsInput) availableUnitsInput.value = project.availableUnits || 0
        if (priceInput) priceInput.value = project.pricePerUnit || 0
        if (startDateInput) startDateInput.value = project.constructionStartDate || ''
        if (endDateInput) endDateInput.value = project.expectedCompletionDate || ''
      }
    } catch (err) {
      showResult(result, null, err)
    }
  }

  onFormSubmit(form, result, async (fd) =>
    housingProjectsApi.update(projectId, {
      name: fdStr(fd, 'name'),
      location: fdStr(fd, 'location'),
      description: fdStr(fd, 'description') || undefined,
      totalUnits: parseInt(fdStr(fd, 'totalUnits'), 10) || 0,
      availableUnits: parseInt(fdStr(fd, 'availableUnits'), 10) || 0,
      pricePerUnit: parseFloat(fdStr(fd, 'pricePerUnit')) || 0,
      constructionStartDate: fdStr(fd, 'constructionStartDate') || undefined,
      expectedCompletionDate: fdStr(fd, 'expectedCompletionDate') || undefined,
    }),
  )

  const deleteBtn = form.querySelector('button[type="button"]')
  if (deleteBtn) {
    deleteBtn.addEventListener('click', async (e) => {
      e.preventDefault()
      if (confirm('Bạn có chắc chắn muốn xóa dự án này?')) {
        deleteBtn.setAttribute('disabled', 'true')
        try {
          const data = await housingProjectsApi.delete(projectId)
          showResult(result, data)
          setTimeout(() => navigate('projects'), 1500)
        } catch (err) {
          showResult(result, null, err)
        } finally {
          deleteBtn.removeAttribute('disabled')
        }
      }
    })
  }

  const page = pageWithContent(m, form, result)
  loadProject()
  return page
}
