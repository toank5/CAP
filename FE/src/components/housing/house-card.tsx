import { memo } from 'react'
import { Heart, MapPin, Ruler, Layers } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { navigate } from '@/hooks/useHashRoute'
import type { ProjectCard } from '@/lib/projects'

export const HouseCard = memo(function HouseCard({
  house,
  fav,
  onToggleFavorite,
  actionButton,
}: {
  house: ProjectCard
  fav?: boolean
  onToggleFavorite?: () => void
  actionButton?: React.ReactNode
}) {
  const goToDetail = () => {
    sessionStorage.setItem('projectId', house.id)
    navigate('project-detail')
  }

  const goToApply = () => {
    sessionStorage.setItem('projectId', house.id)
    navigate('create-application')
  }

  const handleFavorite: React.MouseEventHandler<HTMLButtonElement> = (e) => {
    e.stopPropagation()
    onToggleFavorite?.()
  }

  return (
    <article
      className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900 cursor-pointer"
      onClick={goToDetail}
    >
      {/* Thumbnail Area */}
      <div className="relative aspect-[16/10] overflow-hidden bg-slate-900">
        <img
          src={house.imageUrl}
          alt={house.name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />

        {/* Top Floating Status Badge */}
        <div className="absolute left-3 top-3">
          <span className="rounded-full bg-emerald-600/90 px-2.5 py-0.5 text-[11px] font-bold text-white shadow-sm backdrop-blur-md">
            {house.status}
          </span>
        </div>

        {/* Favorite Button */}
        {onToggleFavorite && (
          <button
            type="button"
            aria-label="Quan tâm"
            onClick={handleFavorite}
            className={`absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full shadow-md backdrop-blur-md transition active:scale-90 ${fav
              ? 'bg-rose-500 text-white'
              : 'bg-white/90 text-slate-500 hover:bg-white hover:text-rose-500 dark:bg-slate-900/90 dark:text-slate-300'
              }`}
          >
            <Heart className={`h-4 w-4 ${fav ? 'fill-white' : ''}`} />
          </button>
        )}

        {/* Location Bottom Overlay */}
        <div className="absolute bottom-2.5 left-3 right-3 truncate text-xs font-medium text-white drop-shadow">
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3 w-3 text-rose-400 shrink-0" />
            <span className="truncate">{house.location}</span>
          </span>
        </div>
      </div>

      {/* Card Body */}
      <div className="flex flex-1 flex-col justify-between p-4 sm:p-5">
        <div>
          <h3 className="text-base font-bold text-slate-900 transition group-hover:text-emerald-600 dark:text-white dark:group-hover:text-emerald-400 line-clamp-1">
            {house.name}
          </h3>

          <p className="mt-1.5 text-xs text-slate-500 line-clamp-2 dark:text-slate-400 leading-relaxed">
            {house.description || 'Dự án nhà ở xã hội tiêu chuẩn, chính sách vay vốn ưu đãi và tiến độ thanh toán minh bạch.'}
          </p>

          {/* Metrics Pill Row */}
          <div className="mt-3.5 grid grid-cols-2 gap-2 text-center text-xs">
            <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-center gap-1.5">
              <Ruler className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <div className="text-left">
                <span className="text-[10px] text-slate-400 block font-medium">Diện tích</span>
                <span className="font-bold text-slate-700 dark:text-slate-200">{house.area}</span>
              </div>
            </div>
            <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              <div className="text-left">
                <span className="text-[10px] text-slate-400 block font-medium">Khả dụng</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{house.availableUnits} căn</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card Footer: Price & CTA grouped naturally */}
        <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              Giá tham chiếu
            </span>
            <span className="text-base font-black text-emerald-600 dark:text-emerald-400 truncate block">
              {house.price}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
            {actionButton ? (
              actionButton
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl border-slate-200 text-xs font-semibold px-2.5 h-8 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  onClick={goToDetail}
                >
                  Chi tiết
                </Button>
                <Button
                  size="sm"
                  className="rounded-xl bg-emerald-600 text-xs font-semibold px-3 h-8 text-white hover:bg-emerald-700 shadow-sm shadow-emerald-600/20"
                  onClick={goToApply}
                >
                  Nộp hồ sơ
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </article>
  )
})

