import { BRAND } from '../brand'
import { el } from './helpers'

export function govTricolorBar(): HTMLElement {
  return el(
    'div',
    { class: 'gov-tricolor', 'aria-hidden': 'true' },
    el('span', { class: 'red' }),
    el('span', { class: 'gold' }),
    el('span', { class: 'blue' }),
  )
}

export function brandLogo(): HTMLElement {
  const svg = `
<svg class="brand-logo" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="RHS">
  <defs>
    <linearGradient id="rhs-bg" x1="8" y1="4" x2="56" y2="60" gradientUnits="userSpaceOnUse">
      <stop stop-color="#023e8a"/>
      <stop offset="1" stop-color="#00b4d8"/>
    </linearGradient>
    <linearGradient id="rhs-ring" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
      <stop stop-color="#c8102e"/>
      <stop offset="0.45" stop-color="#ffb703"/>
      <stop offset="1" stop-color="#0077c8"/>
    </linearGradient>
    <filter id="rhs-shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#001d3d" flood-opacity="0.35"/>
    </filter>
  </defs>
  <circle cx="32" cy="32" r="29" fill="url(#rhs-bg)" stroke="url(#rhs-ring)" stroke-width="2.5"/>
  <g filter="url(#rhs-shadow)">
    <path d="M14 42V28l11-8 11 8v14H14z" fill="#fff"/>
    <rect x="19" y="34" width="5" height="8" rx="0.5" fill="#caf0f8"/>
    <rect x="27" y="34" width="5" height="8" rx="0.5" fill="#caf0f8"/>
    <rect x="35" y="34" width="5" height="8" rx="0.5" fill="#caf0f8"/>
    <rect x="27" y="29" width="6" height="5" rx="0.5" fill="#ffd166"/>
    <path d="M38 42h12v-10l-6-5-6 5v10z" fill="#fff" fill-opacity="0.92"/>
    <rect x="41" y="36" width="3" height="6" fill="#90e0ef"/>
    <rect x="46" y="36" width="3" height="6" fill="#90e0ef"/>
  </g>
  <path d="M44 16c5.5 0 10 2.8 10 7.2 0 6.2-10 12.8-10 12.8S34 29.4 34 23.2C34 18.8 38.5 16 44 16z" fill="#e63946"/>
  <path d="M40.5 23.5l2.2 2.3 5-6.2" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`
  const wrap = el('div', { class: 'brand-mark' })
  wrap.innerHTML = svg
  return wrap
}

export function marketingHero(): HTMLElement {
  return el(
    'aside',
    { class: 'hero-panel' },
    el('div', { class: 'hero-inner' },
      el('div', { class: 'hero-badge' }, '✦ Dịch vụ công trực tuyến'),
      el('h2', { class: 'hero-title' }, 'Nhà ở xã hội — minh bạch & hiện đại'),
      el(
        'p',
        { class: 'hero-text' },
        'Cổng thông tin hỗ trợ điều phối nguồn nhà, thẩm định hồ sơ và quản lý phân quyền theo quy định nhà nước.',
      ),
      el('ul', { class: 'hero-features' },
        featureItem('accent-1', 'Điều phối', 'Phối hợp nguồn nhà theo địa bàn'),
        featureItem('accent-2', 'Thẩm định', 'Vetting hồ sơ minh bạch'),
        featureItem('accent-3', 'Bảo mật', 'Xác thực OTP & phiên an toàn'),
      ),
    ),
  )
}

function featureItem(accent: string, title: string, text: string): HTMLLIElement {
  return el(
    'li',
    { class: accent },
    el('strong', {}, title),
    el('span', {}, text),
  ) as HTMLLIElement
}

export function appFooter(): HTMLElement {
  return el(
    'footer',
    { class: 'app-footer' },
    el('div', { class: 'footer-accent', 'aria-hidden': 'true' }),
    el('div', { class: 'footer-inner' },
      el('div', { class: 'footer-grid' },
        el('div', { class: 'footer-col footer-brand' },
          el('strong', {}, BRAND.nameVi),
          el('p', {}, BRAND.taglineVi),
        ),
        el('div', { class: 'footer-col' },
          el('strong', {}, 'Hỗ trợ người dùng'),
          el('p', {}, 'Email: support@rhs.gov.vn'),
          el('p', {}, 'Giờ làm việc: 8:00 – 17:00 (T2–T6)'),
        ),
        el('div', { class: 'footer-col' },
          el('strong', {}, 'Bản quyền'),
          el('p', {}, `© ${new Date().getFullYear()} ${BRAND.name}`),
          el('p', { class: 'footer-note' }, 'Phiên bản hệ thống 1.0'),
        ),
      ),
    ),
  )
}
