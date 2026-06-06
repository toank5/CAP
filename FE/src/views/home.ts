import { getRole, getRouteConfig, navigate, type RouteId } from '../router'
import { el } from '../ui/helpers'

interface HomeAction {
  title: string
  desc: string
  route: RouteId
  cta?: string
}

function actionCard(action: HomeAction): HTMLElement {
  const card = el(
    'button',
    { type: 'button', class: 'home-action' },
    el('span', { class: 'home-action-title' }, action.title),
    el('span', { class: 'home-action-desc' }, action.desc),
    el('span', { class: 'home-action-cta' }, action.cta ?? 'Mở →'),
  )
  card.addEventListener('click', () => navigate(action.route))
  return card
}

function roleHomePage(
  routeId: RouteId,
  badge: string,
  intro: string,
  actions: HomeAction[],
): HTMLElement {
  const m = getRouteConfig(routeId)
  const roleLabel = getRole()
  return el(
    'article',
    { class: 'page home-page' },
    el(
      'div',
      { class: 'home-hero' },
      el('span', { class: 'home-badge' }, badge),
      el('h2', { class: 'home-title' }, m.title),
      el('p', { class: 'home-lead' }, intro),
      roleLabel
        ? el('p', { class: 'home-role' }, `Vai trò: ${roleLabel}`)
        : el('span', { class: 'home-role is-empty' }),
    ),
    el('div', { class: 'home-grid' }, ...actions.map(actionCard)),
  )
}

export function adminHomeView(): HTMLElement {
  return roleHomePage(
    'home-admin',
    'Quản trị viên (Admin)',
    'Bạn có toàn quyền quản lý hệ thống: tài khoản cán bộ, dự án và dữ liệu nền tảng.',
    [
      {
        title: 'Quản lý cán bộ',
        desc: 'Thêm, sửa, phân quyền tài khoản cán bộ trong hệ thống.',
        route: 'admin-staff',
      },
      {
        title: 'Thêm cán bộ mới',
        desc: 'Tạo nhanh một tài khoản cán bộ mới.',
        route: 'create-staff',
      },
      {
        title: 'Dự án nhà ở',
        desc: 'Quản lý toàn bộ dự án nhà ở xã hội.',
        route: 'projects',
      },
      {
        title: 'Tạo dự án mới',
        desc: 'Khởi tạo một dự án nhà ở xã hội mới.',
        route: 'create-project',
      },
      {
        title: 'Tổng quan & thẩm định',
        desc: 'Bảng điều phối và theo dõi công việc thẩm định.',
        route: 'dashboard',
      },
      {
        title: 'Thanh toán',
        desc: 'Theo dõi các giao dịch thanh toán trên hệ thống.',
        route: 'payments',
      },
      {
        title: 'Hồ sơ cá nhân',
        desc: 'Xem và cập nhật thông tin tài khoản của bạn.',
        route: 'profile',
      },
      {
        title: 'Đổi mật khẩu',
        desc: 'Cập nhật mật khẩu để bảo vệ tài khoản.',
        route: 'change-password',
      },
    ],
  )
}

export function wardHomeView(): HTMLElement {
  return roleHomePage(
    'home-ward',
    'Quản lý phường',
    'Theo dõi, điều phối và cập nhật các dự án nhà ở trên địa bàn phường của bạn.',
    [
      {
        title: 'Dự án trên địa bàn',
        desc: 'Xem và quản lý danh sách dự án nhà ở.',
        route: 'projects',
      },
      {
        title: 'Tạo dự án mới',
        desc: 'Khởi tạo một dự án nhà ở xã hội mới.',
        route: 'create-project',
      },
      {
        title: 'Thanh toán',
        desc: 'Theo dõi các giao dịch liên quan đến dự án.',
        route: 'payments',
      },
      {
        title: 'Hồ sơ cá nhân',
        desc: 'Xem và cập nhật thông tin tài khoản của bạn.',
        route: 'profile',
      },
    ],
  )
}

export function verifierHomeView(): HTMLElement {
  return roleHomePage(
    'home-verifier',
    'Cán bộ thẩm định',
    'Tiếp nhận và thẩm định hồ sơ, dự án theo đúng quy trình minh bạch.',
    [
      {
        title: 'Dự án cần thẩm định',
        desc: 'Xem danh sách dự án để thẩm định và xử lý.',
        route: 'projects',
      },
      {
        title: 'Tổng quan',
        desc: 'Bảng điều phối công việc thẩm định.',
        route: 'dashboard',
      },
      {
        title: 'Hồ sơ cá nhân',
        desc: 'Xem và cập nhật thông tin tài khoản của bạn.',
        route: 'profile',
      },
      {
        title: 'Đổi mật khẩu',
        desc: 'Cập nhật mật khẩu để bảo vệ tài khoản.',
        route: 'change-password',
      },
    ],
  )
}

interface House {
  id: string
  name: string
  location: string
  address: string
  price: string
  units: string
  color: string
  type: string
  area: string
  bedrooms: string
  floors: string
  developer: string
  status: string
  handover: string
  description: string
}

