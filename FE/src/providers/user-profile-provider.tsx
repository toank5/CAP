import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { usersApi } from '@/api/users'
import { labelRole } from '@/lib/labels'
import { extractProfileImageUrl, userInitials } from '@/lib/user-display'
import { isLoggedIn } from '@/router'

interface UserProfileState {
  fullName: string
  email: string
  avatarUrl: string | null
  roleLabel: string
  ekycVerified: boolean
}

interface UserProfileContextValue extends UserProfileState {
  greeting: string
  initials: string
  updateProfile: (patch: Partial<Pick<UserProfileState, 'fullName' | 'avatarUrl'>>) => void
  refreshProfile: () => Promise<void>
}

const empty: UserProfileState = {
  fullName: '',
  email: '',
  avatarUrl: null,
  roleLabel: '',
  ekycVerified: false,
}

const UserProfileContext = createContext<UserProfileContextValue | null>(null)

function readUser(data: unknown): UserProfileState | null {
  if (!data || typeof data !== 'object') return null
  const root = data as Record<string, unknown>
  const u = (root.user ?? root.User ?? root) as Record<string, unknown>
  if (!u || typeof u !== 'object') return null

  const fullName = String(u.fullName ?? u.FullName ?? '')
  const email = String(u.email ?? u.Email ?? '')
  const role = String(u.role ?? u.Role ?? sessionStorage.getItem('userRole') ?? '')
  const ekycVerified = Boolean(u.ekycVerified ?? u.EkycVerified ?? u.kycVerified ?? u.KycVerified ?? true)

  return {
    fullName,
    email,
    avatarUrl: extractProfileImageUrl(u),
    roleLabel: labelRole(role),
    ekycVerified,
  }
}

export function UserProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfileState>(empty)
  const logged = isLoggedIn()

  const refreshProfile = useCallback(async () => {
    if (!isLoggedIn()) {
      setProfile(empty)
      return
    }
    try {
      const data = await usersApi.getProfile()
      const next = readUser(data)
      if (next) setProfile(next)
    } catch {
      const role = sessionStorage.getItem('userRole') ?? ''
      setProfile((prev) => ({ ...prev, roleLabel: labelRole(role) }))
    }
  }, [])

  useEffect(() => {
    if (!logged) {
      setProfile(empty)
      return
    }
    void refreshProfile()
  }, [logged, refreshProfile])

  const updateProfile = useCallback((patch: Partial<Pick<UserProfileState, 'fullName' | 'avatarUrl'>>) => {
    setProfile((prev) => ({ ...prev, ...patch }))
  }, [])

  const value = useMemo<UserProfileContextValue>(() => {
    const greeting = profile.fullName ? `Xin chào, ${profile.fullName}` : 'Xin chào'
    return {
      ...profile,
      greeting,
      initials: userInitials(profile.fullName, profile.email),
      updateProfile,
      refreshProfile,
    }
  }, [profile, updateProfile, refreshProfile])

  return <UserProfileContext.Provider value={value}>{children}</UserProfileContext.Provider>
}

export function useUserProfile() {
  const ctx = useContext(UserProfileContext)
  if (!ctx) throw new Error('useUserProfile must be used within UserProfileProvider')
  return ctx
}
