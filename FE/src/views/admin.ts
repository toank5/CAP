import { adminApi } from '../api/admin'
import { getRouteConfig, navigate } from '../router'
import { el, fdStr, field, onFormSubmit } from '../ui/helpers'
import { pageWithContent } from '../ui/page'

export function adminStaffView(): HTMLElement {
  const m = getRouteConfig('admin-staff')
  const result = el('div', { class: 'panel-result', 'aria-live': 'polite' })
  const staffList = el('div', { class: 'staff-list' })
  const createBtn = el('button', { type: 'button', class: 'btn-primary' }, 'Thêm cán bộ mới')

  const loadStaff = async () => {
    staffList.replaceChildren(el('p', {}, 'Đang tải...'))
    try {
      const data = await adminApi.getStaffList()
      const staffs = (data as { data?: Array<any> })?.data ?? []

      if (staffs.length === 0) {
        staffList.replaceChildren(el('p', {}, 'Không có cán bộ nào.'))
      } else {
        const items = staffs.map((staff: any) =>
          el(
            'div',
            { class: 'staff-card', style: 'padding: 16px; border: 1px solid #ccc; border-radius: 8px; margin-bottom: 12px;' },
            el('h3', {}, staff.fullName || 'N/A'),
            el('p', {}, `Email: ${staff.email || 'N/A'}`),
            el('p', {}, `Số điện thoại: ${staff.phoneNumber || 'N/A'}`),
            el('p', {}, `Vai trò: ${staff.role || 'N/A'}`),
            el('p', { style: `color: ${staff.isActive ? 'green' : 'red'};` }, 
              staff.isActive ? '✓ Hoạt động' : '✗ Vô hiệu'
            ),
            el('button', { type: 'button', class: 'btn-secondary', style: 'margin-top: 8px;' }, 'Chi tiết'),
          ),
        )

        items.forEach((item, index) => {
          const btn = item.querySelector('button')
          if (btn) {
            btn.addEventListener('click', () => {
              const staffId = staffs[index].id
              navigate('staff-detail')
              sessionStorage.setItem('staffId', staffId)
            })
          }
        })

        staffList.replaceChildren(...items)
      }
    } catch (err) {
      staffList.replaceChildren(el('p', { style: 'color: red;' }, String(err)))
    }
  }

  createBtn.addEventListener('click', () => {
    navigate('create-staff')
  })

  const toolbar = el('div', { class: 'toolbar' }, createBtn)
  const page = pageWithContent(m, toolbar, staffList, result)

  const observer = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) {
      loadStaff()
    }
  })
  observer.observe(page)

  return page
}

export function createStaffView(): HTMLElement {
  const m = getRouteConfig('create-staff')
  const result = el('div', { class: 'panel-result', 'aria-live': 'polite' })

  const form = el(
    'form',
    { class: 'form-card' },
    field('Email', 'email', 'email'),
    field('Họ và tên', 'fullName'),
    field('Số điện thoại', 'phoneNumber', 'tel', {}),
    field('Vai trò', 'role'),
    el('button', { type: 'submit', class: 'btn-primary' }, m.cta),
  )

  onFormSubmit(form, result, async (fd) =>
    adminApi.createStaff({
      email: fdStr(fd, 'email'),
      fullName: fdStr(fd, 'fullName'),
      phoneNumber: fdStr(fd, 'phoneNumber') || null,
      role: fdStr(fd, 'role'),
    }),
  )

  return pageWithContent(m, form, result)
}

export function staffDetailView(): HTMLElement {
  const m = getRouteConfig('staff-detail')
  const result = el('div', { class: 'panel-result', 'aria-live': 'polite' })
  const staffId = sessionStorage.getItem('staffId')

  if (!staffId) {
    return pageWithContent(m, el('p', { style: 'color: red;' }, 'Không tìm thấy cán bộ'))
  }

  const form = el(
    'form',
    { class: 'form-card' },
    field('Họ và tên', 'fullName'),
    field('Số điện thoại', 'phoneNumber', 'tel', {}),
    field('Vai trò', 'role'),
    el('div', { style: 'display: flex; gap: 8px; margin-top: 16px;' },
      el('button', { type: 'submit', class: 'btn-primary' }, 'Cập nhật'),
      el('button', { type: 'button', class: 'btn-secondary', id: 'resetPwdBtn' }, 'Đặt lại MK'),
      el('button', { type: 'button', class: 'btn-secondary', id: 'deactivateBtn' }, 'Vô hiệu hóa'),
    ),
  )

  const loadStaff = async () => {
    try {
      const data = await adminApi.getStaff(staffId)
      const staff = (data as { data?: any })?.data

      if (staff) {
        const fullNameInput = form.querySelector<HTMLInputElement>('[name=fullName]')
        const phoneInput = form.querySelector<HTMLInputElement>('[name=phoneNumber]')
        const roleInput = form.querySelector<HTMLInputElement>('[name=role]')

        if (fullNameInput) fullNameInput.value = staff.fullName || ''
        if (phoneInput) phoneInput.value = staff.phoneNumber || ''
        if (roleInput) roleInput.value = staff.role || ''

        // Update button text based on status
        const deactivateBtn = form.querySelector('#deactivateBtn') as HTMLButtonElement
        if (deactivateBtn) {
          deactivateBtn.textContent = staff.isActive ? 'Vô hiệu hóa' : 'Kích hoạt'
        }
      }
    } catch (err) {
      result.textContent = String(err)
    }
  }

  onFormSubmit(form, result, async (fd) =>
    adminApi.updateStaff(staffId, {
      fullName: fdStr(fd, 'fullName'),
      phoneNumber: fdStr(fd, 'phoneNumber') || null,
      role: fdStr(fd, 'role'),
    }),
  )

  const resetPwdBtn = form.querySelector('#resetPwdBtn') as HTMLButtonElement
  const deactivateBtn = form.querySelector('#deactivateBtn') as HTMLButtonElement

  if (resetPwdBtn) {
    resetPwdBtn.addEventListener('click', async (e) => {
      e.preventDefault()
      if (!confirm('Đặt lại mật khẩu cho cán bộ này?')) return
      resetPwdBtn.setAttribute('disabled', 'true')
      try {
        await adminApi.resetPassword(staffId)
        result.textContent = 'Mật khẩu đã được đặt lại'
      } catch (err) {
        result.textContent = String(err)
      } finally {
        resetPwdBtn.removeAttribute('disabled')
      }
    })
  }

  if (deactivateBtn) {
    deactivateBtn.addEventListener('click', async (e) => {
      e.preventDefault()
      const action = deactivateBtn.textContent?.includes('Vô hiệu') ? 'vô hiệu hóa' : 'kích hoạt'
      if (!confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} cán bộ này?`)) return
      deactivateBtn.setAttribute('disabled', 'true')
      try {
        const isDeactivate = deactivateBtn.textContent?.includes('Vô hiệu')
        isDeactivate ? await adminApi.deactivateStaff(staffId) : await adminApi.activateStaff(staffId)
        result.textContent = `Cán bộ đã được ${action}`
        setTimeout(() => navigate('admin-staff'), 1500)
      } catch (err) {
        result.textContent = String(err)
      } finally {
        deactivateBtn.removeAttribute('disabled')
      }
    })
  }

  const page = pageWithContent(m, form, result)
  loadStaff()
  return page
}
