import { useUserProfile } from '@/providers/user-profile-provider'
import { BRAND } from '@/lib/brand'
import { resolveRoleTheme } from '@/lib/role-theme'
import { getRole } from '@/router'
import { cn } from '@/lib/utils'

export function UserWelcomeBar({ className }: { className?: string }) {
  const { greeting, roleLabel, avatarUrl, initials } = useUserProfile()
  const theme = resolveRoleTheme(getRole(), true)
  const ThemeIcon = theme.Icon

  return (
    <div className={cn('gov-card mb-6 overflow-hidden p-0', className)}>
      <div className="flex flex-wrap items-stretch">
        <div className={`flex min-w-[200px] flex-1 items-center gap-4 ${theme.brandAccent} px-5 py-4 text-white`}>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white/60 bg-white/10 text-lg font-bold">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              initials
            )}
          </div>
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1.5 rounded border border-white/30 bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
              <ThemeIcon className="h-3 w-3" />
              {theme.badgeFull}
            </span>
            <h1 className="mt-1 truncate text-lg font-bold md:text-xl">{greeting}</h1>
            <p className="mt-0.5 truncate text-xs text-white/85">{roleLabel}</p>
          </div>
        </div>

        <div className="flex flex-1 flex-col justify-center gap-1 border-t border-primary/10 bg-secondary/50 px-5 py-3 sm:border-l sm:border-t-0 sm:min-w-[240px]">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-[#003D7A]">
            <ThemeIcon className="h-3.5 w-3.5 text-primary" />
            {theme.badgeFull}
          </p>
          <p className="text-[11px] text-slate-600">{BRAND.slogan}</p>
          <p className="text-[11px] font-medium text-primary">
            Hotline: {BRAND.hotline} · {BRAND.workingHours}
          </p>
        </div>
      </div>
    </div>
  )
}
