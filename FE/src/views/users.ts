import { authApi } from '../api/auth'
import { saveTokensFromResponse } from '../api/http'
import { usersApi } from '../api/users'
import { clearRole, getRole, getRouteConfig, navigate } from '../router'
import { el, fdStr, field, onFormSubmit, showResult } from '../ui/helpers'
import { pageHeader } from '../ui/page'

function setFieldValue(wrap: HTMLElement, value: string): void {
  const input = wrap.querySelector('input')
  if (input) input.value = value
}

const ROLE_LABELS: Record<string, string> = {
  Applicant: 'Người dùng',
  'Ward Manager': 'Quản lý phường',
  'Verification Officer': 'Cán bộ thẩm định',
  'System Administrator': 'Quản trị viên',
}

function roleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role
}

function initials(name: string, email: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return email.slice(0, 2).toUpperCase() || 'ND'
}

function profileImageUrl(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null
  const o = data as Record<string, unknown>
  const direct = o.profileImageUrl ?? o.ProfileImageUrl
  if (typeof direct === 'string' && direct) return direct
  const user = o.user ?? o.User
  if (user && typeof user === 'object') {
    const u = user as Record<string, unknown>
    const url = u.profileImageUrl ?? u.ProfileImageUrl
    if (typeof url === 'string' && url) return url
  }
  return null
}

function showAvatarPreview(
  imagePreview: HTMLImageElement,
  avatarPlaceholder: HTMLElement,
  url: string,
): void {
  imagePreview.src = url
  imagePreview.style.display = 'block'
  avatarPlaceholder.style.display = 'none'
}

