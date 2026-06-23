import { useUserProfile } from '@/providers/user-profile-provider'

/** @deprecated Prefer useUserProfile — kept for existing imports */
export function useUserGreeting() {
  const { fullName: name, roleLabel, greeting } = useUserProfile()
  return { name, roleLabel, greeting }
}
