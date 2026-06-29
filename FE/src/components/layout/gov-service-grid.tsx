import { Building2, FileSearch, Search, UserPlus } from 'lucide-react'
import { navigate } from '@/hooks/useHashRoute'

const SERVICES = [
  { icon: Search, label: 'Tra cứu hồ sơ', desc: 'Theo dõi tiến độ', route: 'tra-cuu' as const, color: 'bg-[#0066C4]' },
  { icon: Search, label: 'Tìm nhà ở', desc: 'Tra cứu dự án', route: 'tim-nha' as const, color: 'bg-[#003D7A]' },
  { icon: Building2, label: 'Dự án nhà ở', desc: 'Danh sách dự án', route: 'projects' as const, color: 'bg-[#0066C4]' },
  { icon: FileSearch, label: 'Hồ sơ của tôi', desc: 'Xem hồ sơ', route: 'applications' as const, color: 'bg-[#005BAC]' },
  { icon: UserPlus, label: 'Đăng ký tài khoản', desc: 'Tạo tài khoản mới', route: 'register' as const, color: 'bg-[#0066C4]' },
]

/** Lưới dịch vụ công — kiểu dichvucong.gov.vn */
export function GovServiceGrid() {
  return (
    <section className="gov-card overflow-hidden p-0">
      <div className="border-b border-primary/10 bg-gradient-to-r from-[#003D7A] to-[#005BAC] px-5 py-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-white">Dịch vụ công trực tuyến</h2>
        <p className="mt-0.5 text-xs text-white/75">Thực hiện thủ tục hành chính mọi lúc, mọi nơi</p>
      </div>
      <div className="grid grid-cols-2 gap-px bg-slate-200 sm:grid-cols-3 lg:grid-cols-6 dark:bg-slate-700">
        {SERVICES.map((svc) => {
          const Icon = svc.icon
          return (
            <button
              key={svc.route}
              type="button"
              onClick={() => navigate(svc.route)}
              className="group flex flex-col items-center gap-2 bg-white px-3 py-5 text-center transition hover:bg-secondary dark:bg-slate-900 dark:hover:bg-slate-800"
            >
              <span className={`flex h-12 w-12 items-center justify-center rounded-full text-white shadow-md ${svc.color} transition group-hover:scale-105`}>
                <Icon className="h-5 w-5" />
              </span>
              <span className="text-xs font-bold text-[#003D7A] dark:text-slate-100">{svc.label}</span>
              <span className="text-[10px] leading-tight text-slate-500">{svc.desc}</span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
