import { BRAND } from '../brand'
import { navigate } from '../router'
import { el } from '../ui/helpers'
import { FEATURED_HOUSES, houseCard } from './roles/applicant-home'

const STATS = [
  { value: '48+', label: 'Dự án đang triển khai' },
  { value: '12.500+', label: 'Hộ dân được hỗ trợ' },
  { value: '8.200+', label: 'Hồ sơ đã xử lý' },
  { value: '99%', label: 'Tỷ lệ minh bạch' },
]

const STEPS = [
  { num: '01', title: 'Khám phá dự án', desc: 'Tìm kiếm nhà ở xã hội phù hợp trên địa bàn.' },
  { num: '02', title: 'Tra cứu hồ sơ', desc: 'Theo dõi trạng thái hồ sơ đã đăng ký.' },
  { num: '03', title: 'Quản lý tài khoản', desc: 'Cập nhật thông tin cá nhân và bảo mật.' },
  { num: '04', title: 'Thông tin dự án', desc: 'Xem chi tiết giá, tiến độ và tiện ích.' },
]

const NEWS = [
  { title: 'Cập nhật danh sách dự án nhà ở xã hội Quý II/2026', date: '01/06/2026' },
  { title: 'Hướng dẫn tra cứu hồ sơ trực tuyến qua cổng RHS', date: '28/05/2026' },
  { title: 'Danh sách dự án ưu tiên hỗ trợ hộ nghèo, cận nghèo', date: '15/05/2026' },
]

function buildAppPromo(): HTMLElement {
  const container = el('div', { class: 'app-promo' })

  const phoneFrame = el('div', { class: 'app-phone-frame' })
  phoneFrame.innerHTML = `
    <div class="app-phone-inner">
      <div class="app-phone-notch"></div>
      <div class="app-phone-screen">
        <div class="app-screen-header">${BRAND.nameVi}</div>
        <div class="app-screen-placeholder">
          <svg viewBox="0 0 64 64" width="48" height="48" fill="none">
            <rect x="8" y="8" width="48" height="48" rx="8" fill="currentColor" opacity="0.15"/>
            <rect x="20" y="24" width="24" height="4" rx="2" fill="currentColor" opacity="0.4"/>
            <rect x="24" y="34" width="16" height="3" rx="1.5" fill="currentColor" opacity="0.3"/>
            <rect x="20" y="42" width="24" height="3" rx="1.5" fill="currentColor" opacity="0.2"/>
          </svg>
          <p class="app-screen-label">Ứng dụng sắp ra mắt</p>
        </div>
      </div>
    </div>`

  const textBlock = el('div', { class: 'app-promo-text' })
  textBlock.innerHTML = `
    <h3 class="app-promo-title">Ứng dụng di động</h3>
    <p class="app-promo-desc">
      Sắp có mặt trên <strong>App Store</strong> và <strong>Google Play</strong>.
      Theo dõi trạng thái hồ sơ, nhận thông báo và tra cứu dự án — tất cả trong tầm tay.
    </p>
    <p class="app-promo-note">Truy cập cổng thông tin trên trình duyệt để sử dụng ngay.</p>`

  container.append(phoneFrame, textBlock)
  return container
}

export function landingView(): HTMLElement {
  const hero = el(
    'section',
    { class: 'landing-hero' },
    buildAppPromo(),
    el('div', { class: 'landing-hero-right' },
      el('div', { class: 'landing-hero-content' },
        el('p', { class: 'landing-eyebrow' }, BRAND.orgLine),
        el('h1', { class: 'landing-title' }, BRAND.nameVi),
        el('p', { class: 'landing-lead' },
          'Nền tảng số kết nối nguồn cung nhà ở xã hội — minh bạch, hiệu quả và phục vụ người dân 24/7.',
        ),
        el('div', { class: 'landing-cta' },
          el('button', { type: 'button', class: 'btn-primary' }, 'Xem dự án'),
          el('button', { type: 'button', class: 'btn-secondary' }, 'Tra cứu hồ sơ'),
          el('button', { type: 'button', class: 'btn-ghost' }, 'Đăng nhập'),
        ),
      ),
      el('div', { class: 'landing-stats' },
        ...STATS.map((s) =>
          el('div', { class: 'landing-stat' },
            el('strong', {}, s.value),
            el('span', {}, s.label),
          ),
        ),
      ),
    ),
  )

  hero.querySelectorAll('.landing-cta button')[0]?.addEventListener('click', () => navigate('tim-nha'))
  hero.querySelectorAll('.landing-cta button')[2]?.addEventListener('click', () => navigate('login'))

  const page = el(
    'article',
    { class: 'page landing-page' },
    hero,
    el('section', { class: 'landing-section', id: 'du-an-noi-bat' },
      el('div', { class: 'landing-section-head' },
        el('h2', {}, 'Dự án nổi bật'),
        el('p', {}, 'Các dự án nhà ở xã hội đang mở đăng ký'),
      ),
      el('div', { class: 'house-row' }, ...FEATURED_HOUSES.slice(0, 3).map((h) => houseCard(h))),
    ),
    el('section', { class: 'landing-section landing-process' },
      el('div', { class: 'landing-section-head' },
        el('h2', {}, 'Hướng dẫn sử dụng'),
        el('p', {}, 'Các bước đơn giản để sử dụng cổng thông tin nhà ở xã hội'),
      ),
      el('ol', { class: 'landing-steps' },
        ...STEPS.map((s) =>
          el('li', { class: 'landing-step' },
            el('span', { class: 'landing-step-num' }, s.num),
            el('strong', {}, s.title),
            el('p', {}, s.desc),
          ),
        ),
      ),
    ),
    el('section', { class: 'landing-section' },
      el('div', { class: 'landing-section-head' },
        el('h2', {}, 'Tin tức & thông báo'),
        el('p', {}, 'Cập nhật mới nhất từ chương trình nhà ở xã hội'),
      ),
      el('ul', { class: 'landing-news' },
        ...NEWS.map((n) =>
          el('li', { class: 'landing-news-item' },
            el('strong', {}, n.title),
            el('time', {}, n.date),
          ),
        ),
      ),
    ),
  )

  hero.querySelectorAll('.landing-cta button')[1]?.addEventListener('click', () => {
    page.querySelector('#du-an-noi-bat')?.scrollIntoView({ behavior: 'smooth' })
  })

  return page
}
