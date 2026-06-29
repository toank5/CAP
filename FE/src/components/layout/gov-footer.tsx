import { BRAND } from '@/lib/brand'
import { GovContactLines, GovHotlineBox } from '@/components/layout/gov-top-bar'
import { navigate } from '@/hooks/useHashRoute'
import { useHashRoute } from '@/hooks/useHashRoute'

const FOOTER_LINKS = [
  {
    title: 'Dịch vụ công',
    links: [
      { label: 'Tra cứu hồ sơ', route: 'tra-cuu' as const },
      { label: 'Tìm nhà ở', route: 'tim-nha' as const },
      { label: 'Danh mục dự án', route: 'projects' as const },
    ],
  },
  {
    title: 'Hỗ trợ',
    links: [
      { label: 'Hướng dẫn sử dụng', route: 'landing' as const },
      { label: 'Câu hỏi thường gặp', route: 'landing' as const },
      { label: 'Chính sách bảo mật', route: 'landing' as const },
      { label: 'Điều khoản sử dụng', route: 'landing' as const },
    ],
  },
]

const LANDING_LINKS = [
  {
    title: 'Về cổng thông tin',
    links: [
      { label: 'Giới thiệu', route: 'landing' as const },
      { label: 'Cơ quan vận hành', route: 'landing' as const },
      { label: 'Chính sách bảo mật', route: 'landing' as const },
      { label: 'Điều khoản sử dụng', route: 'landing' as const },
    ],
  },
  {
    title: 'Hỗ trợ',
    links: [
      { label: 'Hướng dẫn đăng ký', route: 'register' as const },
      { label: 'Đăng nhập', route: 'login' as const },
      { label: 'Câu hỏi thường gặp', route: 'landing' as const },
      { label: 'Liên hệ', route: 'landing' as const },
    ],
  },
]

export function GovFooter() {
  const route = useHashRoute()
  const isLanding = route === 'landing'
  const cols = isLanding ? LANDING_LINKS : FOOTER_LINKS

  return (
    <footer className="relative mt-auto overflow-hidden border-t-4 border-[#FFCD00] bg-[#003D7A] text-white">
      <div
        className="pointer-events-none absolute inset-0 opacity-15"
        style={{ backgroundImage: "url('/images/gov-pattern.svg')", backgroundSize: '24px 24px' }}
      />

      <div className="relative mx-auto max-w-7xl px-4 py-10 lg:px-8">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#FFCD00]">{BRAND.portalLine}</p>
            <p className="mt-2 text-base font-bold leading-snug">{BRAND.projectName}</p>
            <p className="mt-1 text-sm font-semibold text-white/80">{BRAND.acronym} · {BRAND.acronymExpanded}</p>
            <p className="mt-3 text-xs italic text-white/55">{BRAND.slogan}</p>
            <div className="mt-4">
              <GovContactLines />
            </div>
          </div>

          {cols.map((col) => (
            <div key={col.title}>
              <h3 className="mb-3 border-l-4 border-[#FFCD00] pl-3 text-sm font-bold uppercase tracking-wide">
                {col.title}
              </h3>
              <ul className="space-y-2">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <button
                      type="button"
                      onClick={() => navigate(link.route)}
                      className="text-sm text-white/75 transition hover:text-[#FFCD00]"
                    >
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-4 rounded-lg border border-white/15 bg-white/5 px-6 py-5 md:flex-row">
          <GovHotlineBox />
          <div className="text-center md:text-right">
            <p className="text-xs text-white/60">© {new Date().getFullYear()} {BRAND.name}</p>
            <p className="mt-1 text-xs text-white/45">{BRAND.footerLine}</p>
          </div>
        </div>

        <div className="mt-4 h-1 w-full rounded-full bg-gradient-to-r from-[#DA251D] via-[#FFCD00] to-white/40" />
      </div>
    </footer>
  )
}
