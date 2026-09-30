import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

interface SparklineProps {
  data?: number[]
  /** Đường stroke color, mặc định = primary */
  stroke?: string
  /** Màu fill ở đỉnh */
  fill?: string
  className?: string
  /** Hiển thị dot sáng ở điểm cuối + halo */
  showEndDot?: boolean
  /** Đường baseline mờ */
  showBaseline?: boolean
  /** Animation draw thời gian (ms) */
  drawMs?: number
}

export function Sparkline({
  data,
  stroke = 'rgb(0 91 172)',
  fill = 'rgb(0 91 172)',
  className,
  showEndDot = true,
  showBaseline = true,
  drawMs = 1400,
}: SparklineProps) {
  const series = data && data.length > 0 ? data : [0]
  const uid = useId()
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)
  const ref = useRef<SVGSVGElement | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 30)
    return () => clearTimeout(t)
  }, [])

  const layout = useMemo(() => {
    const w = 220
    const h = 64
    const max = Math.max(...series, 1)
    const min = Math.min(...series, 0)
    const range = Math.max(max - min, 1)
    const stepX = w / Math.max(series.length - 1, 1)
    const padTop = h * 0.15
    const padBottom = h * 0.2
    const innerH = h - padTop - padBottom
    const pts = series.map((v, i) => {
      const x = i * stepX
      const y = h - padBottom - ((v - min) / range) * innerH
      return [x, y] as const
    })
    // Đường line trơn (Catmull-Rom smoothed)
    let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`
    for (let i = 0; i < pts.length - 1; i++) {
      const [x1, y1] = pts[i]
      const [x2, y2] = pts[i + 1]
      const cx1 = x1 + (x2 - x1) / 2
      const cy1 = y1
      const cx2 = x1 + (x2 - x1) / 2
      const cy2 = y2
      d += ` C${cx1.toFixed(1)} ${cy1.toFixed(1)}, ${cx2.toFixed(1)} ${cy2.toFixed(1)}, ${x2.toFixed(1)} ${y2.toFixed(1)}`
    }
    const areaD = `${d} L${w} ${h} L0 ${h} Z`
    return { w, h, pts, d, areaD, innerTopY: padTop, innerBottomY: h - padBottom }
  }, [series])

  const { w, h, pts, d, areaD, innerTopY, innerBottomY } = layout
  const strokeGradientId = `spark-stroke-${uid}`
  const fillGradientId = `spark-fill-${uid}`
  const glowId = `spark-glow-${uid}`

  function onMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return
    const x = ((e.clientX - rect.left) / rect.width) * w
    let nearest = 0
    let minDist = Infinity
    pts.forEach(([px], i) => {
      const dist = Math.abs(px - x)
      if (dist < minDist) {
        minDist = dist
        nearest = i
      }
    })
    setHoverIdx(nearest)
  }

  const hoverPoint = hoverIdx !== null ? pts[hoverIdx] : null
  const hoverValue = hoverIdx !== null ? series[hoverIdx] : null

  if (!data || data.length === 0) return null

  return (
    <div className={cn('group/spark relative h-full w-full', className)}>
      <svg
        ref={ref}
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        onMouseMove={onMove}
        onMouseLeave={() => setHoverIdx(null)}
        className="h-full w-full"
      >
        <defs>
          <linearGradient id={strokeGradientId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={stroke} stopOpacity="0.6" />
            <stop offset="50%" stopColor={stroke} stopOpacity="1" />
            <stop offset="100%" stopColor={stroke} stopOpacity="0.85" />
          </linearGradient>
          <linearGradient id={fillGradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={fill} stopOpacity="0.42" />
            <stop offset="60%" stopColor={fill} stopOpacity="0.12" />
            <stop offset="100%" stopColor={fill} stopOpacity="0" />
          </linearGradient>
          <filter id={glowId} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Baseline gradient lines */}
        {showBaseline && (
          <g className="opacity-30">
            <line x1="0" y1={innerBottomY} x2={w} y2={innerBottomY} stroke={stroke} strokeWidth="0.5" strokeDasharray="2 3" />
            <line x1="0" y1={innerTopY} x2={w} y2={innerTopY} stroke={stroke} strokeWidth="0.5" strokeDasharray="2 3" />
          </g>
        )}

        {/* Area fill */}
        <path
          d={areaD}
          fill={`url(#${fillGradientId})`}
          className={cn('transition-opacity duration-500', hoverIdx !== null ? 'opacity-100' : 'opacity-90')}
        />

        {/* Glow under stroke */}
        <path
          d={d}
          fill="none"
          stroke={stroke}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.35"
          filter={`url(#${glowId})`}
        />

        {/* Animated stroke */}
        <path
          d={d}
          fill="none"
          stroke={`url(#${strokeGradientId})`}
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            strokeDasharray: 1000,
            strokeDashoffset: mounted ? 0 : 1000,
            transition: `stroke-dashoffset ${drawMs}ms cubic-bezier(0.65, 0, 0.35, 1)`,
          }}
        />

        {/* Hover crosshair */}
        {hoverPoint && (
          <g>
            <line
              x1={hoverPoint[0]}
              y1={innerTopY - 4}
              x2={hoverPoint[0]}
              y2={innerBottomY + 2}
              stroke={stroke}
              strokeWidth="0.75"
              strokeDasharray="2 2"
              opacity="0.6"
            />
            <circle cx={hoverPoint[0]} cy={hoverPoint[1]} r="6" fill={stroke} opacity="0.18" />
            <circle cx={hoverPoint[0]} cy={hoverPoint[1]} r="3" fill="#fff" stroke={stroke} strokeWidth="1.5" />
          </g>
        )}

        {/* End-point pulse dot */}
        {showEndDot && (
          <g>
            <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="8" fill={stroke} opacity="0.18">
              <animate attributeName="r" values="6;12;6" dur="2.4s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.35;0;0.35" dur="2.4s" repeatCount="indefinite" />
            </circle>
            <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="3" fill="#fff" stroke={stroke} strokeWidth="1.8" />
          </g>
        )}
      </svg>

      {/* Tooltip */}
      {hoverPoint && hoverValue !== null && (
        <div
          className="pointer-events-none absolute -top-2 z-10 -translate-x-1/2 rounded-md bg-slate-900/95 px-2 py-1 text-[10px] font-bold text-white shadow-lg ring-1 ring-white/10 backdrop-blur-md"
          style={{ left: `${(hoverPoint[0] / w) * 100}%`, transform: 'translate(-50%, -100%)' }}
        >
          <span className="text-cyan-300">●</span> {hoverValue}
        </div>
      )}
    </div>
  )
}
