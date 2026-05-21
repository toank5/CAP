export type RouteId =
  | 'login'
  | 'register'
  | 'verify-otp'
  | 'resend-otp'
  | 'google-login'
  | 'forgot-password'
  | 'reset-password'
  | 'dashboard'
  | 'profile'
  | 'change-password'

export type NavGroup = 'access' | 'security' | 'workspace'

export interface RouteConfig {
  id: RouteId
  label: string
  group: NavGroup
  auth?: boolean
  title: string
  subtitle: string
  cta: string
}

export const NAV_GROUP_LABELS: Record<NavGroup, string> = {
  access: 'Đăng nhập & đăng ký',
  security: 'Xác thực & mật khẩu',
  workspace: 'Quản trị tài khoản',
}

export const routes: RouteConfig[] = [
  {
    id: 'login',
    label: 'Đăng nhập',
    group: 'access',
    title: 'Đăng nhập',
    subtitle: 'Nhập email và mật khẩu được cấp để vào hệ thống.',
    cta: 'Đăng nhập',
  },
  {
    id: 'register',
    label: 'Đăng ký',
    group: 'access',
    title: 'Đăng ký tài khoản',
    subtitle: 'Điền thông tin để tạo tài khoản mới trên cổng thông tin.',
    cta: 'Gửi đăng ký',
  },
  {
    id: 'verify-otp',
    label: 'Xác thực OTP',
    group: 'security',
    title: 'Xác thực OTP',
    subtitle: 'Nhập mã 6 số đã gửi tới email của bạn.',
    cta: 'Xác nhận mã',
  },
  {
    id: 'resend-otp',
    label: 'Gửi lại OTP',
    group: 'security',
    title: 'Gửi lại mã OTP',
    subtitle: 'Chưa nhận được mã? Yêu cầu gửi lại qua email.',
    cta: 'Gửi lại mã',
  },
  {
    id: 'google-login',
    label: 'Google',
    group: 'access',
    title: 'Đăng nhập Google',
    subtitle: 'Dùng tài khoản Google được cấp quyền truy cập hệ thống.',
    cta: 'Tiếp tục với Google',
  },
  {
    id: 'forgot-password',
    label: 'Quên mật khẩu',
    group: 'security',
    title: 'Quên mật khẩu',
    subtitle: 'Chúng tôi sẽ gửi hướng dẫn khôi phục tới email đăng ký.',
    cta: 'Gửi yêu cầu',
  },
  {
    id: 'reset-password',
    label: 'Đặt lại MK',
    group: 'security',
    title: 'Đặt lại mật khẩu',
    subtitle: 'Nhập mã OTP và mật khẩu mới từ email khôi phục.',
    cta: 'Cập nhật mật khẩu',
  },
  {
    id: 'dashboard',
    label: 'Tổng quan',
    group: 'workspace',
    auth: true,
    title: 'Bảng điều phối',
    subtitle: 'Quản lý phiên làm việc và kiểm tra quyền theo vai trò.',
    cta: '',
  },
  {
    id: 'profile',
    label: 'Hồ sơ',
    group: 'workspace',
    auth: true,
    title: 'Hồ sơ cá nhân',
    subtitle: 'Xem và cập nhật thông tin liên hệ của bạn.',
    cta: 'Lưu thay đổi',
  },
  {
    id: 'change-password',
    label: 'Đổi mật khẩu',
    group: 'workspace',
    auth: true,
    title: 'Đổi mật khẩu',
    subtitle: 'Đặt mật khẩu mới để bảo vệ tài khoản.',
    cta: 'Cập nhật mật khẩu',
  },
]

export function getRouteConfig(id: RouteId): RouteConfig {
  return routes.find((r) => r.id === id)!
}

export function getRoute(): RouteId {
  const hash = location.hash.replace(/^#\/?/, '') || 'login'
  const found = routes.find((r) => r.id === hash)
  return found?.id ?? 'login'
}

export function navigate(id: RouteId): void {
  location.hash = `#/${id}`
}

export function onRouteChange(cb: (id: RouteId) => void): void {
  const run = () => cb(getRoute())
  window.addEventListener('hashchange', run)
  run()
}

export function isLoggedIn(): boolean {
  return !!localStorage.getItem('accessToken')
}
