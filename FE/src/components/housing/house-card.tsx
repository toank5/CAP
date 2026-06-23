import { useState } from 'react'
import { Heart, MapPin } from 'lucide-react'
import { startVnPayPayment } from '@/api/payment'
import { Button } from '@/components/ui/button'
import { navigate } from '@/hooks/useHashRoute'
import { isLoggedIn } from '@/router'
import type { ProjectCard } from '@/lib/projects'
import { formatError } from '@/lib/format-error'

export function HouseCard({
  house,
  fav,
  onToggleFavorite,
}: {
  house: ProjectCard
  fav?: boolean
  onToggleFavorite?: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [paying, setPaying] = useState(false)

  return (
    <div className={`glass-card overflow-hidden transition ${expanded ? 'ring-2 ring-primary/20' : ''}`}>
      <div className="relative h-36 overflow-hidden">
        <img src={house.imageUrl} alt={house.name} className="h-full w-full object-cover" loading="lazy" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        {onToggleFavorite && (
          <button
            type="button"
            className={`absolute right-3 top-3 rounded-full p-2 ${fav ? 'bg-red-500 text-white' : 'bg-white/90 text-slate-400'}`}
            aria-label="Yêu thích"
            onClick={onToggleFavorite}
          >
            <Heart className={`h-4 w-4 ${fav ? 'fill-current' : ''}`} />
          </button>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-semibold">{house.name}</h3>
        <p className="mt-1 flex items-center gap-1 text-sm text-slate-500"><MapPin className="h-3.5 w-3.5" />{house.location}</p>
        <div className="mt-2 flex flex-wrap gap-2 text-sm">
          <span className="font-bold text-primary">{house.price}</span>
          <span className="text-slate-500">{house.units}</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setExpanded((v) => !v)}>{expanded ? 'Thu gọn' : 'Xem chi tiết'}</Button>
          <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(house.address)}`} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center rounded-xl border px-3 text-sm font-medium hover:bg-secondary">Vị trí</a>
          <Button variant="accent" size="sm" disabled={paying} onClick={async () => {
            if (!isLoggedIn()) { navigate('login'); return }
            setPaying(true)
            try {
              const url = await startVnPayPayment(`Thanh toan dat coc - ${house.name}`, house.paymentAmount)
              window.location.href = url
            } catch (err) {
              alert(formatError(err))
              setPaying(false)
            }
          }}>{paying ? 'Đang tạo...' : 'Thanh toán'}</Button>
        </div>
        {expanded && (
          <div className="mt-4 space-y-1 border-t pt-4 text-sm">
            <p><span className="text-slate-500">Loại:</span> {house.type}</p>
            <p><span className="text-slate-500">Diện tích:</span> {house.area}</p>
            <p><span className="text-slate-500">Trạng thái:</span> {house.status}</p>
            <p className="text-slate-600">{house.description}</p>
          </div>
        )}
      </div>
    </div>
  )
}
