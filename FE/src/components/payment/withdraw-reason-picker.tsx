import { Textarea } from '@/components/ui/input'

export const APPLICATION_WITHDRAW_REASONS = [
  'Tôi đã tìm được nhà ở khác phù hợp',
  'Tôi nộp nhầm dự án',
  'Điều kiện tài chính thay đổi',
  'Thông tin cá nhân/hộ gia đình cần điều chỉnh',
  'Lý do khác',
]

export const CONTRACT_WITHDRAW_REASONS = [
  'Gặp khó khăn tài chính, không thể tiếp tục đóng tiền',
  'Thay đổi nhu cầu nhà ở',
  'Lý do gia đình / sức khỏe',
  'Lý do khác',
]

export function resolveWithdrawReason(reasons: string[], selected: string, otherText: string): string {
  if (!selected) return ''
  if (selected === 'Lý do khác') return otherText.trim()
  return selected
}

export function WithdrawReasonPicker({
  reasons,
  selected,
  onSelect,
  otherText,
  onOtherText,
  disabled,
}: {
  reasons: string[]
  selected: string
  onSelect: (reason: string) => void
  otherText: string
  onOtherText: (value: string) => void
  disabled?: boolean
}) {
  return (
    <div className="space-y-2">
      {reasons.map((reason) => {
        const active = selected === reason
        return (
          <button
            key={reason}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(reason)}
            className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition ${
              active
                ? 'border-rose-400 bg-rose-50 text-rose-900 dark:border-rose-700 dark:bg-rose-950/40 dark:text-rose-100'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            <span
              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                active ? 'border-rose-600' : 'border-slate-300 dark:border-slate-600'
              }`}
            >
              {active && <span className="h-2 w-2 rounded-full bg-rose-600" />}
            </span>
            <span>{reason}</span>
          </button>
        )
      })}
      {selected === 'Lý do khác' && (
        <Textarea
          rows={3}
          maxLength={300}
          value={otherText}
          disabled={disabled}
          onChange={(e) => onOtherText(e.target.value)}
          placeholder="Nhập lý do cụ thể..."
        />
      )}
    </div>
  )
}