const FEATURED_HOUSES: House[] = [
  {
    id: 'an-binh',
    name: 'Khu nhà ở An Bình',
    location: 'Quận 9, TP.HCM',
    address: 'Khu nhà ở An Bình, Phường Long Bình, Quận 9, TP.HCM',
    price: '850 triệu',
    units: 'Còn 12 căn',
    color: '#e63946',
    type: 'Nhà liền kề',
    area: '60 m²',
    bedrooms: '2 phòng ngủ',
    floors: '2 tầng',
    developer: 'Công ty TNHH An Bình Housing',
    status: 'Đang mở bán',
    handover: 'Quý IV/2026',
    description: 'Khu nhà ở xã hội ven sông, không gian xanh, gần trường học và bệnh viện.',
  },
  {
    id: 'hoa-phat',
    name: 'Chung cư Hòa Phát',
    location: 'Thủ Đức, TP.HCM',
    address: 'Chung cư Hòa Phát, Phường Linh Trung, TP. Thủ Đức, TP.HCM',
    price: '1,2 tỷ',
    units: 'Còn 8 căn',
    color: '#0077c8',
    type: 'Căn hộ chung cư',
    area: '72 m²',
    bedrooms: '2 phòng ngủ',
    floors: 'Tầng 5–18',
    developer: 'Hòa Phát Land',
    status: 'Đang mở bán',
    handover: 'Quý I/2027',
    description: 'Chung cư hiện đại, hệ thống an ninh 24/7, tiện ích nội khu đầy đủ.',
  },
  {
    id: 'song-xanh',
    name: 'Nhà ở Sông Xanh',
    location: 'Quận 7, TP.HCM',
    address: 'Nhà ở Sông Xanh, Phường Tân Phong, Quận 7, TP.HCM',
    price: '980 triệu',
    units: 'Còn 20 căn',
    color: '#2a9d8f',
    type: 'Nhà phố thương mại',
    area: '68 m²',
    bedrooms: '3 phòng ngủ',
    floors: '3 tầng',
    developer: 'Sông Xanh Development',
    status: 'Đang mở bán',
    handover: 'Quý III/2026',
    description: 'Vị trí mặt tiền sông, thuận tiện di chuyển về trung tâm và khu công nghiệp.',
  },
  {
    id: 'tan-phu',
    name: 'Khu dân cư Tân Phú',
    location: 'Tân Phú, TP.HCM',
    address: 'Khu dân cư Tân Phú, Phường Tân Quý, Quận Tân Phú, TP.HCM',
    price: '760 triệu',
    units: 'Còn 5 căn',
    color: '#fb8500',
    type: 'Nhà liền kề',
    area: '55 m²',
    bedrooms: '2 phòng ngủ',
    floors: '2 tầng',
    developer: 'Tân Phú Urban',
    status: 'Sắp hết suất',
    handover: 'Quý II/2026',
    description: 'Giá hợp lý, phù hợp hộ gia đình trẻ, gần chợ và trung tâm hành chính quận.',
  },
]

const FAV_KEY = 'favoriteHouses'

function getFavorites(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(FAV_KEY) ?? '[]')
    return Array.isArray(raw) ? (raw as string[]) : []
  } catch {
    return []
  }
}

function isFavorite(id: string): boolean {
  return getFavorites().includes(id)
}

function toggleFavorite(id: string): boolean {
  const favs = getFavorites()
  const idx = favs.indexOf(id)
  if (idx >= 0) {
    favs.splice(idx, 1)
    localStorage.setItem(FAV_KEY, JSON.stringify(favs))
    return false
  }
  favs.push(id)
  localStorage.setItem(FAV_KEY, JSON.stringify(favs))
  return true
}

const HEART_SVG =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>'

function googleMapsDirUrl(address: string): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`
}

function houseDetailRow(label: string, value: string): HTMLElement {
  return el('div', { class: 'house-detail-row' },
    el('span', { class: 'house-detail-label' }, label),
    el('span', { class: 'house-detail-value' }, value),
  )
}

function houseImage(color: string): HTMLElement {
  const wrap = el('div', { class: 'house-img' })
  wrap.innerHTML = `
<svg viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Nhà ở mô phỏng">
  <rect width="160" height="120" fill="#eaf3fb"/>
  <circle cx="132" cy="26" r="12" fill="#ffd166"/>
  <rect y="94" width="160" height="26" fill="#cfe6d6"/>
  <rect x="44" y="56" width="72" height="44" fill="#ffffff" stroke="#d2e0ee" stroke-width="1.5"/>
  <path d="M37 58 L80 27 L123 58 Z" fill="${color}"/>
  <rect x="71" y="74" width="18" height="26" rx="1" fill="${color}" fill-opacity="0.85"/>
  <rect x="51" y="65" width="15" height="13" rx="1" fill="#bfe3f2" stroke="#9cc7da"/>
  <rect x="94" y="65" width="15" height="13" rx="1" fill="#bfe3f2" stroke="#9cc7da"/>
