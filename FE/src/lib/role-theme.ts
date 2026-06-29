import type { LucideIcon } from 'lucide-react'
import {
  Building2,
  ClipboardCheck,
  LayoutDashboard,
  ShieldCheck,
  UserCircle2,
  Users,
} from 'lucide-react'

export type RoleThemeId = 'public' | 'applicant' | 'ward' | 'verifier' | 'admin'

export interface RoleTheme {
  id: RoleThemeId
  badge: string
  badgeFull: string
  navBg: string
  navBgHover: string
  navActiveBg: string
  navTextColor: string
  navActiveTextColor: string
  activeBar: string
  brandAccent: string
  brandAccentHover: string
  brandRing: string
  ctaBg: string
  ctaBgHover: string
  ctaText: string
  ctaLabel: string
  ctaShort: string
  ctaRoute: string
  homeRoute: string
  Icon: LucideIcon
}

export const ROLE_THEMES: Record<RoleThemeId, RoleTheme> = {
  public: {
    id: 'public',
    badge: 'Cổng DVC',
    badgeFull: 'Cổng dịch vụ công trực tuyến',
    navBg: 'bg-[#005BAC]',
    navBgHover: 'hover:bg-white/10',
    navActiveBg: 'bg-white/15',
    navTextColor: 'text-white/85',
    navActiveTextColor: 'text-white',
    activeBar: 'bg-[#FFCD00]',
    brandAccent: 'bg-[#005BAC]',
    brandAccentHover: 'hover:bg-[#003D7A]',
    brandRing: 'ring-[#005BAC]/30',
    ctaBg: 'bg-[#DA251D]',
    ctaBgHover: 'hover:bg-[#b81e17]',
    ctaText: 'text-white',
    ctaLabel: 'Đăng ký ngay',
    ctaShort: 'Đăng ký',
    ctaRoute: 'register',
    homeRoute: 'landing',
    Icon: LayoutDashboard,
  },
  applicant: {
    id: 'applicant',
    badge: 'Người dùng',
    badgeFull: 'Cổng công dân',
    navBg: 'bg-emerald-700',
    navBgHover: 'hover:bg-emerald-600/30',
    navActiveBg: 'bg-white/20',
    navTextColor: 'text-emerald-50/85',
    navActiveTextColor: 'text-white',
    activeBar: 'bg-amber-300',
    brandAccent: 'bg-emerald-700',
    brandAccentHover: 'hover:bg-emerald-800',
    brandRing: 'ring-emerald-600/40',
    ctaBg: 'bg-amber-500',
    ctaBgHover: 'hover:bg-amber-600',
    ctaText: 'text-emerald-950',
    ctaLabel: 'Xem hồ sơ',
    ctaShort: 'Hồ sơ',
    ctaRoute: 'applications',
    homeRoute: 'home-user',
    Icon: UserCircle2,
  },
  ward: {
    id: 'ward',
    badge: 'Quản lý phường',
    badgeFull: 'Quản lý phường / xã',
    navBg: 'bg-orange-600',
    navBgHover: 'hover:bg-orange-500/30',
    navActiveBg: 'bg-white/20',
    navTextColor: 'text-orange-50/85',
    navActiveTextColor: 'text-white',
    activeBar: 'bg-yellow-300',
    brandAccent: 'bg-orange-600',
    brandAccentHover: 'hover:bg-orange-700',
    brandRing: 'ring-orange-500/40',
    ctaBg: 'bg-yellow-400',
    ctaBgHover: 'hover:bg-yellow-500',
    ctaText: 'text-orange-950',
    ctaLabel: 'Duyệt hồ sơ',
    ctaShort: 'Duyệt',
    ctaRoute: 'applications',
    homeRoute: 'home-ward',
    Icon: Building2,
  },
  verifier: {
    id: 'verifier',
    badge: 'Thẩm tra',
    badgeFull: 'Cán bộ thẩm tra xác minh',
    navBg: 'bg-purple-700',
    navBgHover: 'hover:bg-purple-600/30',
    navActiveBg: 'bg-white/20',
    navTextColor: 'text-purple-50/85',
    navActiveTextColor: 'text-white',
    activeBar: 'bg-pink-300',
    brandAccent: 'bg-purple-700',
    brandAccentHover: 'hover:bg-purple-800',
    brandRing: 'ring-purple-500/40',
    ctaBg: 'bg-pink-500',
    ctaBgHover: 'hover:bg-pink-600',
    ctaText: 'text-white',
    ctaLabel: 'Hồ sơ chờ duyệt',
    ctaShort: 'Duyệt',
    ctaRoute: 'applications',
    homeRoute: 'home-verifier',
    Icon: ClipboardCheck,
  },
  admin: {
    id: 'admin',
    badge: 'Quản trị',
    badgeFull: 'Quản trị hệ thống',
    navBg: 'bg-slate-800',
    navBgHover: 'hover:bg-slate-700/40',
    navActiveBg: 'bg-white/15',
    navTextColor: 'text-slate-100/85',
    navActiveTextColor: 'text-white',
    activeBar: 'bg-cyan-300',
    brandAccent: 'bg-slate-800',
    brandAccentHover: 'hover:bg-slate-900',
    brandRing: 'ring-slate-500/40',
    ctaBg: 'bg-cyan-500',
    ctaBgHover: 'hover:bg-cyan-600',
    ctaText: 'text-slate-950',
    ctaLabel: 'Thêm cán bộ',
    ctaShort: 'Cán bộ',
    ctaRoute: 'create-staff',
    homeRoute: 'admin-staff',
    Icon: ShieldCheck,
  },
}

export function resolveRoleTheme(role: string | null, logged: boolean): RoleTheme {
  if (!logged || !role) return ROLE_THEMES.public
  if (role === 'Applicant') return ROLE_THEMES.applicant
  if (role === 'Ward Manager') return ROLE_THEMES.ward
  if (role === 'Verification Officer') return ROLE_THEMES.verifier
  if (role === 'System Administrator') return ROLE_THEMES.admin
  return ROLE_THEMES.public
}

export const ROLE_ICONS = {
  applicant: UserCircle2,
  ward: Building2,
  verifier: ClipboardCheck,
  admin: ShieldCheck,
  public: Users,
} as const
