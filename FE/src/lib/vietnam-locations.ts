import locations from '@/data/vietnam-locations.json'

export interface VietnamProvince {
  code: string
  name: string
  districts: string[]
}

export const VIETNAM_PROVINCES = locations as VietnamProvince[]

export function getDistrictsByProvince(provinceName: string): string[] {
  if (!provinceName) return []
  return VIETNAM_PROVINCES.find((p) => p.name === provinceName)?.districts ?? []
}

/** Khớp tên tỉnh đã lưu (có thể thiếu tiền tố) với danh sách chuẩn. */
export function resolveProvinceName(value: string): string {
  if (!value) return ''
  const exact = VIETNAM_PROVINCES.find((p) => p.name === value)
  if (exact) return exact.name

  const norm = (s: string) => s.toLowerCase().normalize('NFC').trim()
  const target = norm(value)
  const byNorm = VIETNAM_PROVINCES.find((p) => norm(p.name) === target)
  if (byNorm) return byNorm.name

  const short = value.replace(/^(Tỉnh|Thành phố)\s+/i, '').trim()
  return VIETNAM_PROVINCES.find((p) => p.name.includes(short) || short.includes(p.name.replace(/^(Tỉnh|Thành phố)\s+/, '')))?.name ?? value
}
