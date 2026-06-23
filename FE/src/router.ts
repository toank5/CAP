export type RouteId =
  | 'landing'
  | 'tra-cuu'
  | 'login'
  | 'register'
  | 'verify-otp'
  | 'resend-otp'
  | 'forgot-password'
  | 'reset-password'
  | 'home-admin'
  | 'home-ward'
  | 'home-verifier'
  | 'home-user'
  | 'quan-tam'
  | 'dashboard'
  | 'profile'
  | 'change-password'
  | 'projects'
  | 'project-detail'
  | 'create-project'
  | 'payments'
  | 'create-payment'
  | 'admin-staff'
  | 'create-staff'
  | 'staff-detail'
  | 'applications'
  | 'create-application'
  | 'application-detail'

export type NavGroup = 'access' | 'security' | 'workspace'

export interface RouteConfig {
  id: RouteId
  label: string
  group: NavGroup
  auth?: boolean
  roles?: string[]
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
    id: 'landing',
    label: 'Trang chủ',
    group: 'access',
    title: 'Hệ thống thông tin nhà ở xã hội',
    subtitle: 'Nền tảng kết nối và điều phối nguồn cung nhà ở xã hội thông minh',
    cta: '',
  },
  {
    id: 'tra-cuu',
    label: 'Tra cứu hồ sơ',
    group: 'access',
    title: 'Tra cứu hồ sơ',
    subtitle: 'Nhập mã hồ sơ để xem trạng thái và tiến độ xử lý.',
    cta: 'Tra cứu',
  },
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
    id: 'forgot-password',
    label: 'Quên mật khẩu',
    group: 'security',
    title: 'Quên mật khẩu',
    subtitle: 'Chúng tôi sẽ gửi hướng dẫn khôi phục tới email đăng ký.',
    cta: 'Gửi yêu cầu',
  },
  {
    id: 'reset-password',
    label: 'Đặt lại mật khẩu',
    group: 'security',
    title: 'Đặt lại mật khẩu',
    subtitle: 'Nhập mã OTP và mật khẩu mới từ email khôi phục.',
    cta: 'Cập nhật mật khẩu',
  },
  {
    id: 'home-admin',
    label: 'Trang chủ',
    group: 'workspace',
    auth: true,
    roles: ['System Administrator'],
    title: 'Trang quản trị hệ thống',
    subtitle: 'Trung tâm điều hành — cán bộ, dự án, hồ sơ và thanh toán.',
    cta: '',
  },
  {
    id: 'home-ward',
    label: 'Trang chủ',
    group: 'workspace',
    auth: true,
    roles: ['Ward Manager'],
    title: 'Trang quản lý phường',
    subtitle: 'Phê duyệt hồ sơ và quản lý dự án trên địa bàn phường.',
    cta: '',
  },
  {
    id: 'home-verifier',
    label: 'Trang chủ',
    group: 'workspace',
    auth: true,
    roles: ['Verification Officer'],
    title: 'Trang cán bộ thẩm định',
    subtitle: 'Tiếp nhận, thẩm định và kết luận hồ sơ đăng ký nhà ở.',
    cta: '',
  },
  {
    id: 'home-user',
    label: 'Trang chủ',
    group: 'workspace',
    auth: true,
    roles: ['Applicant'],
    title: 'Trang người dùng',
    subtitle: 'Khám phá nhà ở xã hội, đăng ký hồ sơ và thanh toán trực tuyến.',
    cta: '',
  },
  {
    id: 'quan-tam',
    label: 'Quan tâm',
    group: 'workspace',
    auth: true,
    roles: ['Applicant'],
    title: 'Dự án quan tâm',
    subtitle: 'Những dự án nhà ở bạn đã lưu để theo dõi.',
    cta: '',
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
  {
    id: 'projects',
    label: 'Dự án',
    group: 'workspace',
    auth: true,
    title: 'Danh sách dự án nhà ở',
    subtitle: 'Quản lý các dự án nhà ở xã hội.',
    cta: 'Tạo dự án mới',
  },
  {
    id: 'create-project',
    label: 'Tạo dự án',
    group: 'workspace',
    auth: true,
    title: 'Tạo dự án nhà ở',
    subtitle: 'Tạo một dự án nhà ở xã hội mới.',
    cta: 'Tạo dự án',
  },
  {
    id: 'project-detail',
    label: 'Chi tiết dự án',
    group: 'workspace',
    auth: true,
    title: 'Chi tiết dự án',
    subtitle: 'Xem và cập nhật thông tin dự án.',
    cta: 'Cập nhật',
  },
  {
    id: 'payments',
    label: 'Thanh toán',
    group: 'workspace',
    auth: true,
    title: 'Lịch sử thanh toán',
    subtitle: 'Xem lịch sử các giao dịch thanh toán của bạn.',
    cta: 'Tạo thanh toán mới',
  },
  {
    id: 'create-payment',
    label: 'Tạo thanh toán',
    group: 'workspace',
    auth: true,
    title: 'Tạo giao dịch thanh toán',
    subtitle: 'Tạo một giao dịch thanh toán mới cho dự án.',
    cta: 'Tạo thanh toán',
  },
  {
    id: 'admin-staff',
    label: 'Quản lý cán bộ',
    group: 'workspace',
    auth: true,
    title: 'Danh sách cán bộ',
    subtitle: 'Quản lý danh sách cán bộ trong hệ thống.',
    cta: 'Thêm cán bộ mới',
  },
  {
    id: 'create-staff',
    label: 'Thêm cán bộ',
    group: 'workspace',
    auth: true,
    title: 'Thêm cán bộ mới',
    subtitle: 'Tạo một tài khoản cán bộ mới trong hệ thống.',
    cta: 'Tạo cán bộ',
  },
  {
    id: 'staff-detail',
    label: 'Chi tiết cán bộ',
    group: 'workspace',
    auth: true,
    title: 'Chi tiết cán bộ',
    subtitle: 'Xem và cập nhật thông tin cán bộ.',
    cta: 'Cập nhật',
  },
  {
    id: 'applications',
    label: 'Hồ sơ đăng ký',
    group: 'workspace',
    auth: true,
    title: 'Hồ sơ đăng ký nhà ở',
    subtitle: 'Quản lý hồ sơ đăng ký nhà ở xã hội.',
    cta: 'Tạo hồ sơ mới',
  },
  {
    id: 'create-application',
    label: 'Tạo hồ sơ',
    group: 'workspace',
    auth: true,
    roles: ['Applicant'],
    title: 'Tạo hồ sơ đăng ký',
    subtitle: 'Điền thông tin và tạo hồ sơ nháp để nộp sau.',
    cta: 'Tạo hồ sơ nháp',
  },
  {
    id: 'application-detail',
    label: 'Chi tiết hồ sơ',
    group: 'workspace',
    auth: true,
    title: 'Chi tiết hồ sơ đăng ký',
    subtitle: 'Xem thông tin, tài liệu và trạng thái xét duyệt.',
    cta: '',
  },
]

