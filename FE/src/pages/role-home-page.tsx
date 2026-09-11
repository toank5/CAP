import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  ClipboardPenLine,
  FileSignature,
  ShieldAlert,
} from 'lucide-react'
import { housingApplicationsApi, parsePagedApplications } from '@/api/housing-applications'
import { usersApi } from '@/api/users'
import { HouseCard } from '@/components/housing/house-card'
import { HousingShowcase } from '@/components/housing/housing-showcase'
import { DeveloperHomePage } from '@/pages/developer-home-page'
import { SxdHomePage } from '@/pages/sxd-home-page'
import { Skeleton } from '@/components/ui/skeleton'
import { useWishlist } from '@/hooks/useWishlist'
import { navigate } from '@/hooks/useHashRoute'
import { formatError } from '@/lib/format-error'
import { mapProjectToCard } from '@/lib/projects'
import { readVerifiedStatus } from '@/lib/verification'


export function ApplicantHomePage() {
  return (
    <div className="space-y-6">
      <ApplicantSetupNotices />
      <PaymentCalloutBanner />
      <HousingShowcase />
    </div>
  )
}

function ApplicantSetupNotices() {
  const [loading, setLoading] = useState(true)
  const [ekycPending, setEkycPending] = useState(false)
  const [declarationPending, setDeclarationPending] = useState(false)

  const loadStatus = useCallback(async () => {
    setLoading(true)
    try {
      const [profileResult, fullProfileResult, householdResult] = await Promise.all([
        usersApi.getProfile(),
        usersApi.getFullProfile(),
        usersApi.getHouseholdMembers(),
      ])
      const unwrapObject = (input: unknown): Record<string, unknown> => {
        let current = input
        for (let depth = 0; depth < 4; depth += 1) {
          if (!current || typeof current !== 'object' || Array.isArray(current)) return {}
          const object = current as Record<string, unknown>
          const nested = object.user ?? object.User ?? object.data ?? object.Data ?? object.value ?? object.Value ?? object.result ?? object.Result
          if (!nested || typeof nested !== 'object' || Array.isArray(nested)) return object
          current = nested
        }
        return current && typeof current === 'object' && !Array.isArray(current) ? current as Record<string, unknown> : {}
      }
      const profile = unwrapObject(profileResult)
      const full = unwrapObject(fullProfileResult)
      const profileData = { ...profile, ...full }
      const verified = readVerifiedStatus(profileResult)
      const value = (key: string) => profileData[key] ?? profileData[key.charAt(0).toUpperCase() + key.slice(1)]
      const findArray = (input: unknown, depth = 0): unknown[] => {
        if (Array.isArray(input)) return input
        if (!input || typeof input !== 'object' || depth > 4) return []
        const object = input as Record<string, unknown>
        for (const key of ['value', 'Value', 'items', 'Items', 'data', 'Data', 'result', 'Result']) {
          const found = findArray(object[key], depth + 1)
          if (found.length > 0 || Array.isArray(object[key])) return found
        }
        return []
      }
      const members = findArray(householdResult) as Array<Record<string, unknown>>
      const hasSpouse = members.some((member) => (member.relationship ?? member.Relationship) === 'SPOUSE')
      const maritalStatus = String(value('maritalStatus') ?? '')
      const housing = String(value('housingStatus') ?? '')
      const income = value('monthlyIncome') ?? value('MonthlyIncome') ?? value('estimatedMonthlyIncome') ?? value('EstimatedMonthlyIncome')
      const permanent = String(value('permanentAddress') ?? value('address') ?? '').trim()
      const current = String(value('currentResidence') ?? permanent).trim()

      const declarationComplete = Boolean(
        maritalStatus &&
        String(value('occupation') ?? '').trim() &&
        String(value('workPlace') ?? '').trim() &&
        (current || permanent) &&
        income != null && income !== '' &&
        housing &&
        (housing !== 'SMALL_HOUSE' || value('averageHousingAreaPerPerson') != null) &&
        value('priorityGroup') &&
        (maritalStatus !== 'MARRIED' || hasSpouse || Boolean(value('spouseFullName'))),
      )
      setEkycPending(verified !== true)
      setDeclarationPending(!declarationComplete)
    } catch {
      // Không khóa trang chủ khi API trạng thái tạm thời lỗi.
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadStatus()
    const onFocus = () => void loadStatus()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [loadStatus])

  if (loading || (!ekycPending && !declarationPending)) return null

  return (
    <div className="overflow-hidden rounded-xl border border-rose-200 bg-rose-50/80 shadow-sm dark:border-rose-900/70 dark:bg-slate-900">
      <div className="flex items-center gap-2.5 bg-gradient-to-r from-rose-100 to-orange-50 px-4 py-3 dark:from-rose-950/40 dark:to-slate-900">
        <ShieldAlert className="h-4 w-4 shrink-0 text-rose-700 dark:text-rose-300" />
        <p className="text-sm font-semibold text-rose-950 dark:text-rose-100">Hồ sơ của bạn chưa hoàn tất</p>
      </div>
      <div className="grid gap-2 border-t border-rose-200/80 p-3 dark:border-rose-900/60 sm:grid-cols-2">
        {ekycPending && (
          <button type="button" onClick={() => navigate('verify-identity')} className="group flex min-h-12 items-center gap-2.5 rounded-lg border border-orange-200 bg-orange-100/80 px-3 py-2.5 text-left transition hover:border-orange-300 hover:bg-orange-100 dark:border-orange-900/60 dark:bg-orange-950/30 dark:hover:bg-orange-900/40">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-200/80 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300">
              <ShieldAlert className="h-3.5 w-3.5" />
            </span>
            <span className="flex-1 text-sm font-medium text-slate-900 dark:text-white">Xác minh eKYC</span>
            <ArrowRight className="h-4 w-4 shrink-0 text-orange-800 transition group-hover:translate-x-0.5 dark:text-orange-300" />
          </button>
        )}
        {declarationPending && (
          <button type="button" onClick={() => navigate('profile')} className="group flex min-h-12 items-center gap-2.5 rounded-lg border border-red-200 bg-red-100/70 px-3 py-2.5 text-left transition hover:border-red-300 hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/30 dark:hover:bg-red-900/40">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-200/80 text-red-700 dark:bg-red-900/50 dark:text-red-300">
              <ClipboardPenLine className="h-3.5 w-3.5" />
            </span>
            <span className="flex-1 text-sm font-medium text-slate-900 dark:text-white">Kê khai chính sách</span>
            <ArrowRight className="h-4 w-4 shrink-0 text-red-700 transition group-hover:translate-x-0.5 dark:text-red-300" />
          </button>
        )}
      </div>
    </div>
  )
}

/**
 * Banner nổi bật: nếu Applicant có hồ sơ đang ở giai đoạn ký HĐ / thanh toán,
 * hiện CTA lớn dẫn thẳng vào /contracts để ký hoặc thanh toán.
 * Hiển thị cho cả role Applicant và Housing Developer (riêng label).
 */
function PaymentCalloutBanner() {
  const [items, setItems] = useState<
    { applicationId: string; status: string; projectName?: string }[]
  >([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await housingApplicationsApi.getMy({ pageIndex: 1, pageSize: 50 })
        const list = parsePagedApplications(res) ?? []
        if (cancelled) return
        setItems(
          list
            .filter((a) =>
              [
                'CONTRACT_PENDING',
                'CONTRACT_SIGNED',
                'DEPOSIT_PAID',
                'INSTALLMENT_IN_PROGRESS',
                'FULLY_PAID',
              ].includes(a.applicationStatus),
            )
            .map((a) => ({
              applicationId: a.applicationId,
              status: a.applicationStatus,
              projectName: a.projectName,
            })),
        )
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading || items.length === 0) return null

  const first = items[0]
  const tone = (() => {
    if (first.status === 'CONTRACT_PENDING')
      return 'from-amber-500 to-orange-500' // cần ký HĐ
    if (first.status === 'FULLY_PAID') return 'from-emerald-500 to-teal-500'
    return 'from-blue-500 to-indigo-500' // đang thanh toán
  })()
  const title = (() => {
    if (first.status === 'CONTRACT_PENDING')
      return 'Bạn có hợp đồng mua bán chờ ký'
    if (first.status === 'FULLY_PAID') return 'Bạn đã hoàn tất thanh toán'
    return 'Bạn có hồ sơ đang thanh toán theo đợt'
  })()
  const sub = (() => {
    if (first.status === 'CONTRACT_PENDING')
      return 'Mở Hợp đồng để đồng ý điều khoản và thanh toán đợt đầu (cọc 10%) trong 168 giờ.'
    if (first.status === 'FULLY_PAID')
      return 'Hồ sơ của bạn đã hoàn tất — hẹn gặp bạn tại lễ bàn giao nhà.'
    return 'Theo dõi tiến độ các đợt thanh toán và thanh toán đợt đang mở.'
  })()
  const cta = first.status === 'FULLY_PAID' ? 'Xem chi tiết' : 'Mở hợp đồng'

  const handleClick = () => {
    navigate('my-apartment')
  }

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative w-full overflow-hidden rounded-2xl bg-gradient-to-r ${tone} p-5 text-left text-white shadow-lg sm:p-6`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
            <FileSignature className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold sm:text-lg">{title}</h3>
            <p className="mt-0.5 text-sm text-white/90">
              {sub}
              {first.projectName && (
                <>
                  {' '}
                  · Dự án: <strong>{first.projectName}</strong>
                </>
              )}
            </p>
            {items.length > 1 && (
              <p className="mt-1 text-xs text-white/80">
                +{items.length - 1} hồ sơ khác đang trong giai đoạn này
              </p>
            )}
          </div>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white/20 px-3 py-1.5 text-xs font-semibold backdrop-blur transition hover:bg-white/30">
          {cta}
          <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </motion.button>
  )
}

export function InterestedPage() {
  const { items, loading, isWishlisted, toggle } = useWishlist()
  const [error, setError] = useState('')

  const cards = items.map((w) =>
    mapProjectToCard({
      id: w.projectId,
      projectName: w.projectName,
      description: w.description,
      province: w.province,
      district: w.district,
      address: w.address,
      minPrice: w.minPrice,
      maxPrice: w.maxPrice,
      minArea: w.minArea,
      maxArea: w.maxArea,
      availableUnits: w.availableUnits,
      thumbnailUrl: w.thumbnailUrl,
      status: w.status,
    }),
  )

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Dự án quan tâm</h1>
      {loading && <Skeleton className="h-40 w-full" />}
      {error && <p className="text-sm text-red-500">{error}</p>}
      {!loading && cards.length === 0 ? (
        <div className="rounded-2xl border border-slate-200/50 bg-white/50 p-8 text-center shadow-sm backdrop-blur-xl dark:border-slate-700/50 dark:bg-slate-900/50">
          <p className="text-slate-500 dark:text-slate-400">Bạn chưa quan tâm dự án nào.<br />Nhấn trái tim trên trang chủ để lưu dự án.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map((h) => (
            <HouseCard
              key={h.id}
              house={h}
              fav={isWishlisted(h.id)}
              onToggleFavorite={() => { void toggle(h.id).catch((err) => setError(formatError(err))) }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function StaffRoleHomePage({ routeId }: { routeId: 'home-developer' | 'home-sxd' }) {
  if (routeId === 'home-sxd') return <SxdHomePage />
  return <DeveloperHomePage />
}