</svg>`
  return wrap
}

function houseCard(h: House, onToggleFav?: () => void): HTMLElement {
  const card = el('div', { class: 'house-card' })

  const detailPanel = el(
    'div',
    { class: 'house-detail', style: 'display: none;' },
    houseDetailRow('Loại nhà', h.type),
    houseDetailRow('Diện tích', h.area),
    houseDetailRow('Phòng ngủ', h.bedrooms),
    houseDetailRow('Số tầng', h.floors),
    houseDetailRow('Chủ đầu tư', h.developer),
    houseDetailRow('Trạng thái', h.status),
    houseDetailRow('Bàn giao', h.handover),
    houseDetailRow('Địa chỉ', h.address),
    el('p', { class: 'house-detail-desc' }, h.description),
  )

  const detailBtn = el('button', { type: 'button', class: 'btn-secondary house-btn' }, 'Xem chi tiết')
  detailBtn.addEventListener('click', () => {
    const open = detailPanel.style.display !== 'none'
    detailPanel.style.display = open ? 'none' : 'block'
    detailBtn.textContent = open ? 'Xem chi tiết' : 'Thu gọn'
    card.classList.toggle('is-expanded', !open)
  })

  const mapLink = el(
    'a',
    {
      href: googleMapsDirUrl(h.address),
      target: '_blank',
      rel: 'noopener noreferrer',
      class: 'house-map-link',
    },
    'Xem vị trí',
  )

  const active = isFavorite(h.id)
  const fav = el('button', {
    type: 'button',
    class: `house-fav${active ? ' is-active' : ''}`,
    'aria-label': 'Yêu thích',
    'aria-pressed': String(active),
    title: active ? 'Bỏ quan tâm' : 'Quan tâm',
  })
  fav.innerHTML = HEART_SVG
  fav.addEventListener('click', (e) => {
    e.stopPropagation()
    const nowActive = toggleFavorite(h.id)
    fav.classList.toggle('is-active', nowActive)
    fav.setAttribute('aria-pressed', String(nowActive))
    fav.setAttribute('title', nowActive ? 'Bỏ quan tâm' : 'Quan tâm')
    onToggleFav?.()
  })

  const img = houseImage(h.color)
  img.append(fav)

  card.append(
    img,
    el(
      'div',
      { class: 'house-body' },
      el('h3', { class: 'house-name' }, h.name),
      el('p', { class: 'house-loc' }, `📍 ${h.location}`),
      el('div', { class: 'house-meta' },
        el('span', { class: 'house-price' }, h.price),
        el('span', { class: 'house-units' }, h.units),
      ),
      el('div', { class: 'house-actions' }, detailBtn, mapLink),
      detailPanel,
    ),
  )

  return card
}

export function userHomeView(): HTMLElement {
  const seeAll = el('button', { type: 'button', class: 'btn-primary home-seeall' }, 'Xem tất cả dự án')
  seeAll.addEventListener('click', () => navigate('projects'))

  return el(
    'article',
    { class: 'page home-page' },
    el(
      'div',
      { class: 'home-hero' },
      el('h2', { class: 'home-title' }, 'Nhà ở xã hội cho mọi người'),
      el('p', { class: 'home-lead' }, 'Khám phá các dự án nhà ở xã hội nổi bật đang mở bán.'),
    ),
    el(
      'div',
      { class: 'house-section' },
      el('div', { class: 'house-section-head' },
        el('h3', { class: 'house-section-title' }, 'Nhà ở nổi bật'),
        seeAll,
      ),
      el('div', { class: 'house-row' }, ...FEATURED_HOUSES.map((h) => houseCard(h))),
    ),
  )
}

export function interestedView(): HTMLElement {
  const m = getRouteConfig('quan-tam')
  const browse = el('button', { type: 'button', class: 'btn-primary home-seeall' }, 'Khám phá thêm')
  browse.addEventListener('click', () => navigate('home-user'))

  const row = el('div', { class: 'house-row' })

  const render = () => {
    const saved = FEATURED_HOUSES.filter((h) => isFavorite(h.id))
    if (saved.length === 0) {
      const empty = el('div', { class: 'fav-empty' })
      empty.innerHTML = `${HEART_SVG}<p>Bạn chưa quan tâm dự án nào.<br/>Nhấn vào biểu tượng trái tim ở mỗi dự án để lưu lại tại đây.</p>`
      const cta = el('button', { type: 'button', class: 'btn-primary home-seeall' }, 'Khám phá dự án')
      cta.addEventListener('click', () => navigate('home-user'))
      empty.append(cta)
      row.replaceChildren(empty)
    } else {
      row.replaceChildren(...saved.map((h) => houseCard(h, render)))
    }
  }
  render()

  return el(
    'article',
    { class: 'page home-page' },
    el(
      'div',
      { class: 'home-hero' },
      el('h2', { class: 'home-title' }, m.title),
      el('p', { class: 'home-lead' }, 'Những dự án nhà ở bạn đã lưu để theo dõi.'),
    ),
    el(
      'div',
      { class: 'house-section' },
      el('div', { class: 'house-section-head' },
        el('h3', { class: 'house-section-title' }, 'Dự án đã quan tâm'),
        browse,
      ),
      row,
    ),
  )
}
