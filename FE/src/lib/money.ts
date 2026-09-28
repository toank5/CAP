/**
 * Giá nhà / đợt thanh toán trên BE đã chia 1.000 vì sandbox VNPay không nhận quá 150 triệu/lần.
 *
 * | Lưu (VNPay thu) | Hiện trên giao diện |
 * | 100.000         | 100 triệu           |
 * | 1.500.000       | 1,5 tỷ              |
 *
 * Thu nhập người dân không chia — hiện số đúng như API trả.
 */
export const SANDBOX_PRICE_SCALE = 1000

export function toNominalVnd(stored?: number | null): number | null {
  if (stored == null || Number.isNaN(Number(stored))) return null
  return Math.round(Number(stored) * SANDBOX_PRICE_SCALE)
}

export function formatVnd(amount?: number | null): string {
  if (amount == null || Number.isNaN(Number(amount))) return '—'
  return `${Math.round(Number(amount)).toLocaleString('vi-VN')} VNĐ`
}

function trimUnit(n: number): string {
  if (Number.isInteger(n)) return n.toLocaleString('vi-VN')
  return n.toLocaleString('vi-VN', { maximumFractionDigits: 2 })
}

function formatNominalVnd(nominal: number): string {
  if (nominal >= 1_000_000_000) return `${trimUnit(nominal / 1_000_000_000)} tỷ`
  if (nominal >= 1_000_000) return `${trimUnit(nominal / 1_000_000)} triệu`
  return `${nominal.toLocaleString('vi-VN')} VNĐ`
}

/** Giá căn / đợt / giao dịch nhà: 100.000 lưu → "100 triệu"; 1.500.000 lưu → "1,5 tỷ". */
export function formatHousingVnd(stored?: number | null): string {
  const nominal = toNominalVnd(stored)
  if (nominal == null || nominal <= 0) return '—'
  return formatNominalVnd(nominal)
}

export function formatHousingVndRange(min?: number | null, max?: number | null): string {
  const a = Number(min) || 0
  const b = Number(max) || 0
  if (a <= 0 && b <= 0) return 'Liên hệ'
  if (a <= 0) return formatHousingVnd(b)
  if (b <= 0 || a === b) return formatHousingVnd(a)
  return `${formatHousingVnd(a)} – ${formatHousingVnd(b)}`
}

/** 1 triệu giá tượng trưng = 1.000 đơn vị lưu trên API. */
export function nominalMillionToStored(million: number): number {
  return million * 1_000
}
