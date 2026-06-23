import { Mail, MapPin, Phone } from 'lucide-react'
import { BRAND } from '@/lib/brand'

function formatDateVi() {
  return new Date().toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/** Thanh trên cùng — hotline, email, ngày (kiểu cổng TTĐT) */
export function GovTopBar() {
  return (
    <div className="border-b border-[#003D7A]/20 bg-[#003D7A] text-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-1.5 text-[11px] lg:px-8">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="inline-flex items-center gap-1.5 font-medium">
            <Phone className="h-3 w-3 text-[#FFCD00]" />
            {BRAND.hotlineLabel}: <strong className="text-[#FFCD00]">{BRAND.hotline}</strong>
          </span>
          <span className="hidden items-center gap-1.5 sm:inline-flex">
            <Mail className="h-3 w-3 text-white/70" />
            {BRAND.email}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-white/75 md:inline">{formatDateVi()}</span>
        </div>
      </div>
    </div>
  )
}

/** Khối hotline nổi bật trong footer */
export function GovHotlineBox({ className }: { className?: string }) {
  return (
    <div className={className}>
      <p className="text-xs font-semibold uppercase tracking-wider text-white/70">{BRAND.hotlineLabel}</p>
      <p className="mt-1 text-2xl font-bold text-[#FFCD00]">{BRAND.hotline}</p>
      <p className="mt-1 text-xs text-white/60">{BRAND.workingHours}</p>
    </div>
  )
}

export function GovContactLines() {
  return (
    <div className="space-y-2 text-sm text-white/80">
      <p className="inline-flex items-start gap-2">
        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#FFCD00]" />
        {BRAND.address}
      </p>
      <p className="inline-flex items-center gap-2">
        <Mail className="h-4 w-4 shrink-0 text-[#FFCD00]" />
        {BRAND.email}
      </p>
    </div>
  )
}
