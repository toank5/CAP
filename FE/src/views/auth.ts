import { authApi } from '../api/auth'
import { saveTokensFromResponse } from '../api/http'
import { getRouteConfig, isLoggedIn, navigate, roleHome, setRole, type RouteId } from '../router'
import { el, fdStr, field, onFormSubmit, showResult } from '../ui/helpers'
import { mountGoogleSignInButton } from '../ui/google-signin'
import { formPage, pageHeader, pageWithContent } from '../ui/page'

let pendingOtpEmail = ''

function authSwitch(prompt: string, linkText: string, target: RouteId): HTMLElement {
  const link = el('a', { href: `#/${target}`, class: 'auth-switch-link' }, linkText)
  link.addEventListener('click', (e) => {
    e.preventDefault()
    navigate(target)
  })
  return el('p', { class: 'auth-switch' }, prompt + ' ', link)
}

function extractRole(data: unknown): string {
  if (!data || typeof data !== 'object') return ''
  const o = data as Record<string, unknown>
  const user = (o.user ?? o.User) as Record<string, unknown> | undefined
  if (user && typeof user === 'object') {
    const r = user.role ?? user.Role
    if (typeof r === 'string') return r
  }
  return ''
}

export function loginView(): HTMLElement {
  const m = getRouteConfig('login')
  const result = el('div', { class: 'panel-result', 'aria-live': 'polite' })
  const form = el(
    'form',
    { class: 'form-card' },
    field('Email công việc', 'email', 'email'),
    field('Mật khẩu', 'password', 'password'),
    el('button', { type: 'submit', class: 'btn-primary' }, m.cta),
  )

  void onFormSubmit(form, result, async (fd) => {
    const data = await authApi.login({
      email: fdStr(fd, 'email'),
      password: fdStr(fd, 'password'),
    })
    saveTokensFromResponse(data)
    const o = (data ?? {}) as Record<string, unknown>
    if (o.requiresOtpVerification === true || o.RequiresOtpVerification === true) {
      pendingOtpEmail = fdStr(fd, 'email')
      setTimeout(() => navigate('verify-otp'), 700)
    } else if (isLoggedIn()) {
      const role = extractRole(data)
      setRole(role)
      setTimeout(() => navigate(roleHome(role)), 700)
    }
    return data
  })

  return el(
    'article',
    { class: 'page' },
    pageHeader(m),
    el(
      'div',
      { class: 'card' },
      form,
      authSwitch('Chưa có tài khoản?', 'Đăng ký ngay', 'register'),
      result,
    ),
  )
}

export function registerView(): HTMLElement {
  const m = getRouteConfig('register')
  const result = el('div', { class: 'panel-result', 'aria-live': 'polite' })

  const roleField = el(
    'div',
    { class: 'form-field' },
    el('label', { for: 'role' }, 'Vai trò'),
    el(
      'select',
      { name: 'role', id: 'role', class: 'form-select' },
      el('option', { value: 'Applicant' }, 'Người dùng'),
      el('option', { value: 'Ward Manager' }, 'Quản lý phường'),
      el('option', { value: 'Verification Officer' }, 'Cán bộ thẩm định'),
    ),
  )

  const form = el(
    'form',
    { class: 'form-card' },
    field('Email', 'email', 'email'),
    field('Mật khẩu', 'password', 'password'),
    field('Họ và tên', 'fullName'),
    field('Số điện thoại', 'phoneNumber', 'tel'),
    roleField,
    el('button', { type: 'submit', class: 'btn-primary' }, m.cta),
  )

  void onFormSubmit(form, result, async (fd) => {
    const email = fdStr(fd, 'email')
    const data = await authApi.register({
      email,
      password: fdStr(fd, 'password'),
      fullName: fdStr(fd, 'fullName'),
      phoneNumber: fdStr(fd, 'phoneNumber') || null,
      role: fdStr(fd, 'role'),
    })
    pendingOtpEmail = email
    setTimeout(() => navigate('verify-otp'), 900)
    return data
  })

  return el(
    'article',
    { class: 'page' },
    pageHeader(m),
    el(
      'div',
      { class: 'card' },
      form,
      authSwitch('Đã có tài khoản?', 'Đăng nhập', 'login'),
      result,
    ),
  )
}

