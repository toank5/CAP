import { Megaphone } from 'lucide-react'

const ANNOUNCEMENTS = [
  { date: '05/06/2026', text: 'Cập nhật danh sách dự án nhà ở xã hội Quý II/2026 trên toàn quốc' },
  { date: '01/06/2026', text: 'Hướng dẫn tra cứu hồ sơ đã đăng ký qua cổng RHS' },
  { date: '28/05/2026', text: 'Thông báo lịch nghỉ và tiếp nhận hồ sơ dịp Quốc khánh 2/9' },
]

/** Dòng thông báo chính thức */
export function GovAnnouncements() {
  return (
    <div className="gov-card flex flex-col gap-0 overflow-hidden p-0 sm:flex-row">
      <div className="flex shrink-0 items-center gap-2 bg-[#DA251D] px-4 py-2.5 text-white sm:py-0">
        <Megaphone className="h-4 w-4 shrink-0" />
        <span className="whitespace-nowrap text-xs font-bold uppercase tracking-wider">Thông báo</span>
      </div>
      <div className="flex flex-1 flex-col justify-center gap-1 px-4 py-2.5 sm:py-2">
        {ANNOUNCEMENTS.map((a) => (
          <p key={a.date} className="flex flex-wrap items-baseline gap-x-2 text-xs">
            <time className="shrink-0 font-bold text-[#DA251D]">[{a.date}]</time>
            <span className="text-slate-700 dark:text-slate-300">{a.text}</span>
          </p>
        ))}
      </div>
    </div>
  )
}
