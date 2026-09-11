import { Gavel, ListChecks } from 'lucide-react'
import { navigate } from '@/hooks/useHashRoute'

export type LotteryStaffTab = 'sessions' | 'steps'

function goToSteps() {
  const id = sessionStorage.getItem('lotteryProjectId') || sessionStorage.getItem('projectId') || ''
  if (id) {
    sessionStorage.setItem('lotteryProjectId', id)
    sessionStorage.setItem('projectId', id)
  }
  navigate('lottery-detail')
}

const ITEMS: {
  id: LotteryStaffTab
  label: string
  hint: string
  icon: typeof Gavel
  onClick: () => void
}[] = [
    {
      id: 'sessions',
      label: 'Quản lý phiên bốc thăm',
      hint: 'Danh sách dự án và quỹ căn',
      icon: Gavel,
      onClick: () => navigate('lottery-sessions'),
    },
    {
      id: 'steps',
      label: 'Chi tiết & Điều hành các bước',
      hint: 'Duyệt lịch, mở sảnh, kết thúc, công bố',
      icon: ListChecks,
      onClick: goToSteps,
    },
  ]

/** Tab chuyển giữa quản lý phiên, các bước thao tác và sảnh quay số. */
export function LotteryStaffTabs({ current }: { current: LotteryStaffTab }) {
  return (
    <nav
      aria-label="Chuyển màn bốc thăm"
      className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-xs dark:border-slate-800 dark:bg-slate-900"
    >
      {ITEMS.map((item) => {
        const active = item.id === current
        const Icon = item.icon
        return (
          <button
            key={item.id}
            type="button"
            onClick={item.onClick}
            className={`flex min-w-[9.5rem] flex-1 items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition ${active
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                : 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800'
              }`}
          >
            <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-white' : 'text-indigo-500'}`} />
            <span className="min-w-0">
              <span className="block text-sm font-bold leading-tight">{item.label}</span>
              <span className={`block text-[11px] leading-tight ${active ? 'text-indigo-100' : 'text-slate-500 dark:text-slate-400'}`}>
                {item.hint}
              </span>
            </span>
          </button>
        )
      })}
    </nav>
  )
}
