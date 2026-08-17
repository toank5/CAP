// Thin wrapper xung quanh sessionStorage cho 3 khóa xác thực:
//   accessToken, refreshToken, userRole
// Giữ cùng "ngôn ngữ" với src/api/http.ts (saveTokensFromResponse, refresh…),
// để mọi chỗ đọc/ghi token đều đi qua một helper duy nhất — tránh typo key
// và giúp chuyển sang localStorage/cookie sau này chỉ sửa một file.

export const TOKEN_KEYS = {
  access: 'accessToken',
  refresh: 'refreshToken',
  role: 'userRole',
} as const

export function getAccessToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEYS.access)
}

export function getRefreshToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEYS.refresh)
}

export function getUserRole(): string | null {
  return sessionStorage.getItem(TOKEN_KEYS.role)
}

export function setAccessToken(token: string | null | undefined): void {
  if (token) sessionStorage.setItem(TOKEN_KEYS.access, token)
  else sessionStorage.removeItem(TOKEN_KEYS.access)
}

export function setRefreshToken(token: string | null | undefined): void {
  if (token) sessionStorage.setItem(TOKEN_KEYS.refresh, token)
  else sessionStorage.removeItem(TOKEN_KEYS.refresh)
}

export function setUserRole(role: string | null | undefined): void {
  if (role) sessionStorage.setItem(TOKEN_KEYS.role, role)
  else sessionStorage.removeItem(TOKEN_KEYS.role)
}

// Xóa toàn bộ dấu vết phiên đăng nhập (dùng khi logout hoặc refresh-token thất bại).
// Phải xóa cả `userRole` vì router.getRole() đọc từ sessionStorage — nếu chỉ xóa
// accessToken thì UI vẫn nhận diện user là "đã đăng nhập" theo role cũ.
export function clearTokens(): void {
  sessionStorage.removeItem(TOKEN_KEYS.access)
  sessionStorage.removeItem(TOKEN_KEYS.refresh)
  sessionStorage.removeItem(TOKEN_KEYS.role)
}

export function isLoggedIn(): boolean {
  return !!getAccessToken()
}