export function getRouteConfig(id: RouteId): RouteConfig {
  return routes.find((r) => r.id === id)!
}

export function getRoute(): RouteId {
  const hash = location.hash.replace(/^#\/?/, '')
  if (!hash) {
    return isLoggedIn() ? roleHome(getRole()) : 'landing'
  }
  const routePart = hash.split('?')[0].split('&')[0]
  const found = routes.find((r) => r.id === routePart)
  return found?.id ?? (isLoggedIn() ? roleHome(getRole()) : 'landing')
}

export type PaymentNotice = 'success' | 'failed' | 'cancelled' | 'error'

export function parsePaymentFromLocation(): PaymentNotice | null {
  const hash = location.hash.replace(/^#\/?/, '')
  const qIdx = hash.indexOf('?')
  const query = qIdx >= 0 ? hash.slice(qIdx + 1) : location.search.slice(1)
  const payment = new URLSearchParams(query).get('payment')
  if (payment === 'success' || payment === 'failed' || payment === 'cancelled' || payment === 'error') {
    return payment
  }
  return null
}

export function consumePaymentNotice(): PaymentNotice | null {
  const fromUrl = parsePaymentFromLocation()
  if (!fromUrl) return null
  stripPaymentFromHash()
  return fromUrl
}

export function paymentNoticeMessage(notice: PaymentNotice): { text: string; className: string } {
  switch (notice) {
    case 'success':
      return { text: 'Thanh toán thành công.', className: 'is-success' }
    case 'cancelled':
      return { text: 'Giao dịch đã bị hủy.', className: 'is-cancelled' }
    case 'failed':
      return { text: 'Thanh toán thất bại.', className: 'is-failed' }
    default:
      return { text: 'Không thể xác minh giao dịch.', className: 'is-error' }
  }
}

function stripPaymentFromHash(): void {
  const hash = location.hash.replace(/^#\/?/, '')
  const routePart = hash.split('?')[0].split('&')[0]
  const found = routes.find((r) => r.id === routePart)
  if (found) location.hash = `#/${found.id}`
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

export function getRole(): string {
  return localStorage.getItem('userRole') ?? ''
}

export function setRole(role: string): void {
  if (role) localStorage.setItem('userRole', role)
}

export function clearRole(): void {
  localStorage.removeItem('userRole')
}

export const ADMIN_ROLE = 'System Administrator'

export function roleHome(role: string): RouteId {
  switch (role.trim()) {
    case 'System Administrator':
      return 'home-admin'
    case 'Ward Manager':
      return 'home-ward'
    case 'Verification Officer':
      return 'home-verifier'
    case 'Applicant':
      return 'home-user'
    default:
      return 'dashboard'
  }
}

// Phân quyền theo cấp: Admin > Quản lý phường > Người dùng.
// Admin có toàn bộ quyền (canAccess luôn true). Các role khác chỉ
// truy cập được những route trong danh sách của mình.
const ROLE_ACCESS: Record<string, RouteId[]> = {
  'Ward Manager': [
    'home-ward',
    'applications',
    'projects',
    'create-project',
    'project-detail',
    'payments',
    'create-payment',
    'application-detail',
    'profile',
    'change-password',
  ],
  'Verification Officer': [
    'home-verifier',
    'applications',
    'projects',
    'project-detail',
    'application-detail',
    'dashboard',
    'profile',
    'change-password',
  ],
  Applicant: [
    'home-user',
    'quan-tam',
    'applications',
    'create-application',
    'application-detail',
    'projects',
    'payments',
    'create-payment',
    'profile',
    'change-password',
  ],
}

export function canAccess(role: string, id: RouteId): boolean {
  if (role === ADMIN_ROLE) return true
  const list = ROLE_ACCESS[role]
  if (!list) return true
  return list.includes(id)
}

// Các mục hiển thị trên thanh điều hướng cho từng role (đúng thứ tự).
const PUBLIC_NAV: RouteId[] = ['landing', 'tra-cuu', 'login', 'register']

export const AUTH_FORM_ROUTES = new Set<RouteId>([
  'login',
  'register',
  'verify-otp',
  'resend-otp',
  'forgot-password',
  'reset-password',
])

export function publicNavRoutes(): RouteId[] {
  return PUBLIC_NAV
}

const NAV_BY_ROLE: Record<string, RouteId[]> = {
  'System Administrator': ['home-admin', 'admin-staff', 'applications', 'projects', 'payments', 'dashboard', 'profile'],
  'Ward Manager': ['home-ward', 'applications', 'projects', 'payments', 'profile'],
  'Verification Officer': ['home-verifier', 'applications', 'projects', 'dashboard', 'profile'],
  Applicant: ['home-user', 'quan-tam', 'applications', 'payments', 'profile'],
}

export function navRoutes(role: string): RouteId[] {
  return NAV_BY_ROLE[role] ?? ['dashboard', 'profile']
}
