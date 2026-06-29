import { motion } from 'framer-motion'

export function SmartCityIllustration() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="relative aspect-[4/3] w-full max-w-xl overflow-hidden rounded-3xl border border-white/20 bg-gradient-to-br from-blue-100 via-blue-50 to-emerald-50 shadow-2xl shadow-primary/20"
    >
      {/* Nền trời gradient */}
      <svg viewBox="0 0 640 480" className="h-full w-full" aria-hidden>
        <defs>
          <linearGradient id="sky-top" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1E88E5" />
            <stop offset="45%" stopColor="#64B5F6" />
            <stop offset="100%" stopColor="#BBDEFB" />
          </linearGradient>
          <linearGradient id="ground-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#43A047" />
            <stop offset="100%" stopColor="#2E7D32" />
          </linearGradient>
          <linearGradient id="road-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#546E7A" />
            <stop offset="100%" stopColor="#37474F" />
          </linearGradient>
          <linearGradient id="water-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4FC3F7" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#0288D1" stopOpacity="0.9" />
          </linearGradient>
          <radialGradient id="sun-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFEE58" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#FFEE58" stopOpacity="0" />
          </radialGradient>
          <filter id="soft-shadow">
            <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#003D7A" floodOpacity="0.2" />
          </filter>
        </defs>

        {/* Nền trời */}
        <rect width="640" height="480" fill="url(#sky-top)" />

        {/* Mặt trời với aura */}
        <ellipse cx="520" cy="70" rx="100" ry="100" fill="url(#sun-glow)" />
        <circle cx="520" cy="70" r="38" fill="#FFEE58" opacity="0.95" />
        <circle cx="520" cy="70" r="30" fill="#FFF9C4" />

        {/* Mây trắng */}
        {[
          { x: 60, y: 55, s: 1 },
          { x: 200, y: 35, s: 0.75 },
          { x: 360, y: 65, s: 0.9 },
          { x: 140, y: 80, s: 0.6 },
          { x: 450, y: 40, s: 0.7 },
        ].map(({ x, y, s }, i) => (
          <g key={i} transform={`translate(${x},${y}) scale(${s})`}>
            <ellipse cx="0" cy="0" rx="50" ry="22" fill="white" opacity="0.92" />
            <ellipse cx="-30" cy="4" rx="32" ry="18" fill="white" opacity="0.92" />
            <ellipse cx="30" cy="4" rx="32" ry="18" fill="white" opacity="0.92" />
            <ellipse cx="0" cy="10" rx="40" ry="16" fill="white" opacity="0.92" />
          </g>
        ))}

        {/* ===== KHU VỰC XANH PHÍA TRƯỚC ===== */}
        {/* Công viên trung tâm */}
        <ellipse cx="310" cy="365" rx="200" ry="70" fill="#388E3C" />
        <ellipse cx="310" cy="360" rx="180" ry="55" fill="#43A047" />

        {/* Hồ nước trong công viên */}
        <ellipse cx="310" cy="370" rx="65" ry="28" fill="url(#water-grad)" />
        <ellipse cx="310" cy="367" rx="55" ry="20" fill="#4FC3F7" opacity="0.4" />

        {/* ===== TÒA NHÀ PHÍA SAU (mờ) ===== */}
        {/* Tòa nhà chung cư cao tầng */}
        {[
          { x: 20, w: 50, h: 140 },
          { x: 75, w: 55, h: 170 },
          { x: 135, w: 45, h: 120 },
          { x: 470, w: 55, h: 160 },
          { x: 530, w: 50, h: 130 },
          { x: 585, w: 60, h: 155 },
        ].map(({ x, w, h }, i) => (
          <g key={i}>
            <rect x={x} y={320 - h} width={w} height={h + 10} rx="3" fill={`rgb(30 80 140 / ${0.5 + i * 0.04})`} />
            {/* Cửa sổ */}
            {[0, 1, 2, 3, 4].map(row =>
              [0, 1, 2].map(col => (
                <rect
                  key={`${row}-${col}`}
                  x={x + 5 + col * (w / 3.5)}
                  y={325 - h + 8 + row * (h / 6)}
                  width={w / 5}
                  height={h / 8}
                  rx="1"
                  fill="#BBDEFB"
                  opacity="0.55"
                />
              ))
            )}
          </g>
        ))}

        {/* ===== TÒA NHÀ PHÍA TRƯỚC (nổi bật) ===== */}

        {/* Tòa tháp trung tâm - cao nhất, điểm nhấn */}
        <g filter="url(#soft-shadow)">
          <rect x="248" y="160" width="70" height="210" rx="4" fill="#1565C0" />
          <rect x="253" y="160" width="60" height="210" rx="4" fill="#1976D2" />
          {/* Cửa sổ tòa tháp */}
          {[0,1,2,3,4,5].map(row =>
            [0,1,2,3].map(col => (
              <rect
                key={`t-${row}-${col}`}
                x={257 + col * 14}
                y={168 + row * 30}
                width="10"
                height="20"
                rx="2"
                fill="#E3F2FD"
                opacity={row % 2 === 0 ? 0.85 : 0.6}
              />
            ))
          )}
          {/* Đỉnh tháp */}
          <rect x="268" y="145" width="30" height="18" rx="2" fill="#0D47A1" />
          <rect x="273" y="130" width="20" height="18" rx="2" fill="#1565C0" />
          <line x1="283" y1="115" x2="283" y2="130" stroke="#FFD54F" strokeWidth="3" />
          <circle cx="283" cy="113" r="4" fill="#FFD54F" />
        </g>

        {/* Tòa nhà trái */}
        <g filter="url(#soft-shadow)">
          <rect x="148" y="215" width="90" height="155" rx="4" fill="#0277BD" />
          {[0,1,2,3,4].map(row =>
            [0,1,2,3].map(col => (
              <rect
                key={`l-${row}-${col}`}
                x={155 + col * 21}
                y={222 + row * 28}
                width="14"
                height="18"
                rx="2"
                fill="#B3E5FC"
                opacity={row % 2 === 0 ? 0.8 : 0.5}
              />
            ))
          )}
        </g>

        {/* Tòa nhà phải */}
        <g filter="url(#soft-shadow)">
          <rect x="390" y="200" width="85" height="170" rx="4" fill="#0288D1" />
          {[0,1,2,3,4].map(row =>
            [0,1,2,3].map(col => (
              <rect
                key={`r-${row}-${col}`}
                x={397 + col * 20}
                y={208 + row * 30}
                width="13"
                height="20"
                rx="2"
                fill="#B3E5FC"
                opacity={row % 2 !== 0 ? 0.8 : 0.45}
              />
            ))
          )}
        </g>

        {/* ===== CÔNG VIÊN VÀ CÂY XANH ===== */}

        {/* Cây to bên trái */}
        <rect x="62" y="345" width="8" height="45" rx="3" fill="#5D4037" />
        <circle cx="66" cy="335" r="28" fill="#2E7D32" />
        <circle cx="55" cy="342" r="18" fill="#388E3C" />
        <circle cx="78" cy="340" r="16" fill="#43A047" />
        <circle cx="66" cy="328" r="14" fill="#4CAF50" />

        {/* Cây nhỏ bên phải */}
        <rect x="562" y="352" width="6" height="35" rx="3" fill="#5D4037" />
        <circle cx="565" cy="344" r="22" fill="#388E3C" />
        <circle cx="555" cy="350" r="14" fill="#43A047" />
        <circle cx="575" cy="348" r="12" fill="#2E7D32" />

        {/* Cây ở công viên */}
        {[
          { x: 190, cy: 355 },
          { x: 430, cy: 352 },
          { x: 255, cy: 358 },
          { x: 365, cy: 356 },
        ].map(({ x, cy }, i) => (
          <g key={i}>
            <rect x={x} y={cy - 5} width="5" height="28" rx="2" fill="#5D4037" />
            <circle cx={x + 2} cy={cy - 14} r="14" fill="#388E3C" />
            <circle cx={x - 5} cy={cy - 8} r="9" fill="#43A047" />
            <circle cx={x + 9} cy={cy - 10} r="8" fill="#2E7D32" />
          </g>
        ))}

        {/* ===== ĐƯỜNG & XE ===== */}
        {/* Con đường chính */}
        <rect x="0" y="390" width="640" height="45" fill="url(#road-grad)" />
        {/* Vạch kẻ đường */}
        {[40, 120, 200, 280, 360, 440, 520, 600].map((x, i) => (
          <rect key={i} x={x} y="410" width="40" height="5" rx="2" fill="#ECEFF1" opacity="0.7" />
        ))}
        {/* Dải phân cách */}
        <rect x="0" y="397" width="640" height="4" fill="#FFEE58" opacity="0.5" />

        {/* Xe ô tô */}
        {[
          { x: 50, y: 404, c: '#E53935' },
          { x: 160, y: 408, c: '#1E88E5' },
          { x: 300, y: 405, c: '#FDD835' },
          { x: 430, y: 406, c: '#43A047' },
          { x: 540, y: 404, c: '#F4511E' },
        ].map(({ x, y, c }, i) => (
          <g key={i}>
            <rect x={x} y={y} width="38" height="18" rx="5" fill={c} />
            <rect x={x + 4} y={y - 4} width="30" height="10" rx="4" fill={c} />
            <rect x={x + 7} y={y - 2} width="24" height="8" rx="2" fill="#B3E5FC" opacity="0.8" />
            <circle cx={x + 9} cy={y + 20} r="5" fill="#37474F" />
            <circle cx={x + 29} cy={y + 20} r="5" fill="#37474F" />
            <circle cx={x + 9} cy={y + 20} r="2" fill="#90A4AE" />
            <circle cx={x + 29} cy={y + 20} r="2" fill="#90A4AE" />
          </g>
        ))}

        {/* ===== LỐP XE ĐI BỘ ===== */}
        {/* Người đi bộ */}
        {[
          { x: 185, y: 380 },
          { x: 335, y: 378 },
          { x: 475, y: 379 },
        ].map(({ x, y }, i) => (
          <g key={i}>
            <circle cx={x} cy={y - 10} r="4" fill="#FFCC80" />
            <line x1={x} y1={y - 6} x2={x} y2={y + 6} stroke="#1565C0" strokeWidth="2.5" strokeLinecap="round" />
            <line x1={x - 5} y1={y} x2={x + 5} y2={y + 4} stroke="#1565C0" strokeWidth="2" strokeLinecap="round" />
          </g>
        ))}

        {/* ===== TIÊU ĐỀ ===== */}
        <text x="22" y="30" fill="#0D47A1" fontSize="15" fontWeight="700" opacity="0.85" letterSpacing="0.5">
          Hạ tầng thông minh · Kết nối đô thị
        </text>
      </svg>

      {/* Badges overlay */}
      <div className="absolute inset-x-4 bottom-4 flex flex-wrap gap-2">
        <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-primary shadow backdrop-blur">
          48 dự án đang hoạt động
        </span>
        <span className="rounded-full bg-emerald-500/90 px-3 py-1 text-xs font-semibold text-white shadow backdrop-blur">
          99.2% uptime hệ thống
        </span>
        <span className="rounded-full bg-amber-400/90 px-3 py-1 text-xs font-semibold text-amber-900 shadow backdrop-blur">
          Hỗ trợ 24/7
        </span>
      </div>
    </motion.div>
  )
}
