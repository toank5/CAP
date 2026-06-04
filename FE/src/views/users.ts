import { authApi } from '../api/auth'
import { saveTokensFromResponse } from '../api/http'
import { usersApi } from '../api/users'
import { getRouteConfig } from '../router'
import { el, fdStr, field, onFormSubmit, showResult } from '../ui/helpers'
import { pageHeader, pageWithContent } from '../ui/page'

export function profileView(): HTMLElement {
  const m = getRouteConfig('profile')
  const result = el('div', { class: 'panel-result', 'aria-live': 'polite' })
  const getBtn = el('button', { type: 'button', class: 'btn-secondary' }, 'Xem hồ sơ')

  const imagePreview = el('img', {
    style: 'max-width: 150px; max-height: 150px; border-radius: 8px; margin-bottom: 16px; display: none;',
  })

  const imageInput = el('input', { type: 'file', name: 'profileImage', accept: 'image/*', style: 'margin-bottom: 8px;' })

  const uploadImageBtn = el('button', { type: 'button', class: 'btn-secondary', style: 'margin-right: 8px;' }, 'Upload ảnh')
  const deleteImageBtn = el('button', { type: 'button', class: 'btn-danger', style: 'background: #dc3545; display: none;' }, 'Xóa ảnh')

  uploadImageBtn.addEventListener('click', async (e) => {
    e.preventDefault()
    const file = imageInput.files?.[0]
    if (!file) {
      alert('Vui lòng chọn file ảnh')
      return
    }
    uploadImageBtn.setAttribute('disabled', 'true')
    try {
      const data = await usersApi.uploadProfileImage(file)
      showResult(result, data)
      deleteImageBtn.style.display = 'block'
    } catch (err) {
      showResult(result, null, err)
    } finally {
      uploadImageBtn.removeAttribute('disabled')
    }
  })

  deleteImageBtn.addEventListener('click', async (e) => {
    e.preventDefault()
    if (!confirm('Xóa ảnh đại diện?')) return
    deleteImageBtn.setAttribute('disabled', 'true')
    try {
      const data = await usersApi.deleteProfileImage()
      showResult(result, data)
      imagePreview.style.display = 'none'
      deleteImageBtn.style.display = 'none'
      imageInput.value = ''
    } catch (err) {
      showResult(result, null, err)
    } finally {
      deleteImageBtn.removeAttribute('disabled')
    }
  })

  const form = el(
    'form',
    { class: 'form-card' },
    el('div', { style: 'margin-bottom: 16px;' }, imagePreview),
    el('div', { style: 'margin-bottom: 8px;' }, 
      el('label', {}, 'Ảnh đại diện:'),
      imageInput,
    ),
    el('div', { style: 'margin-bottom: 16px;' }, uploadImageBtn, deleteImageBtn),
    field('Họ và tên', 'fullName'),
    field('Số điện thoại', 'phoneNumber', 'tel', {}),
    el('button', { type: 'submit', class: 'btn-primary' }, m.cta),
  )

  getBtn.addEventListener('click', async () => {
    getBtn.setAttribute('disabled', 'true')
    try {
      const data = await usersApi.getProfile()
      const user = (data as { user?: { fullName?: string; phoneNumber?: string; profileImageUrl?: string } })?.user
      if (user?.fullName) {
        const nameInput = form.querySelector<HTMLInputElement>('[name=fullName]')
        if (nameInput) nameInput.value = user.fullName
      }
      if (user?.phoneNumber) {
        const phoneInput = form.querySelector<HTMLInputElement>('[name=phoneNumber]')
        if (phoneInput) phoneInput.value = user.phoneNumber
      }
      if (user?.profileImageUrl) {
        imagePreview.src = user.profileImageUrl
        imagePreview.style.display = 'block'
        deleteImageBtn.style.display = 'block'
      }
      showResult(result, data)
    } catch (err) {
      showResult(result, null, err)
    } finally {
      getBtn.removeAttribute('disabled')
    }
  })

  onFormSubmit(form, result, async (fd) =>
    usersApi.updateProfile({
      fullName: fdStr(fd, 'fullName'),
      phoneNumber: fdStr(fd, 'phoneNumber') || null,
    }),
  )

  return pageWithContent(m, el('div', { class: 'toolbar' }, getBtn), form, result)
}

export function dashboardView(): HTMLElement {
  const m = getRouteConfig('dashboard')
  const result = el('div', { class: 'panel-result', 'aria-live': 'polite' })

  const mk = (
    accent: string,
    icon: string,
    title: string,
    desc: string,
    btnLabel: string,
    fn: () => Promise<unknown>,
    savesToken = false,
  ) => {
    const card = el('div', { class: `action-card ${accent}` })
    const btn = el('button', { type: 'button', class: 'btn-card' }, btnLabel)
    card.append(
      el('span', { class: 'action-icon', 'aria-hidden': 'true' }, icon),
      el('h3', { class: 'action-title' }, title),
      el('p', { class: 'action-desc' }, desc),
      btn,
    )
    btn.addEventListener('click', async () => {
      btn.setAttribute('disabled', 'true')
      try {
        const data = await fn()
        if (savesToken) saveTokensFromResponse(data)
        showResult(result, data)
      } catch (err) {
        showResult(result, null, err)
      } finally {
        btn.removeAttribute('disabled')
      }
    })
    return card
  }

  const refresh = localStorage.getItem('refreshToken') ?? ''

  const grid = el(
    'div',
    { class: 'action-grid' },
    mk('accent-red', '★', 'Quyền quản trị', 'Kiểm tra bạn có quyền Admin hay không.', 'Kiểm tra', () =>
      usersApi.adminOnly(),
    ),
    mk('accent-teal', '◆', 'Quyền cán bộ', 'Kiểm tra bạn có quyền Officer hay không.', 'Kiểm tra', () =>
      usersApi.officerOnly(),
    ),
    mk(
      'accent-gold',
      '↻',
      'Làm mới phiên',
      'Gia hạn thời gian đăng nhập an toàn.',
      'Làm mới',
      () => authApi.refreshToken({ refreshToken: refresh }),
      true,
    ),
    mk('accent-blue', '⏻', 'Đăng xuất', 'Kết thúc phiên trên máy chủ.', 'Đăng xuất', () =>
      authApi.logout({ refreshToken: refresh }),
    ),
  )

  const page = el('article', { class: 'page' }, pageHeader(m))
  page.append(
    el('div', { class: 'card card-dashboard' },
      el('p', { class: 'card-lead' }, 'Chọn thao tác bên dưới để quản lý phiên và kiểm tra vai trò của bạn.'),
      grid,
      result,
    ),
  )
  return page
}
