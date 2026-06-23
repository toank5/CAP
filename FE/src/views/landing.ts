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
  { num: '02', title: 'Đăng ký hồ sơ', desc: 'Điền thông tin, upload giấy tờ và xác thực eKYC.' },
  { num: '03', title: 'Thẩm định', desc: 'Cán bộ xét duyệt theo quy trình công khai.' },
  { num: '04', title: 'Kết quả & thanh toán', desc: 'Nhận thông báo và hoàn tất nghĩa vụ tài chính.' },
]

const NEWS = [
  { title: 'Mở đợt đăng ký nhà ở xã hội Quý II/2026', date: '01/06/2026' },
  { title: 'Hướng dẫn nộp hồ sơ trực tuyến qua cổng RHS', date: '28/05/2026' },
  { title: 'Danh sách dự án ưu tiên hỗ trợ hộ nghèo', date: '15/05/2026' },
]

export function landingView(): HTMLElement {
  const hero = el(
    'section',
    { class: 'landing-hero' },
    el('div', { class: 'landing-hero-inner' },
      el('p', { class: 'landing-eyebrow' }, BRAND.orgLine),
      el('h1', { class: 'landing-title' }, BRAND.nameVi),
      el('p', { class: 'landing-lead' },
        'Nền tảng số kết nối nguồn cung nhà ở xã hội — minh bạch, hiệu quả và phục vụ người dân 24/7.',
      ),
      el('div', { class: 'landing-cta' },
        el('button', { type: 'button', class: 'btn-primary' }, 'Đăng ký hồ sơ'),
        el('button', { type: 'button', class: 'btn-secondary' }, 'Xem dự án'),
        el('button', { type: 'button', class: 'btn-ghost' }, 'Tra cứu hồ sơ'),
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
  )

  hero.querySelectorAll('.landing-cta button')[0]?.addEventListener('click', () => navigate('register'))
  hero.querySelectorAll('.landing-cta button')[2]?.addEventListener('click', () => navigate('tra-cuu'))

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
        el('h2', {}, 'Quy trình đăng ký'),
        el('p', {}, 'Bốn bước đơn giản để nộp hồ sơ nhà ở xã hội'),
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
