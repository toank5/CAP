import { Heart, MapPin } from 'lucide-react'
import { navigate } from '@/hooks/useHashRoute'
import type { ProjectCard } from '@/lib/projects'

export function HouseCard({
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

  const handleFavorite: React.MouseEventHandler<HTMLButtonElement> = (e) => {
    e.stopPropagation()
    onToggleFavorite?.()
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={goToDetail}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          goToDetail()
        }
      }}
      className="soft-card overflow-hidden transition-shadow hover:shadow-md cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
    >
      {/* Ảnh */}
      <div className="relative h-36 overflow-hidden">
        <img src={house.imageUrl} alt={house.name} className="h-full w-full object-cover" loading="lazy" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/30 to-transparent" />
        {onToggleFavorite && (
          <button
            type="button"
            className={`absolute right-3 top-3 rounded-full p-2 shadow-sm backdrop-blur-sm transition-colors ${
              fav ? 'bg-blue-500 text-white' : 'bg-white/90 text-slate-400 hover:text-blue-500'
            }`}
            aria-label="Yêu thích"
            onClick={handleFavorite}
          >
            <Heart className={`h-4 w-4 ${fav ? 'fill-current' : ''}`} />
          </button>
        )}
      </div>

      {/* Nội dung */}
      <div className="p-4">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100">{house.name}</h3>
        <p className="mt-1 flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-blue-400" />
          {house.location}
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-600 ring-1 ring-blue-100 dark:bg-blue-950/50 dark:text-blue-300 dark:ring-blue-800">
            {house.area}
          </span>
          <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-600 ring-1 ring-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-800">
            {house.status}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
          <span className="font-bold text-blue-600 dark:text-blue-400">{house.price}</span>
          <span className="text-xs text-slate-400 dark:text-slate-500">{house.units}</span>
        </div>
        {actionButton && (
          <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800" onClick={(e) => e.stopPropagation()}>
            {actionButton}
          </div>
        )}
      </div>
    </div>
  )
}