export function profileView(): HTMLElement {
  const m = getRouteConfig('profile')
  const result = el('div', { class: 'panel-result', 'aria-live': 'polite' })

  const avatarPlaceholder = el('span', { class: 'profile-avatar-fallback' }, 'ND')
  const imagePreview = el('img', { class: 'profile-avatar', alt: 'Ảnh đại diện' })
  imagePreview.style.display = 'none'

  const avatarWrap = el('div', { class: 'profile-avatar-wrap' }, avatarPlaceholder, imagePreview)

  const imageInput = el('input', {
    type: 'file',
    name: 'profileImage',
    accept: 'image/*',
    class: 'profile-file-input',
  }) as HTMLInputElement

  const pickBtn = el('button', { type: 'button', class: 'btn-secondary profile-pick-btn' }, 'Chọn ảnh')
  const deleteImageBtn = el('button', {
    type: 'button',
    class: 'btn-ghost profile-del-img',
    style: 'display: none;',
  }, 'Xóa')

  let localPreviewUrl: string | null = null
  let hasAvatar = false

  const updateAvatarActions = () => {
    if (hasAvatar) {
      pickBtn.textContent = 'Thay đổi'
      deleteImageBtn.style.display = 'inline-block'
    } else {
      pickBtn.textContent = 'Chọn ảnh'
      deleteImageBtn.style.display = 'none'
    }
  }

  const clearLocalPreview = () => {
    if (localPreviewUrl) {
      URL.revokeObjectURL(localPreviewUrl)
      localPreviewUrl = null
    }
  }

  const resetAvatar = () => {
    clearLocalPreview()
    imagePreview.style.display = 'none'
    imagePreview.removeAttribute('src')
    avatarPlaceholder.style.display = 'flex'
    hasAvatar = false
    imageInput.value = ''
    updateAvatarActions()
  }

  const setAvatarFromUrl = (url: string) => {
    clearLocalPreview()
    showAvatarPreview(imagePreview, avatarPlaceholder, url)
    hasAvatar = true
    updateAvatarActions()
  }

  const uploadAvatar = async (file: File) => {
    pickBtn.setAttribute('disabled', 'true')
    deleteImageBtn.setAttribute('disabled', 'true')
    pickBtn.textContent = 'Đang tải...'
    try {
      const data = await usersApi.uploadProfileImage(file)
      showResult(result, data)
      const url = profileImageUrl(data)
      if (url) {
        setAvatarFromUrl(url)
      } else {
        hasAvatar = true
        updateAvatarActions()
      }
    } catch (err) {
      showResult(result, null, err)
      if (!hasAvatar) resetAvatar()
      else updateAvatarActions()
    } finally {
      pickBtn.removeAttribute('disabled')
      deleteImageBtn.removeAttribute('disabled')
    }
  }

  pickBtn.addEventListener('click', () => imageInput.click())
  imageInput.addEventListener('change', () => {
    const file = imageInput.files?.[0]
    if (!file) return
    clearLocalPreview()
    localPreviewUrl = URL.createObjectURL(file)
    showAvatarPreview(imagePreview, avatarPlaceholder, localPreviewUrl)
    void uploadAvatar(file)
  })

  deleteImageBtn.addEventListener('click', async (e) => {
    e.preventDefault()
    if (!confirm('Xóa ảnh đại diện?')) return
    deleteImageBtn.setAttribute('disabled', 'true')
    pickBtn.setAttribute('disabled', 'true')
    try {
      const data = await usersApi.deleteProfileImage()
      showResult(result, data)
      resetAvatar()
    } catch (err) {
      showResult(result, null, err)
    } finally {
      deleteImageBtn.removeAttribute('disabled')
      pickBtn.removeAttribute('disabled')
    }
  })

  const emailInput = el('input', {
    type: 'email',
    name: 'email',
    id: 'email',
    readonly: 'true',
    class: 'profile-input-readonly',
  }) as HTMLInputElement

  const pwToggleBtn = el('button', { type: 'button', class: 'btn-secondary profile-pw-btn' }, 'Đổi mật khẩu')

  const emailRow = el(
    'div',
    { class: 'form-field profile-email-row' },
    el('label', { for: 'email' }, 'Email đăng ký'),
    el('div', { class: 'profile-email-inline' }, emailInput, pwToggleBtn),
  )

  const roleInput = el('input', {
    type: 'text',
    name: 'role',
    id: 'role',
    readonly: 'true',
    class: 'profile-input-readonly profile-role-input',
  }) as HTMLInputElement
  const roleField = el(
    'div',
    { class: 'form-field' },
    el('label', { for: 'role' }, 'Vai trò'),
    roleInput,
  )

  const nameField = field('Họ và tên', 'fullName')
  const phoneField = field('Số điện thoại', 'phoneNumber', 'tel', {})
  phoneField.classList.add('profile-full-row')

  const infoForm = el(
    'form',
    { class: 'form-card profile-form' },
    el('p', { class: 'profile-section-label' }, 'Thông tin tài khoản'),
    emailRow,
    roleField,
    nameField,
    phoneField,
    el('div', { class: 'profile-form-actions' },
      el('button', { type: 'submit', class: 'btn-primary' }, 'Lưu thay đổi'),
    ),
  )

  onFormSubmit(infoForm, result, async (fd) =>
    usersApi.updateProfile({
      fullName: fdStr(fd, 'fullName'),
      phoneNumber: fdStr(fd, 'phoneNumber') || null,
    }),
  )

  const updateAvatarFallback = (name: string, email: string) => {
    avatarPlaceholder.textContent = initials(name, email)
  }

  const loadProfile = async () => {
    try {
      const data = await usersApi.getProfile()
      const u = (data as { user?: Record<string, unknown> })?.user
      if (u) {
        const email = String(u.email ?? u.Email ?? '')
        const name = String(u.fullName ?? u.FullName ?? '')
        const role = String(u.role ?? u.Role ?? getRole())
        emailInput.value = email
        roleInput.value = roleLabel(role)
        setFieldValue(nameField, name)
        setFieldValue(phoneField, String(u.phoneNumber ?? u.PhoneNumber ?? ''))
        updateAvatarFallback(name, email)
        const img = profileImageUrl(u)
        if (img) {
          setAvatarFromUrl(img)
        }
      }
    } catch (err) {
      showResult(result, null, err)
    }
  }

  const pwResult = el('div', { class: 'panel-result profile-pw-result', 'aria-live': 'polite' })
  const pwForm = el(
    'form',
    { class: 'form-card profile-pw-form', style: 'display: none;' },
    el('p', { class: 'profile-section-label' }, 'Bảo mật tài khoản'),
    field('Mật khẩu hiện tại', 'currentPassword', 'password'),
    field('Mật khẩu mới', 'newPassword', 'password'),
    field('Xác nhận mật khẩu', 'confirmPassword', 'password'),
    el('div', { class: 'profile-form-actions' },
      el('button', { type: 'submit', class: 'btn-primary' }, 'Xác nhận đổi mật khẩu'),
    ),
  )

  onFormSubmit(pwForm, pwResult, async (fd) =>
    authApi.changePassword({
      currentPassword: fdStr(fd, 'currentPassword'),
      newPassword: fdStr(fd, 'newPassword'),
      confirmPassword: fdStr(fd, 'confirmPassword'),
    }),
  )

  pwToggleBtn.addEventListener('click', () => {
    const open = pwForm.style.display !== 'none'
    pwForm.style.display = open ? 'none' : 'flex'
    pwToggleBtn.textContent = open ? 'Đổi mật khẩu' : 'Ẩn'
    pwToggleBtn.classList.toggle('is-active', !open)
    if (!open) pwForm.querySelector<HTMLInputElement>('[name=currentPassword]')?.focus()
  })

  const logoutBtn = el('button', { type: 'button', class: 'btn-ghost profile-logout-btn' }, 'Đăng xuất')
  logoutBtn.addEventListener('click', async () => {
    logoutBtn.setAttribute('disabled', 'true')
    const refresh = localStorage.getItem('refreshToken') ?? ''
    try {
      await authApi.logout({ refreshToken: refresh })
    } catch {
      /* bỏ qua lỗi gọi logout, vẫn xóa phiên cục bộ */
    }
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    clearRole()
    navigate('login')
  })

  const page = el(
    'article',
    { class: 'page profile-page' },
    el(
      'div',
      { class: 'card profile-card' },
      el(
        'div',
        { class: 'profile-card-head' },
        el('h2', { class: 'profile-card-title' }, m.title),
        el('p', { class: 'profile-card-desc' }, m.subtitle),
      ),
      el(
        'div',
        { class: 'profile-card-body' },
        el(
          'aside',
          { class: 'profile-aside' },
          avatarWrap,
          el('p', { class: 'profile-aside-label' }, 'Ảnh đại diện'),
          imageInput,
          el('div', { class: 'profile-img-btns' }, pickBtn, deleteImageBtn),
        ),
        el(
          'div',
          { class: 'profile-main' },
          infoForm,
          pwForm,
          pwResult,
          result,
        ),
      ),
      el('div', { class: 'profile-card-foot' }, logoutBtn),
    ),
  )

  void loadProfile()
  return page
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
