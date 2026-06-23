import { saveTokensFromResponse } from '@/api/http'
import { isLoggedIn, navigate, roleHome, setRole } from '@/router'

let pendingOtpEmail = ''

export function getPendingOtpEmail() {
  return pendingOtpEmail
}

export function setPendingOtpEmail(email: string) {
  pendingOtpEmail = email
}

export function extractRole(data: unknown): string {
  if (!data || typeof data !== 'object') return ''
  const o = data as Record<string, unknown>
  const user = (o.user ?? o.User) as Record<string, unknown> | undefined
  if (user && typeof user === 'object') {
    const r = user.role ?? user.Role
    if (typeof r === 'string') return r
  }
  return ''
}

export function handleAuthResponse(data: unknown, emailForOtp?: string) {
  saveTokensFromResponse(data)
  const o = (data ?? {}) as Record<string, unknown>
  if (o.requiresOtpVerification === true || o.RequiresOtpVerification === true) {
    if (emailForOtp) setPendingOtpEmail(emailForOtp)
    navigate('verify-otp')
    return
  }
  if (isLoggedIn()) {
    const role = extractRole(data)
    setRole(role)
    navigate(roleHome(role))
  }
}