export function verifyOtpView(): HTMLElement {
  const m = getRouteConfig('verify-otp')
  const result = el('div', { class: 'panel-result', 'aria-live': 'polite' })

  const emailField = field('Email', 'email', 'email')
  const emailInput = emailField.querySelector('input')!
  if (pendingOtpEmail) emailInput.value = pendingOtpEmail

  const form = el(
    'form',
    { class: 'form-card' },
    emailField,
    field('Mã OTP (6 số)', 'otpCode', 'text', {
      maxlength: '6',
      minlength: '6',
      inputmode: 'numeric',
      autocomplete: 'one-time-code',
      placeholder: 'Nhập 6 số',
    }),
    el('button', { type: 'submit', class: 'btn-primary' }, m.cta),
  )

  void onFormSubmit(form, result, async (fd) => {
    const data = await authApi.verifyOtp({
      email: fdStr(fd, 'email'),
      otpCode: fdStr(fd, 'otpCode'),
    })
    // Xác thực xong yêu cầu đăng nhập lại → quay về trang đăng nhập
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    pendingOtpEmail = ''
    setTimeout(() => navigate('login'), 900)
    return data
  })

  const resendBtn = el(
    'button',
    { type: 'button', class: 'btn-ghost otp-resend' },
    'Gửi lại OTP',
  )
  resendBtn.addEventListener('click', async () => {
    const email = emailInput.value.trim()
    if (!email) {
      showResult(result, null, new Error('Vui lòng nhập email để nhận lại mã OTP.'))
      return
    }
    resendBtn.setAttribute('disabled', 'true')
    try {
      const data = await authApi.resendOtp(email)
      showResult(result, data)
      let remaining = 30
      resendBtn.textContent = `Gửi lại sau ${remaining}s`
      const timer = window.setInterval(() => {
        remaining -= 1
        if (remaining <= 0) {
          window.clearInterval(timer)
          resendBtn.removeAttribute('disabled')
          resendBtn.textContent = 'Gửi lại OTP'
        } else {
          resendBtn.textContent = `Gửi lại sau ${remaining}s`
        }
      }, 1000)
    } catch (err) {
      showResult(result, null, err)
      resendBtn.removeAttribute('disabled')
    }
  })

  const resendRow = el(
    'div',
    { class: 'otp-resend-row' },
    el('span', { class: 'otp-resend-hint' }, 'Chưa nhận được mã?'),
    resendBtn,
  )

  return el(
    'article',
    { class: 'page' },
    pageHeader(m),
    el(
      'div',
      { class: 'card' },
      form,
      resendRow,
      authSwitch('Đã xác thực xong?', 'Về đăng nhập', 'login'),
      result,
    ),
  )
}

export function resendOtpView(): HTMLElement {
  const m = getRouteConfig('resend-otp')
  return formPage(m, [field('Email', 'email', 'email')], async (fd) =>
    authApi.resendOtp(fdStr(fd, 'email')),
  )
}

export function googleLoginView(): HTMLElement {
  const m = getRouteConfig('google-login')
  const result = el('div', { class: 'panel-result', 'aria-live': 'polite' })
  const googleBox = el('div', { class: 'google-signin-box' })
  const roleInput = field('Vai trò (tài khoản mới)', 'role', 'text', {
    placeholder: 'Applicant',
  })
  const roleField = roleInput.querySelector('input')!

  void mountGoogleSignInButton(googleBox, async (idToken) => {
    try {
      const data = await authApi.googleLogin({
        googleIdToken: idToken,
        role: roleField.value.trim() || null,
      })
      saveTokensFromResponse(data)
      showResult(result, data)
      if (isLoggedIn()) {
        const role = extractRole(data)
        setRole(role)
        setTimeout(() => navigate(roleHome(role)), 700)
      }
    } catch (err) {
      showResult(result, null, err)
    }
  })

  return pageWithContent(
    m,
    el(
      'p',
      { class: 'card-lead' },
      'Chọn tài khoản Google được phép truy cập. Hệ thống sẽ xác thực và mở phiên làm việc cho bạn.',
    ),
    googleBox,
    roleInput,
    result,
  )
}

export function forgotPasswordView(): HTMLElement {
  const m = getRouteConfig('forgot-password')
  return formPage(m, [field('Email đã đăng ký', 'email', 'email')], async (fd) =>
    authApi.forgotPassword({ email: fdStr(fd, 'email') }),
  )
}

export function resetPasswordView(): HTMLElement {
  const m = getRouteConfig('reset-password')
  return formPage(
    m,
    [
      field('Email', 'email', 'email'),
      field('Mã OTP', 'otpCode', 'text', { maxlength: '6', minlength: '6' }),
      field('Mật khẩu mới', 'newPassword', 'password'),
      field('Xác nhận mật khẩu', 'confirmPassword', 'password'),
    ],
    async (fd) =>
      authApi.resetPassword({
        email: fdStr(fd, 'email'),
        otpCode: fdStr(fd, 'otpCode'),
        newPassword: fdStr(fd, 'newPassword'),
        confirmPassword: fdStr(fd, 'confirmPassword'),
      }),
  )
}

export function changePasswordView(): HTMLElement {
  const m = getRouteConfig('change-password')
  return formPage(
    m,
    [
      field('Mật khẩu hiện tại', 'currentPassword', 'password'),
      field('Mật khẩu mới', 'newPassword', 'password'),
      field('Xác nhận mật khẩu', 'confirmPassword', 'password'),
    ],
    async (fd) =>
      authApi.changePassword({
        currentPassword: fdStr(fd, 'currentPassword'),
        newPassword: fdStr(fd, 'newPassword'),
        confirmPassword: fdStr(fd, 'confirmPassword'),
      }),
  )
}
