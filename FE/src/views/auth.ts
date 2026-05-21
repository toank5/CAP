import { authApi } from '../api/auth'
import { saveTokensFromResponse } from '../api/http'
import { getRouteConfig } from '../router'
import { el, fdStr, field, showResult } from '../ui/helpers'
import { mountGoogleSignInButton } from '../ui/google-signin'
import { formPage, pageWithContent } from '../ui/page'

export function loginView(): HTMLElement {
  const m = getRouteConfig('login')
  return formPage(
    m,
    [
      field('Email công việc', 'email', 'email'),
      field('Mật khẩu', 'password', 'password'),
    ],
    async (fd) => {
      const data = await authApi.login({
        email: fdStr(fd, 'email'),
        password: fdStr(fd, 'password'),
      })
      saveTokensFromResponse(data)
      return data
    },
  )
}

export function registerView(): HTMLElement {
  const m = getRouteConfig('register')
  return formPage(
    m,
    [
      field('Email', 'email', 'email'),
      field('Mật khẩu', 'password', 'password'),
      field('Họ và tên', 'fullName'),
      field('Số điện thoại', 'phoneNumber', 'tel'),
      field('Vai trò', 'role', 'text', { placeholder: 'Ví dụ: Officer, Admin...' }),
    ],
    async (fd) =>
      authApi.register({
        email: fdStr(fd, 'email'),
        password: fdStr(fd, 'password'),
        fullName: fdStr(fd, 'fullName'),
        phoneNumber: fdStr(fd, 'phoneNumber') || null,
        role: fdStr(fd, 'role'),
      }),
  )
}

export function verifyOtpView(): HTMLElement {
  const m = getRouteConfig('verify-otp')
  return formPage(
    m,
    [
      field('Email', 'email', 'email'),
      field('Mã OTP (6 số)', 'otpCode', 'text', { maxlength: '6', minlength: '6' }),
    ],
    async (fd) => {
      const data = await authApi.verifyOtp({
        email: fdStr(fd, 'email'),
        otpCode: fdStr(fd, 'otpCode'),
      })
      saveTokensFromResponse(data)
      return data
    },
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
