const baseUrl = import.meta.env.VITE_API_BASE_URL ?? ''

export function userInitials(name: string, email = ''): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return email.slice(0, 2).toUpperCase() || 'ND'
}

export function extractProfileImageUrl(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null
  const o = data as Record<string, unknown>
  const direct = o.profileImageUrl ?? o.ProfileImageUrl
  if (typeof direct === 'string' && direct) return resolveProfileImageUrl(direct)
  const user = o.user ?? o.User
  if (user && typeof user === 'object') {
    const url = (user as Record<string, unknown>).profileImageUrl ?? (user as Record<string, unknown>).ProfileImageUrl
    if (typeof url === 'string' && url) return resolveProfileImageUrl(url)
  }
  return null
}

export function resolveProfileImageUrl(url?: string | null): string | null {
  if (!url) return null
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:') || url.startsWith('data:'))
    return url
  return `${baseUrl.replace(/\/$/, '')}/${url.replace(/^\//, '')}`
}
