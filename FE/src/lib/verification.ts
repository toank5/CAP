import { usersApi } from '@/api/users'

/**
 * Helper đọc trạng thái xác minh CCCD từ response của `usersApi.getProfile()`.
 *
 * Backend có thể trả về nhiều shape khác nhau:
 *   - { user: { ... } }        (bọc trong `user`)
 *   - { User: { ... } }        (bọc trong `User`, PascalCase)
 *   - { fullName, ... }        (dữ liệu user ở root)
 *
 * Trả về:
 *   - true  : user chắc chắn đã xác minh (có cờ hoặc đã có CCCD)
 *   - false : user chắc chắn chưa xác minh
 *   - null  : không xác định được (response lạ / không đọc được) → caller tự quyết
 */
export function readVerifiedStatus(data: unknown): boolean | null {
  if (!data || typeof data !== 'object') return null
  let u: Record<string, unknown> | null = data as Record<string, unknown>
  for (let depth = 0; depth < 3; depth += 1) {
    const nested = u.user ?? u.User ?? u.data ?? u.Data ?? u.value ?? u.Value
    if (!nested || typeof nested !== 'object' || Array.isArray(nested)) break
    u = nested as Record<string, unknown>
  }
  if (!u || typeof u !== 'object') return null

  // 1) Ưu tiên cờ xác minh rõ ràng (boolean)
  const flag = u.isCitizenIdVerified ?? u.IsCitizenIdVerified
  if (typeof flag === 'boolean') return flag

  // 2) Suy ra từ số CCCD đã có
  const citizenId = u.citizenId ?? u.CitizenId
  if (typeof citizenId === 'string') return citizenId.trim().length > 0

  return null
}

/**
 * Cache trạng thái xác minh ở phạm vi module để mọi component truy cập được.
 */
type VerifiedCache = { value: boolean | null }
const verifiedCache: VerifiedCache = { value: null }

export function getCachedVerified(): boolean | null {
  return verifiedCache.value
}

export function setCachedVerified(value: boolean | null): void {
  verifiedCache.value = value
  try {
    localStorage.removeItem('ekyc_verified_cache')
    if (value === true) sessionStorage.removeItem('ekyc_notice_dismissed')
  } catch {
    /* ignore */
  }
}

/** Làm mới cache từ profile (không redirect). */
export async function refreshVerifiedCache(): Promise<boolean | null> {
  try {
    const data = await usersApi.getProfile()
    const verified = readVerifiedStatus(data)
    if (verified !== null) setCachedVerified(verified)
    return verified
  } catch {
    return getCachedVerified()
  }
}
