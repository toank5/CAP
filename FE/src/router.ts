export type RouteId =
  | 'landing'
  | 'tra-cuu'
  | 'tim-nha'
  | 'thong-bao'
  | 'login'
  | 'register'
  | 'verify-otp'
  | 'verify-identity'
  | 'resend-otp'
  | 'forgot-password'
  | 'reset-password'
  | 'home-admin'
  | 'home-developer'
  | 'home-sxd'
  | 'home-user'
  | 'quan-tam'
  | 'dashboard'
  | 'profile'
  | 'change-password'
  | 'projects'
  | 'project-detail'
  | 'create-project'
  | 'payments'
  | 'admin-staff'
  | 'create-staff'
  | 'staff-detail'
  | 'applications'
  | 'create-application'
  | 'application-detail'
  | 'notifications'
  | 'sxd-projects'
  | 'sxd-project-detail'
  | 'sxd-announcements'
  | 'sxd-payments'
  // Lottery (mock)
  | 'lottery-sessions'
  | 'lottery-create'
  | 'lottery-detail'
  | 'lottery-lobby'
  | 'lottery-live'
  | 'my-lottery'
  // Contracts (mock)
  | 'contracts'
  | 'contract-create'
  | 'contract-detail'
  // My apartment (Applicant: deposit → sign → pay)
  | 'my-apartment'
  // Audit (mock)
  | 'audit-list'
  | 'audit-detail'
  | 'audit-create'
  // Admin extras (mock)
  | 'admin-logs'
  | 'admin-categories'

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
    id: 'tim-nha',
    label: 'Tìm nhà ở',
    group: 'access',
    title: 'Tìm kiếm nhà ở xã hội',
    subtitle: 'Tra cứu dự án theo vị trí, giá và diện tích.',
    cta: 'Tìm kiếm',
  },
  {
    id: 'thong-bao',
    label: 'Thông báo',
    group: 'access',
    title: 'Thông báo công khai',
    subtitle: 'Thông báo chính thức từ Sở Xây dựng và Chủ đầu tư.',
    cta: '',
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
    id: 'verify-identity',
    label: 'Xác minh danh tính',
    group: 'security',
    auth: true,
    roles: ['Applicant'],
    title: 'Xác minh danh tính CCCD',
    subtitle: 'Quét CCCD và xác thực khuôn mặt để hoàn tất đăng ký tài khoản.',
    cta: 'Hoàn tất xác minh',
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
    id: 'home-developer',
    label: 'Trang chủ',
    group: 'workspace',
    auth: true,
    roles: ['Housing Developer'],
    title: 'Trang chủ đầu tư',
    subtitle: 'Tiếp nhận, thẩm định và gửi hồ sơ lên Sở Xây dựng.',
    cta: '',
  },
  {
    id: 'home-sxd',
    label: 'Trang chủ',
    group: 'workspace',
    auth: true,
    roles: ['Department Of Construction'],
    title: 'Trang Sở Xây dựng',
    subtitle: 'Hậu kiểm và phê duyệt cuối cùng các hồ sơ đăng ký nhà ở xã hội.',
    cta: '',
  },
  {
    id: 'home-user',
    label: 'Trang chủ',
    group: 'workspace',
    auth: true,
    roles: ['Applicant'],
    title: 'Trang người dùng',
    subtitle: 'Khám phá nhà ở xã hội, xem hồ sơ và dự án trên cổng công dân.',
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
    label: 'Tài khoản',
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
    cta: '',
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
    label: 'Hồ sơ',
    group: 'workspace',
    auth: true,
    title: 'Danh sách hồ sơ',
    subtitle: 'Xem trạng thái các hồ sơ đã đăng ký.',
    cta: '',
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
  {
    id: 'notifications',
    label: 'Thông báo',
    group: 'workspace',
    auth: true,
    title: 'Trung tâm thông báo',
    subtitle: 'Tất cả thông báo hệ thống dành cho bạn.',
    cta: '',
  },
  {
    id: 'report-issue',
    label: 'Báo cáo sự cố',
    group: 'workspace',
    auth: true,
    roles: ['Applicant'],
    title: 'Báo cáo sự cố',
    subtitle: 'Gửi phản ánh về lỗi kỹ thuật, dữ liệu hoặc tài khoản tới quản trị viên.',
    cta: 'Gửi báo cáo',
  },
  // ====== SXD Duyệt dự án ======
  {
    id: 'sxd-projects',
    label: 'Duyệt dự án',
    group: 'workspace',
    auth: true,
    roles: ['Department Of Construction'],
    title: 'Phê duyệt dự án',
    subtitle: 'Xem xét và phê duyệt các dự án nhà ở xã hội mới.',
    cta: '',
  },
  {
    id: 'sxd-project-detail',
    label: 'Chi tiết dự án',
    group: 'workspace',
    auth: true,
    roles: ['Department Of Construction'],
    title: 'Chi tiết dự án',
    subtitle: 'Xem thông tin chi tiết và thao tác phê duyệt dự án.',
    cta: '',
  },
  {
    id: 'sxd-announcements',
    label: 'Quản lý thông báo',
    group: 'workspace',
    auth: true,
    roles: ['Department Of Construction'],
    title: 'Quản lý thông báo',
    subtitle: 'Tạo, sửa, xóa và xuất báo cáo thông báo từ Sở Xây dựng.',
    cta: '',
  },
  {
    id: 'sxd-payments',
    label: 'Thanh toán',
    group: 'workspace',
    auth: true,
    roles: ['Department Of Construction'],
    title: 'Xác nhận thanh toán',
    subtitle: 'Xác nhận các đợt thanh toán cuối cùng và cấp sổ đỏ.',
    cta: '',
  },
  // ====== Lottery (mock cho BE chưa có) ======
  {
    id: 'lottery-sessions',
    label: 'Bốc thăm',
    group: 'workspace',
    auth: true,
    roles: ['Housing Developer', 'Department Of Construction'],
    title: 'Phiên bốc thăm',
    subtitle: 'Quản lý các phiên bốc thăm khi hồ sơ hợp lệ vượt số căn.',
    cta: 'Tạo phiên mới',
  },
  {
    id: 'lottery-create',
    label: 'Tạo phiên bốc thăm',
    group: 'workspace',
    auth: true,
    roles: ['Housing Developer'],
    title: 'Tạo phiên bốc thăm',
    subtitle: 'Chọn dự án, danh sách đủ điều kiện và lịch bốc thăm.',
    cta: 'Tạo phiên',
  },
  {
    id: 'lottery-detail',
    label: 'Chi tiết phiên',
    group: 'workspace',
    auth: true,
    roles: ['Housing Developer', 'Department Of Construction'],
    title: 'Chi tiết phiên bốc thăm',
    subtitle: 'Theo dõi trạng thái, danh sách tham gia và log sự kiện.',
    cta: '',
  },
  {
    id: 'lottery-lobby',
    label: 'Vào sảnh',
    group: 'workspace',
    auth: true,
    roles: ['Applicant'],
    title: 'Vào sảnh bốc thăm',
    subtitle: 'Nhập OTP từ thông báo để vào sảnh theo dõi. Bạn chỉ theo dõi, không tự bốc.',
    cta: '',
  },
  {
    id: 'lottery-live',
    label: 'Sảnh Live',
    group: 'workspace',
    auth: true,
    roles: ['Applicant', 'Housing Developer', 'Department Of Construction'],
    title: 'Sảnh quay số trực tiếp',
    subtitle: 'Theo dõi tiến độ bốc hồ sơ trúng, danh sách và quỹ căn. CĐT bốc tiếp; dân chỉ xem.',
    cta: '',
  },
  {
    id: 'my-lottery',
    label: 'Bốc thăm của tôi',
    group: 'workspace',
    auth: true,
    roles: ['Applicant'],
    title: 'Bốc thăm của tôi',
    subtitle: 'Xem OTP vào sảnh, kết quả trúng chưa trúng, trạng thái CĐT gán căn.',
    cta: '',
  },
  // ====== Contracts (mock cho BE chưa có) ======
  {
    id: 'contracts',
    label: 'Hợp đồng',
    group: 'workspace',
    auth: true,
    title: 'Hợp đồng mua bán',
    subtitle: 'Quản lý hợp đồng và lịch thanh toán các đợt.',
    cta: 'Tạo hợp đồng mới',
  },
  {
    id: 'contract-create',
    label: 'Tạo hợp đồng',
    group: 'workspace',
    auth: true,
    roles: ['Housing Developer'],
    title: 'Tạo hợp đồng mua bán',
    subtitle: 'Tạo hợp đồng mới cho hồ sơ trúng thầu / được chọn.',
    cta: 'Tạo hợp đồng',
  },
  {
    id: 'contract-detail',
    label: 'Chi tiết hợp đồng',
    group: 'workspace',
    auth: true,
    title: 'Chi tiết hợp đồng',
    subtitle: 'Xem thông tin, ký hợp đồng và theo dõi lịch thanh toán.',
    cta: '',
  },
  {
    id: 'my-apartment',
    label: 'Căn của tôi',
    group: 'workspace',
    auth: true,
    roles: ['Applicant'],
    title: 'Căn của tôi',
    subtitle: 'Xem căn, đặt cọc, ký hợp đồng và thanh toán các đợt.',
    cta: '',
  },
  // ====== Audit / Hậu kiểm (mock cho BE chưa có) ======
  {
    id: 'audit-list',
    label: 'Hậu kiểm',
    group: 'workspace',
    auth: true,
    title: 'Hậu kiểm danh sách chính thức',
    subtitle: 'Sở Xây dựng hậu kiểm các hồ sơ đã được CĐT gửi lên.',
    cta: 'Tạo hồ sơ hậu kiểm',
  },
  {
    id: 'audit-detail',
    label: 'Chi tiết hậu kiểm',
    group: 'workspace',
    auth: true,
    title: 'Chi tiết hồ sơ hậu kiểm',
    subtitle: 'Thực hiện checklist hậu kiểm và công bố kết quả.',
    cta: '',
  },
  {
    id: 'audit-create',
    label: 'Tạo hậu kiểm',
    group: 'workspace',
    auth: true,
    roles: ['Department Of Construction'],
    title: 'Tạo hồ sơ hậu kiểm',
    subtitle: 'Tạo hồ sơ hậu kiểm mới cho dự án.',
    cta: 'Tạo hồ sơ',
  },
  // ====== Admin extras (mock cho BE chưa có) ======
  {
    id: 'admin-logs',
    label: 'Log hệ thống',
    group: 'workspace',
    auth: true,
    roles: ['System Administrator'],
    title: 'Log hệ thống',
    subtitle: 'Theo dõi tất cả hoạt động của hệ thống và người dùng.',
    cta: '',
  },
  {
    id: 'admin-categories',
    label: 'Quản lý danh mục',
    group: 'workspace',
    auth: true,
    roles: ['System Administrator'],
    title: 'Quản lý danh mục',
    subtitle: 'Danh mục trạng thái dự án, loại giấy tờ và nhóm thu nhập.',
    cta: 'Thêm danh mục',
  },
] as const

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
  const hash = location.hash.replace(/^#\/?/, '')
  const qIdx = hash.indexOf('?')
  const query = qIdx >= 0 ? hash.slice(qIdx + 1) : location.search.slice(1)
  const orderId = new URLSearchParams(query).get('orderId')
  if (orderId) sessionStorage.setItem('pendingPaymentOrderId', orderId)
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

export function navigate(id: RouteId | string): void {
  window.scrollTo({ top: 0, behavior: 'instant' })
  const hash = String(id).startsWith('#') ? String(id) : `#/${id}`
  location.hash = hash
}

export function onRouteChange(cb: (id: RouteId) => void): void {
  const run = () => cb(getRoute())
  window.addEventListener('hashchange', run)
  run()
}

/**
 * Đọc query string từ hash (vd `#/sxd-project-detail?id=abc` -> `{ id: 'abc' }`).
 * Trả về `{}` nếu không có query.
 */
export function getHashQuery(): Record<string, string> {
  const hash = location.hash.replace(/^#\/?/, '')
  const qIdx = hash.indexOf('?')
  if (qIdx < 0) return {}
  const query = hash.slice(qIdx + 1)
  const out: Record<string, string> = {}
  for (const part of query.split('&')) {
    const [k, v] = part.split('=')
    if (k) out[decodeURIComponent(k)] = v ? decodeURIComponent(v) : ''
  }
  return out
}

/** Navigate tới route kèm query string (vd `navigateWithQuery('sxd-project-detail', { id })`). */
export function navigateWithQuery(route: RouteId | string, query: Record<string, string | number | undefined>): void {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(query)) {
    if (v == null) continue
    qs.set(k, String(v))
  }
  const id = String(route)
  const base = id.startsWith('#') ? id : `#/${id}`
  const q = qs.toString()
  location.hash = q ? `${base}?${q}` : base
}

export function isLoggedIn(): boolean {
  return !!sessionStorage.getItem('accessToken')
}

export function getRole(): string {
  return sessionStorage.getItem('userRole') ?? ''
}

export function setRole(role: string): void {
  if (role) sessionStorage.setItem('userRole', role)
}

export function clearRole(): void {
  sessionStorage.removeItem('userRole')
}

export const ADMIN_ROLE = 'System Administrator'

export function roleHome(role: string): RouteId {
  switch (role.trim()) {
    case 'System Administrator':
      return 'home-admin'
    case 'Housing Developer':
      return 'home-developer'
    case 'Department Of Construction':
      return 'home-sxd'
    case 'Applicant':
      return 'home-user'
    default:
      return 'dashboard'
  }
}

// Phân quyền theo cấp: Admin > CĐT > SXD > Người dùng.
// Admin có toàn bộ quyền (canAccess luôn true). Các role khác chỉ
// truy cập được những route trong danh sách của mình.
const ROLE_ACCESS: Record<string, RouteId[]> = {
  'System Administrator': [
    'admin-staff',
    'admin-logs',
    'admin-categories',
    'notifications',
    'profile',
    'change-password',
  ],
  'Housing Developer': [
    'home-developer',
    'applications',
    'projects',
    'create-project',
    'project-detail',
    'application-detail',
    'profile',
    'change-password',
    'notifications',
    'lottery-sessions',
    'lottery-create',
    'lottery-detail',
    'lottery-live',
    'contracts',
    'contract-create',
    'contract-detail',
    'audit-list',
    'audit-detail',
  ],
  'Department Of Construction': [
    'home-sxd',
    'applications',
    'projects',
    'project-detail',
    'application-detail',
    'profile',
    'change-password',
    'notifications',
    'lottery-sessions',
    'lottery-detail',
    'lottery-live',
    'contracts',
    'contract-detail',
    'audit-list',
    'audit-detail',
    'sxd-projects',
    'sxd-project-detail',
    'sxd-payments',
  ],
  Applicant: [
    'home-user',
    'verify-identity',
    'quan-tam',
    'applications',
    'application-detail',
    'create-application',
    'projects',
    'project-detail',
    'notifications',
    'profile',
    'change-password',
    'lottery-lobby',
    'lottery-live',
    'my-lottery',
    'contracts',
    'contract-detail',
    'payments',
    'report-issue',
  ],
}

export function canAccess(role: string, id: RouteId): boolean {
  if (role === ADMIN_ROLE) return true
  const list = ROLE_ACCESS[role]
  if (!list) return true
  return list.includes(id)
}

// Các mục hiển thị trên thanh điều hướng cho từng role (đúng thứ tự).
const PUBLIC_NAV: RouteId[] = ['landing', 'tim-nha', 'thong-bao', 'tra-cuu', 'login', 'register']

export const AUTH_FORM_ROUTES = new Set<RouteId>([
  'login',
  'register',
  'verify-otp',
  'verify-identity',
  'resend-otp',
  'forgot-password',
  'reset-password',
])

export function publicNavRoutes(): RouteId[] {
  return PUBLIC_NAV
}

const NAV_BY_ROLE: Record<string, RouteId[]> = {
  'System Administrator': ['admin-staff', 'admin-logs', 'admin-categories', 'notifications', 'profile'],
  'Housing Developer': ['home-developer', 'applications', 'projects', 'lottery-sessions', 'lottery-live', 'contracts', 'notifications', 'profile'],
  'Department Of Construction': ['home-sxd', 'applications', 'sxd-projects', 'sxd-announcements', 'lottery-sessions', 'lottery-live', 'sxd-payments', 'audit-list', 'contracts', 'notifications', 'profile'],
  Applicant: ['home-user', 'quan-tam', 'applications', 'projects', 'my-lottery', 'my-apartment', 'notifications', 'profile'],
}

export function navRoutes(role: string): RouteId[] {
  return NAV_BY_ROLE[role] ?? ['dashboard', 'profile']
}
