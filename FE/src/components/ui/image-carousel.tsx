import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ImageItem {
  id?: string
  imageUrl: string
}

interface ImageCarouselProps {
  images: ImageItem[]
  className?: string
}

export function ImageCarousel({ images, className }: ImageCarouselProps) {
  const [index, setIndex] = useState(0)
  const total = images.length

  if (!images || total === 0) return null

  const prev = () => setIndex((i) => (i - 1 + total) % total)
  const next = () => setIndex((i) => (i + 1) % total)

  return (
    <div className={cn('relative', className)}>
      {/* Main image */}
      <div className="relative overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800" style={{ maxHeight: 280 }}>
        <AnimatePresence mode="wait">
          <motion.img
            key={images[index].id ?? index}
            src={images[index].imageUrl}
            alt=""
            loading="lazy"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="w-full object-cover"
            style={{ maxHeight: 280 }}
          />
        </AnimatePresence>

        {/* Prev / Next arrows */}
        {total > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-slate-700 shadow backdrop-blur-sm transition hover:bg-white dark:bg-slate-800/80 dark:text-slate-200"
              aria-label="Ảnh trước"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={next}
              className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-slate-700 shadow backdrop-blur-sm transition hover:bg-white dark:bg-slate-800/80 dark:text-slate-200"
              aria-label="Ảnh tiếp"
            >
              <ChevronRight className="h-4 w-4" />
            </button>

            {/* Counter */}
            <div className="absolute bottom-2 right-2 rounded-lg bg-black/50 px-2 py-0.5 text-xs font-bold text-white backdrop-blur-sm">
              {index + 1} / {total}
            </div>
          </>
        )}
      </div>

      {/* Dot indicators */}
      {total > 1 && (
        <div className="mt-2 flex justify-center gap-1.5">
          {images.map((img, i) => (
            <button
              key={img.id ?? i}
              type="button"
              onClick={() => setIndex(i)}
              className={cn(
                'h-1.5 rounded-full transition-all',
                i === index ? 'w-5 bg-blue-600 dark:bg-blue-400' : 'w-1.5 bg-slate-300 dark:bg-slate-600',
              )}
              aria-label={`Ảnh ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
