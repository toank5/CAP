import { motion } from 'framer-motion'

export function SmartCityIllustration() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="relative aspect-[4/3] w-full max-w-xl overflow-hidden rounded-3xl border border-white/20 bg-gradient-to-br from-primary/20 via-accent/10 to-secondary shadow-2xl shadow-primary/20 dark:from-primary/30 dark:via-accent/20"
    >
      <svg viewBox="0 0 640 480" className="h-full w-full" aria-hidden>
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#EAF4FF" />
            <stop offset="100%" stopColor="#005BAC" stopOpacity="0.15" />
          </linearGradient>
          <linearGradient id="glow" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#00B4D8" />
            <stop offset="100%" stopColor="#005BAC" />
          </linearGradient>
        </defs>
        <rect width="640" height="480" fill="url(#sky)" />
        <ellipse cx="520" cy="80" rx="60" ry="60" fill="#FFD166" opacity="0.9" />
        {[0, 80, 160, 240, 320, 400].map((x, i) => (
          <g key={x}>
            <rect x={x + 20} y={180 - i * 8} width={48} height={120 + i * 12} rx="4" fill={`rgb(0 91 172 / ${0.35 + i * 0.08})`} />
            <rect x={x + 28} y={200 - i * 6} width="8" height="8" fill="#00B4D8" opacity="0.8" />
            <rect x={x + 40} y={220 - i * 5} width="8" height="8" fill="#22C55E" opacity="0.7" />
          </g>
        ))}
        <path d="M0 340 Q160 300 320 330 T640 310 V480 H0Z" fill="#22C55E" opacity="0.25" />
        <path d="M0 360 Q200 340 400 355 T640 345 V480 H0Z" fill="#005BAC" opacity="0.12" />
        <circle cx="120" cy="120" r="40" fill="none" stroke="url(#glow)" strokeWidth="2" opacity="0.6" />
        <circle cx="120" cy="120" r="8" fill="#00B4D8" />
        <line x1="120" y1="120" x2="200" y2="200" stroke="#00B4D8" strokeWidth="1.5" opacity="0.5" />
        <line x1="120" y1="120" x2="80" y2="240" stroke="#00B4D8" strokeWidth="1.5" opacity="0.5" />
        <text x="32" y="44" fill="#005BAC" fontSize="14" fontWeight="600" opacity="0.8">
          Smart Housing Network
        </text>
      </svg>
      <div className="absolute inset-x-4 bottom-4 flex gap-2">
        <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-primary shadow dark:bg-slate-900/90">
          48 dự án live
        </span>
        <span className="rounded-full bg-success/90 px-3 py-1 text-xs font-medium text-white shadow">
          99.2% uptime
        </span>
      </div>
    </motion.div>
  )
}
