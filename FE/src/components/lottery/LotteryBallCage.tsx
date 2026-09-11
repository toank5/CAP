import React, { useEffect, useState, useMemo, useRef } from 'react'
import { Sparkles, Users } from 'lucide-react'
import { isPriorityWinner, type LiveWinnerEntry, type LotteryEligibleEntry } from '@/api/lottery'
import { formatPriorityGroup } from '@/lib/constants'

interface Props {
  isSpinning: boolean
  latestWinner?: LiveWinnerEntry | null
  eligibleList?: LotteryEligibleEntry[]
  recentWinners?: LiveWinnerEntry[]
  onDrawNext?: () => void
  busy?: boolean
  isDev?: boolean
  sessionStatus?: string
  remaining?: number
  total?: number
}

// Bảng màu 3D siêu thực cho từng quả bóng xổ số (Gradient bóng bẩy đa chiều)
const REALISTIC_BALL_PALETTES = [
  {
    bg: 'radial-gradient(circle at 35% 30%, #ff8a80 0%, #d50000 55%, #8b0000 100%)',
    shadow: '0 6px 14px rgba(213,0,0,0.45)',
    border: '#ff5252',
    name: 'Đỏ Ruby',
  },
  {
    bg: 'radial-gradient(circle at 35% 30%, #ffe57f 0%, #ffab00 55%, #b27b00 100%)',
    shadow: '0 6px 14px rgba(255,171,0,0.45)',
    border: '#ffd740',
    name: 'Vàng Hoàng Gia',
  },
  {
    bg: 'radial-gradient(circle at 35% 30%, #b9f6ca 0%, #00c853 55%, #00600f 100%)',
    shadow: '0 6px 14px rgba(0,200,83,0.45)',
    border: '#69f0ae',
    name: 'Xanh Ngọc Lục Bảo',
  },
  {
    bg: 'radial-gradient(circle at 35% 30%, #80d8ff 0%, #0091ea 55%, #004c8c 100%)',
    shadow: '0 6px 14px rgba(0,145,234,0.45)',
    border: '#40c4ff',
    name: 'Xanh Sapphire',
  },
  {
    bg: 'radial-gradient(circle at 35% 30%, #ea80fc 0%, #aa00ff 55%, #4a0072 100%)',
    shadow: '0 6px 14px rgba(170,0,255,0.45)',
    border: '#e040fb',
    name: 'Tím Thạch Anh',
  },
  {
    bg: 'radial-gradient(circle at 35% 30%, #ffd180 0%, #ff6d00 55%, #b34500 100%)',
    shadow: '0 6px 14px rgba(255,109,0,0.45)',
    border: '#ffab40',
    name: 'Cam Hoàng Hôn',
  },
  {
    bg: 'radial-gradient(circle at 35% 30%, #a7ffeb 0%, #00bfa5 55%, #004d40 100%)',
    shadow: '0 6px 14px rgba(0,191,165,0.45)',
    border: '#64ffda',
    name: 'Xanh Lam Ngọc',
  },
  {
    bg: 'radial-gradient(circle at 35% 30%, #ff80ab 0%, #c51162 55%, #880e4f 100%)',
    shadow: '0 6px 14px rgba(197,17,98,0.45)',
    border: '#ff4081',
    name: 'Hồng Ánh Kim',
  },
]

interface BallState {
  x: number
  y: number
  vx: number
  vy: number
  rot: number
}

export const LotteryBallCage: React.FC<Props> = ({
  isSpinning,
  latestWinner,
  eligibleList = [],
  recentWinners = [],
  onDrawNext,
  busy,
  isDev = false,
  sessionStatus = '',
  remaining = 0,
  total = 0,
}) => {
  const [cageRotation, setCageRotation] = useState(0)
  const [highlightBallIdx, setHighlightBallIdx] = useState<number | null>(null)

  // 1. Chuẩn hóa danh sách ứng viên (1-1 với bóng thực tế)
  const candidates = useMemo(() => {
    if (eligibleList && eligibleList.length > 0) {
      return eligibleList.map((e, idx) => {
        const id = e.applicationId || e.applicantId || `cand-${idx}`
        const code = e.applicationCode || (id.length > 8 && !id.startsWith('D1000001') ? id.slice(0, 8).toUpperCase() : `HS-${String(idx + 1).padStart(2, '0')}`)
        return {
          id,
          code,
          name: e.applicantName,
          citizenId: e.citizenId,
          priority: formatPriorityGroup(e.priorityGroup),
          isPriority: isPriorityWinner(e),
          numStr: String(idx + 1).padStart(2, '0'),
        }
      })
    }

    if (recentWinners && recentWinners.length > 0) {
      return recentWinners.map((w, idx) => ({
        id: w.applicationId,
        code: w.applicationCode || w.applicationId.slice(0, 8).toUpperCase(),
        name: w.applicantName,
        citizenId: w.maskedCitizenId,
        priority: formatPriorityGroup(w.priorityGroup || (w.result === 'PRIORITY_WON' ? 'MERIT_PERSON' : 'LOW_INCOME_URBAN')),
        isPriority: isPriorityWinner(w),
        numStr: String(idx + 1).padStart(2, '0'),
      }))
    }

    if (latestWinner) {
      return [
        {
          id: latestWinner.applicationId,
          code: latestWinner.applicationCode || latestWinner.applicationId.slice(0, 8).toUpperCase(),
          name: latestWinner.applicantName,
          citizenId: latestWinner.maskedCitizenId,
          priority: formatPriorityGroup(latestWinner.priorityGroup),
          isPriority: isPriorityWinner(latestWinner),
          numStr: '01',
        },
      ]
    }

    return []
  }, [eligibleList, recentWinners, latestWinner])

  const totalBalls = candidates.length

  const CAGE_RADIUS = 84
  const BALL_SIZE = 15
  const LIMIT_R = CAGE_RADIUS - BALL_SIZE

  const restingPositions = useMemo(() => {
    if (totalBalls === 0) return []
    const pos: { x: number; y: number }[] = []

    if (totalBalls === 1) {
      pos.push({ x: 0, y: LIMIT_R - 3 })
    } else if (totalBalls === 2) {
      pos.push({ x: -17, y: LIMIT_R - 5 }, { x: 17, y: LIMIT_R - 5 })
    } else if (totalBalls === 3) {
      pos.push({ x: -30, y: LIMIT_R - 9 }, { x: 0, y: LIMIT_R - 3 }, { x: 30, y: LIMIT_R - 9 })
    } else if (totalBalls === 4) {
      pos.push(
        { x: -38, y: LIMIT_R - 14 },
        { x: -13, y: LIMIT_R - 4 },
        { x: 13, y: LIMIT_R - 4 },
        { x: 38, y: LIMIT_R - 14 },
      )
    } else {
      for (let i = 0; i < totalBalls; i++) {
        if (i < 4) {
          const x = (i - 1.5) * 24
          const y = Math.sqrt(Math.max(0, LIMIT_R * LIMIT_R - x * x)) - 3
          pos.push({ x, y })
        } else if (i < 7) {
          const x = (i - 5) * 22
          const y = 28 + (i % 2) * 4
          pos.push({ x, y })
        } else {
          const x = (i - 8) * 20
          const y = 8 + (i % 2) * 4
          pos.push({ x, y })
        }
      }
    }
    return pos
  }, [totalBalls, LIMIT_R])

  const [balls, setBalls] = useState<BallState[]>([])
  const ballsRef = useRef<BallState[]>([])

  useEffect(() => {
    const initial: BallState[] = restingPositions.map((p) => ({
      x: p.x,
      y: p.y,
      vx: 0,
      vy: 0,
      rot: 0,
    }))
    ballsRef.current = initial
    setBalls(initial)
  }, [restingPositions])

  useEffect(() => {
    let animId: number
    let currentCageRot = 0

    const updatePhysics = () => {
      if (isSpinning) {
        currentCageRot = (currentCageRot + 15) % 360
        setCageRotation(currentCageRot)

        const updated = ballsRef.current.map((b) => {
          let { x, y, vx, vy, rot } = b
          const turbX = (Math.random() - 0.5) * 18 - vy * 0.1
          const turbY = (Math.random() - 0.5) * 18 + vx * 0.1 - 1.6

          vx += turbX
          vy += turbY
          x += vx
          y += vy
          rot += (vx * 2.2 + 6)

          const dist = Math.sqrt(x * x + y * y)
          if (dist > LIMIT_R) {
            const nx = x / dist
            const ny = y / dist
            x = nx * LIMIT_R
            y = ny * LIMIT_R
            const dot = vx * nx + vy * ny
            vx = (vx - 2 * dot * nx) * 0.92 + (Math.random() - 0.5) * 6
            vy = (vy - 2 * dot * ny) * 0.92 + (Math.random() - 0.5) * 6
          }

          const speed = Math.sqrt(vx * vx + vy * vy)
          if (speed > 30) {
            vx = (vx / speed) * 30
            vy = (vy / speed) * 30
          }

          return { x, y, vx, vy, rot }
        })

        ballsRef.current = updated
        setBalls(updated)
      } else {
        if (currentCageRot !== 0) {
          currentCageRot = 0
          setCageRotation(0)
        }

        let needsUpdate = false
        const settled = ballsRef.current.map((b, idx) => {
          const target = restingPositions[idx] || { x: 0, y: LIMIT_R - 4 }
          const dx = target.x - b.x
          const dy = target.y - b.y

          if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
            needsUpdate = true
            return { x: b.x + dx * 0.25, y: b.y + dy * 0.25, vx: 0, vy: 0, rot: 0 }
          }
          return { x: target.x, y: target.y, vx: 0, vy: 0, rot: 0 }
        })

        if (needsUpdate) {
          ballsRef.current = settled
          setBalls(settled)
        }
      }
      animId = requestAnimationFrame(updatePhysics)
    }

    animId = requestAnimationFrame(updatePhysics)
    return () => cancelAnimationFrame(animId)
  }, [isSpinning, restingPositions, LIMIT_R])

  const isLive = sessionStatus === 'Live'
  const isFinished = sessionStatus === 'Finished' || sessionStatus === 'Published'
  const isOutOfUnits = remaining === 0 && total > 0
  const canDraw = !!isDev && isLive && !isOutOfUnits && !isFinished

  return (
    <div className="relative overflow-hidden rounded-3xl border border-amber-200/90 bg-white p-5 sm:p-6 shadow-lg shadow-amber-900/5">
      {/* Tiêu đề & Trạng thái */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 text-white font-black shadow-md shadow-amber-500/25">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">
              Lồng Cầu Bốc Thăm
            </h3>
            <p className="text-[11px] text-slate-500">
              Quay số ngẫu nhiên minh bạch theo khoản 2 Điều 38 Nghị định số 100 năm 2024 của Chính phủ
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${isSpinning
              ? 'bg-rose-100 text-rose-700 border border-rose-200'
              : canDraw
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                : 'bg-slate-100 text-slate-600 border border-slate-200'
              }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${isSpinning ? 'bg-rose-600 animate-ping' : canDraw ? 'bg-emerald-600' : 'bg-slate-400'
                }`}
            />
            {isSpinning ? '⚡ Đang đảo bóng...' : canDraw ? 'Sẵn sàng' : 'Chưa mở'}
          </span>
        </div>
      </div>

      {/* KHU VỰC LỒNG CẦU QUAY 3D (SÂN KHẤU CHỦ ĐỀ SỔ SỐ NHÀ Ở - TONE XANH NGỌC SANG TRỌNG) */}
      <div className="mt-4 relative overflow-hidden rounded-3xl bg-gradient-to-b from-emerald-700 via-teal-850 to-teal-950 border-2 border-amber-400/90 p-5 sm:p-7 shadow-2xl flex flex-col items-center justify-center min-h-[440px]">
        {/* PHÔNG NỀN VECTOR CHỦ ĐỀ NHÀ Ở & BỐC THĂM XỔ SỐ (SKYLINE CHUNG CƯ & ÁNH ĐÈN SÂN KHẤU) */}
        <svg
          className="absolute inset-0 h-full w-full pointer-events-none select-none z-0"
          preserveAspectRatio="none"
          viewBox="0 0 800 450"
        >
          <defs>
            {/* Gradient Bầu Trời Sân Khấu Xanh Ngọc */}
            <linearGradient id="stageSky" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#047857" />
              <stop offset="35%" stopColor="#065f46" />
              <stop offset="70%" stopColor="#0f766e" />
              <stop offset="100%" stopColor="#042f2e" />
            </linearGradient>

            {/* Gradient Ánh Đèn Spotlight Hai Góc */}
            <linearGradient id="spotlightLeft" x1="0%" y1="0%" x2="60%" y2="70%">
              <stop offset="0%" stopColor="#a7f3d0" stopOpacity="0.45" />
              <stop offset="45%" stopColor="#34d399" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#047857" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="spotlightRight" x1="100%" y1="0%" x2="40%" y2="70%">
              <stop offset="0%" stopColor="#a7f3d0" stopOpacity="0.45" />
              <stop offset="45%" stopColor="#34d399" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#047857" stopOpacity="0" />
            </linearGradient>

            {/* Gradient Các Tòa Nhà Chung Cư Lớp Xa */}
            <linearGradient id="bgBuildingFar" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#059669" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#022c22" stopOpacity="0.75" />
            </linearGradient>

            {/* Gradient Các Tòa Nhà Chung Cư Lớp Gần */}
            <linearGradient id="bgBuildingNear" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#022c22" stopOpacity="0.9" />
            </linearGradient>

            {/* Gradient Sàn Bục Vinh Danh */}
            <linearGradient id="stageFloorGlow" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#34d399" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#059669" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#022c22" stopOpacity="0" />
            </linearGradient>

            <linearGradient id="podiumRim" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0" />
              <stop offset="25%" stopColor="#f59e0b" stopOpacity="0.5" />
              <stop offset="50%" stopColor="#fef08a" stopOpacity="0.95" />
              <stop offset="75%" stopColor="#f59e0b" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* 1. Nền Sân Khấu Chính */}
          <rect width="800" height="450" fill="url(#stageSky)" />

          {/* 2. Ánh Sáng Trung Tâm Tỏa Ra */}
          <circle cx="400" cy="180" r="220" fill="#34d399" opacity="0.15" filter="blur(25px)" />
          <circle cx="400" cy="140" r="140" fill="#a7f3d0" opacity="0.2" filter="blur(15px)" />

          {/* 3. Dãy Tòa Nhà Chung Cư Cao Tầng Lớp Xa (Background Skyline) */}
          <g fill="url(#bgBuildingFar)">
            {/* Cụm chung cư bên trái */}
            <rect x="25" y="110" width="45" height="240" rx="3" />
            <rect x="75" y="70" width="55" height="280" rx="4" />
            <polygon points="75,70 102,40 130,70" fill="#047857" opacity="0.5" />
            <rect x="135" y="130" width="50" height="220" rx="3" />
            <rect x="190" y="160" width="40" height="190" rx="3" />

            {/* Cụm chung cư bên phải */}
            <rect x="570" y="150" width="45" height="200" rx="3" />
            <rect x="620" y="90" width="52" height="260" rx="3" />
            <polygon points="620,90 646,60 672,90" fill="#047857" opacity="0.5" />
            <rect x="678" y="60" width="58" height="290" rx="4" />
            <line x1="707" y1="60" x2="707" y2="30" stroke="#fef08a" strokeWidth="2" opacity="0.6" />
            <circle cx="707" cy="28" r="3" fill="#fef08a" opacity="0.8" />
            <rect x="742" y="125" width="42" height="225" rx="3" />
          </g>

          {/* 4. Dãy Tòa Nhà Chung Cư Hiện Đại Lớp Gần (Fore Skyline với Cửa Sổ Ấm Cúng) */}
          <g fill="url(#bgBuildingNear)">
            {/* Tháp A bên trái */}
            <rect x="50" y="150" width="50" height="200" rx="4" />
            {/* Lưới ô cửa sổ tháp A */}
            <g fill="#fde047" opacity="0.6">
              <rect x="58" y="165" width="6" height="5" rx="1" />
              <rect x="70" y="165" width="6" height="5" rx="1" />
              <rect x="82" y="165" width="6" height="5" rx="1" />
              <rect x="58" y="180" width="6" height="5" rx="1" />
              <rect x="82" y="180" width="6" height="5" rx="1" />
              <rect x="70" y="195" width="6" height="5" rx="1" />
              <rect x="58" y="210" width="6" height="5" rx="1" />
              <rect x="70" y="210" width="6" height="5" rx="1" />
              <rect x="82" y="210" width="6" height="5" rx="1" />
            </g>

            {/* Tháp B bên trái (Kiến trúc vát hiện đại) */}
            <polygon points="105,180 145,140 145,350 105,350" />
            <g fill="#6ee7b7" opacity="0.5">
              <rect x="115" y="190" width="8" height="6" rx="1" />
              <rect x="128" y="190" width="8" height="6" rx="1" />
              <rect x="115" y="210" width="8" height="6" rx="1" />
              <rect x="128" y="210" width="8" height="6" rx="1" />
            </g>

            {/* Tháp C bên phải (Chung cư sinh thái Eco-Tower) */}
            <polygon points="650,140 690,180 690,350 650,350" />
            <g fill="#fde047" opacity="0.6">
              <rect x="658" y="190" width="8" height="6" rx="1" />
              <rect x="672" y="190" width="8" height="6" rx="1" />
              <rect x="658" y="210" width="8" height="6" rx="1" />
              <rect x="672" y="210" width="8" height="6" rx="1" />
            </g>

            {/* Tháp D bên phải */}
            <rect x="698" y="130" width="48" height="220" rx="4" />
            <g fill="#6ee7b7" opacity="0.55">
              <rect x="706" y="145" width="6" height="5" rx="1" />
              <rect x="718" y="145" width="6" height="5" rx="1" />
              <rect x="730" y="145" width="6" height="5" rx="1" />
              <rect x="706" y="160" width="6" height="5" rx="1" />
              <rect x="730" y="160" width="6" height="5" rx="1" />
              <rect x="718" y="175" width="6" height="5" rx="1" />
              <rect x="706" y="190" width="6" height="5" rx="1" />
              <rect x="718" y="190" width="6" height="5" rx="1" />
              <rect x="730" y="190" width="6" height="5" rx="1" />
            </g>
          </g>

          {/* 5. Cần Cẩu & Vòm Mái Biểu Trưng Xây Dựng & An Cư */}
          <g stroke="#34d399" strokeWidth="1.2" opacity="0.4" fill="none">
            {/* Cần cẩu tháp bên trái */}
            <line x1="175" y1="110" x2="175" y2="70" />
            <line x1="150" y1="70" x2="205" y2="70" />
            <line x1="175" y1="60" x2="175" y2="70" />
            <line x1="175" y1="60" x2="200" y2="70" />
            <line x1="175" y1="60" x2="155" y2="70" />
          </g>

          {/* 6. Chùm Đèn Spotlight Chiếu Vào Lồng Cầu Trung Tâm */}
          <polygon points="0,0 120,0 520,330 320,330" fill="url(#spotlightLeft)" />
          <polygon points="800,0 680,0 480,330 280,330" fill="url(#spotlightRight)" />

          {/* 7. Các Ngôi Sao Vàng May Mắn & Hạt Lấp Lánh (Lucky Stars & Confetti Sparkles) */}
          <g fill="#fde047">
            {/* Ngôi sao 4 cánh lớn */}
            <path d="M 230 75 Q 230 85 240 85 Q 230 85 230 95 Q 230 85 220 85 Q 230 85 230 75 Z" opacity="0.85" />
            <path d="M 570 80 Q 570 90 580 90 Q 570 90 570 100 Q 570 90 560 90 Q 570 90 570 80 Z" opacity="0.85" />
            <path d="M 330 50 Q 330 57 337 57 Q 330 57 330 64 Q 330 57 323 57 Q 330 57 330 50 Z" opacity="0.75" />
            <path d="M 470 55 Q 470 62 477 62 Q 470 62 470 69 Q 470 62 463 62 Q 470 62 470 55 Z" opacity="0.75" />

            {/* Các hạt sao nhỏ lấp lánh */}
            <circle cx="160" cy="65" r="2.2" opacity="0.8" />
            <circle cx="280" cy="90" r="1.8" opacity="0.7" />
            <circle cx="390" cy="40" r="2.5" opacity="0.9" />
            <circle cx="415" cy="45" r="1.8" opacity="0.75" />
            <circle cx="520" cy="70" r="2" opacity="0.8" />
            <circle cx="630" cy="55" r="2.2" opacity="0.8" />
          </g>

          {/* 8. Sàn Bục Vinh Danh Bốc Thăm (Stage Podium Arc & Rim) */}
          <ellipse cx="400" cy="350" rx="360" ry="110" fill="url(#stageFloorGlow)" />
          <path
            d="M 60 380 C 180 340 620 340 740 380"
            fill="none"
            stroke="url(#podiumRim)"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <ellipse cx="400" cy="340" rx="220" ry="25" fill="#fef08a" opacity="0.12" filter="blur(8px)" />
        </svg>

        {/* 1. LỒNG CẦU QUAY KIM LOẠI & PHA LÊ 3D TRUNG TÂM */}
        <div className="relative flex h-72 w-72 items-center justify-center sm:h-80 sm:w-80 select-none z-10">
          <svg
            viewBox="0 0 340 310"
            className="absolute inset-0 h-full w-full pointer-events-none z-10 overflow-visible"
          >
            <defs>
              {/* Gradient Vàng Kim Loại Hoàng Kim Đậm Nét */}
              <linearGradient id="goldLuster" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#78350f" />
                <stop offset="12%" stopColor="#b45309" />
                <stop offset="28%" stopColor="#f59e0b" />
                <stop offset="45%" stopColor="#fef08a" />
                <stop offset="55%" stopColor="#ffffff" />
                <stop offset="70%" stopColor="#f59e0b" />
                <stop offset="88%" stopColor="#b45309" />
                <stop offset="100%" stopColor="#451a03" />
              </linearGradient>

              {/* Gradient Trụ Cong Vàng */}
              <linearGradient id="goldCurve" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#fef08a" />
                <stop offset="25%" stopColor="#f59e0b" />
                <stop offset="65%" stopColor="#b45309" />
                <stop offset="100%" stopColor="#451a03" />
              </linearGradient>

              {/* Gradient Nan Lồng Cầu */}
              <linearGradient id="goldRibs" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fef08a" />
                <stop offset="35%" stopColor="#f59e0b" />
                <stop offset="75%" stopColor="#d97706" />
                <stop offset="100%" stopColor="#78350f" />
              </linearGradient>

              <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="#78350f" floodOpacity="0.35" />
              </filter>
            </defs>

            {/* Chân đệm cao su bo tròn */}
            <rect x="85" y="278" width="22" height="6" rx="3" fill="#1e293b" />
            <rect x="233" y="278" width="22" height="6" rx="3" fill="#1e293b" />

            {/* Bệ đế cong vòm elip mạ vàng */}
            <path
              d="M 65 276 C 65 264 90 256 170 256 C 250 256 275 264 275 276 C 275 282 250 286 170 286 C 90 286 65 282 65 276 Z"
              fill="url(#goldLuster)"
              filter="url(#softShadow)"
              stroke="#b45309"
              strokeWidth="1.2"
            />
            {/* Viền sáng bóng trên đỉnh bệ đế */}
            <path
              d="M 85 270 C 110 262 140 258 170 258 C 200 258 230 262 255 270"
              stroke="#ffffff"
              strokeWidth="1.8"
              fill="none"
              opacity="0.85"
            />

            {/* Trụ đỡ cong hình cánh cung (Bên trái) */}
            <path
              d="M 120 258 C 105 220 78 185 78 150 C 78 140 85 136 92 136 C 98 136 102 144 102 152 C 102 180 126 215 138 258 Z"
              fill="url(#goldLuster)"
              filter="url(#softShadow)"
              stroke="#92400e"
              strokeWidth="1"
            />

            {/* Trụ đỡ cong hình cánh cung (Bên phải) */}
            <path
              d="M 220 258 C 235 220 262 185 262 150 C 262 140 255 136 248 136 C 242 136 238 144 238 152 C 238 180 214 215 202 258 Z"
              fill="url(#goldLuster)"
              filter="url(#softShadow)"
              stroke="#92400e"
              strokeWidth="1"
            />

            {/* Trục xoay kim loại xuyên tâm */}
            <rect
              x="72"
              y="144"
              width="196"
              height="10"
              rx="5"
              fill="url(#goldCurve)"
              stroke="#78350f"
              strokeWidth="1"
            />

            {/* Ổ trục bạc đạn kim loại 2 bên */}
            <circle cx="82" cy="149" r="12.5" fill="url(#goldLuster)" stroke="#fef08a" strokeWidth="1.5" filter="url(#softShadow)" />
            <circle cx="82" cy="149" r="5" fill="#451a03" />
            <circle cx="82" cy="149" r="2" fill="#ffffff" />

            <circle cx="258" cy="149" r="12.5" fill="url(#goldLuster)" stroke="#fef08a" strokeWidth="1.5" filter="url(#softShadow)" />
            <circle cx="258" cy="149" r="5" fill="#451a03" />
            <circle cx="258" cy="149" r="2" fill="#ffffff" />

            {/* Cần quay cơ khí bên phải */}
            <path
              d="M 264 149 L 286 149 L 286 182"
              stroke="url(#goldLuster)"
              strokeWidth="4.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <circle cx="286" cy="182" r="5.5" fill="url(#goldLuster)" stroke="#78350f" strokeWidth="1" />
          </svg>

          {/* 2. LỒNG CẦU QUAY ĐA CHIỀU (Rotating Wireframe Cage) */}
          <div
            className="absolute z-15 flex items-center justify-center pointer-events-none"
            style={{
              width: `${CAGE_RADIUS * 2 + 10}px`,
              height: `${CAGE_RADIUS * 2 + 10}px`,
              transform: `rotate(${cageRotation}deg)`,
              transition: isSpinning ? 'none' : 'transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)',
            }}
          >
            <svg viewBox="0 0 200 200" className="h-full w-full overflow-visible">
              {/* Vành kinh tuyến chính viền vàng kim loại sắc nét */}
              <circle cx="100" cy="100" r="92" fill="none" stroke="url(#goldRibs)" strokeWidth="3.5" />
              <circle cx="100" cy="100" r="92" fill="none" stroke="#ffffff" strokeWidth="1" strokeDasharray="6 5" opacity="0.8" />

              {/* Các nan kim loại dọc & ngang thanh thoát */}
              <ellipse cx="100" cy="100" rx="46" ry="92" fill="none" stroke="url(#goldRibs)" strokeWidth="2" opacity="0.85" />
              <ellipse cx="100" cy="100" rx="92" ry="46" fill="none" stroke="url(#goldRibs)" strokeWidth="2" opacity="0.85" />
              <line x1="100" y1="8" x2="100" y2="192" stroke="url(#goldRibs)" strokeWidth="2.2" />
              <line x1="8" y1="100" x2="192" y2="100" stroke="url(#goldRibs)" strokeWidth="2.2" />

              {/* 4 cánh gạt đảo bóng bên trong */}
              <rect x="98" y="32" width="4.5" height="32" rx="2" fill="#f59e0b" opacity="0.8" />
              <rect x="98" y="136" width="4.5" height="32" rx="2" fill="#f59e0b" opacity="0.8" />
              <rect x="32" y="98" width="32" height="4.5" rx="2" fill="#f59e0b" opacity="0.8" />
              <rect x="136" y="98" width="32" height="4.5" rx="2" fill="#f59e0b" opacity="0.8" />

              {/* Cửa nắp khóa mở lồng cầu */}
              <rect x="88" y="5" width="24" height="6.5" rx="2" fill="url(#goldLuster)" stroke="#78350f" strokeWidth="0.8" />
              <circle cx="100" cy="8" r="2" fill="#ffffff" />
            </svg>
          </div>

          {/* 3. CÁC QUẢ BÓNG XỔ SỐ 3D ĐỘNG */}
          <div className="absolute z-20 flex items-center justify-center pointer-events-auto">
            {candidates.map((c, idx) => {
              const palette = REALISTIC_BALL_PALETTES[idx % REALISTIC_BALL_PALETTES.length]
              const pos = balls[idx] || restingPositions[idx] || { x: 0, y: 0, rot: 0 }
              const isHovered = highlightBallIdx === idx

              return (
                <div
                  key={c.id || idx}
                  onMouseEnter={() => setHighlightBallIdx(idx)}
                  onMouseLeave={() => setHighlightBallIdx(null)}
                  className="absolute flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full cursor-pointer transition-transform duration-75"
                  style={{
                    background: palette.bg,
                    boxShadow: `${palette.shadow}, inset 0 2.5px 5px rgba(255,255,255,0.9), inset 0 -3.5px 7px rgba(0,0,0,0.5)`,
                    border: `1.8px solid ${palette.border}`,
                    transform: `translate(${pos.x}px, ${pos.y}px) rotate(${pos.rot}deg) scale(${isHovered ? 1.25 : 1})`,
                  }}
                  title={`Bóng #${c.numStr}: ${c.name} (${c.code})`}
                >
                  <div className="absolute top-1 left-1.5 h-2.5 w-3.5 rounded-full bg-white/90 blur-[0.2px] pointer-events-none" />
                  <div className="flex h-5.5 w-5.5 sm:h-6 sm:w-6 items-center justify-center rounded-full bg-white shadow-inner border border-slate-300 pointer-events-none">
                    <span className="text-xs font-black text-slate-950 leading-none">
                      {c.numStr}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* 4. VỎ QUẢ CẦU PHA LÊ TRONG SUỐT */}
          <div
            className="absolute z-25 rounded-full pointer-events-none overflow-hidden"
            style={{
              width: `${CAGE_RADIUS * 2}px`,
              height: `${CAGE_RADIUS * 2}px`,
              boxShadow:
                'inset 0 0 25px rgba(255,255,255,0.75), inset 0 -15px 35px rgba(0,0,0,0.12), 0 10px 25px rgba(217,119,6,0.15)',
              border: '2px solid rgba(255,255,255,0.9)',
              background:
                'radial-gradient(circle at 40% 30%, rgba(255,255,255,0.35) 0%, rgba(224,242,254,0.1) 60%, rgba(186,230,253,0.2) 100%)',
            }}
          >
            <div className="absolute -top-3 left-4 h-24 w-32 -rotate-30 rounded-[100%] bg-gradient-to-b from-white/75 via-white/20 to-transparent blur-[1px]" />
            <div className="absolute bottom-2 right-4 h-12 w-24 rotate-25 rounded-[100%] bg-gradient-to-t from-white/40 to-transparent blur-[1px]" />
          </div>
        </div>

        {/* Hiệu ứng trạng thái khi lồng cầu đang quay */}
        {isSpinning && (
          <div className="mt-4 mb-2 w-full max-w-md z-10 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-center gap-2 rounded-2xl bg-amber-500/25 border border-amber-400/60 px-4 py-2 text-amber-200 text-xs sm:text-sm font-black shadow-lg shadow-amber-500/20 backdrop-blur-md animate-pulse">
              <Sparkles className="h-4 w-4 animate-spin text-amber-300" />
              <span>⚡ LỒNG CẦU ĐANG ĐẢO BÓNG VÀ QUAY SỐ TỰ ĐỘNG...</span>
            </div>
          </div>
        )}

        {/* 2. KHU VỰC THAO TÁC / GIÁM SÁT */}
        <div className="mt-2 flex items-center justify-center w-full z-10">
          {isDev ? (
            <button
              onClick={canDraw ? onDrawNext : undefined}
              disabled={!canDraw || !!busy || isSpinning}
              className={`px-9 py-3 sm:py-3.5 min-w-[200px] max-w-[250px] flex items-center justify-center gap-2 rounded-2xl font-black text-sm sm:text-base tracking-widest uppercase transition-all select-none ${canDraw
                ? 'bg-gradient-to-r from-amber-400 via-rose-500 to-amber-500 border-2 border-yellow-200 text-white shadow-xl shadow-rose-500/35 hover:scale-105 active:scale-95 cursor-pointer'
                : 'bg-emerald-950/80 border border-emerald-800/70 text-emerald-200/40 opacity-40 cursor-not-allowed shadow-none'
                }`}
            >
              {isSpinning || busy ? (
                <>
                  <Sparkles className="h-4.5 w-4.5 animate-spin text-amber-200" />
                  <span>BỐC THĂM</span>
                </>
              ) : (
                <span>BỐC THĂM</span>
              )}
            </button>
          ) : (
            <div className="flex items-center gap-2 rounded-2xl bg-emerald-950/80 border border-emerald-700/60 px-5 py-2.5 text-emerald-200 text-xs sm:text-sm font-bold shadow-md">
              {isSpinning ? (
                <>
                  <Sparkles className="h-4 w-4 animate-spin text-amber-300" />
                  <span className="text-amber-200">Chủ đầu tư đang thực hiện quay số...</span>
                </>
              ) : isLive ? (
                <>
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Khán phòng trực tuyến • Giám sát phiên bốc thăm</span>
                </>
              ) : isFinished ? (
                <span>✓ Phiên bốc thăm đã hoàn tất</span>
              ) : (
                <span>Chế độ giám sát trực tuyến</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* DANH SÁCH ĐỐI CHIẾU BÓNG CỦA CÁC HỒ SƠ (DÒNG NGANG RỘNG RÃI, TÊN TRỌN VẸN 1 DÒNG) */}
      <div className="mt-5 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 text-xs font-bold text-slate-700">
          <span className="flex items-center gap-1.5 text-slate-900 uppercase tracking-wide">
            <Users className="h-4 w-4 text-amber-600" />
            Danh sách đối chiếu bóng ({totalBalls} hồ sơ):
          </span>
        </div>
        {candidates.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400">Chưa có hồ sơ tham gia</div>
        ) : (
          <div className="mt-3 flex flex-col gap-2.5">
            {candidates.map((c, idx) => {
              const palette = REALISTIC_BALL_PALETTES[idx % REALISTIC_BALL_PALETTES.length]
              const isDrawn = recentWinners.some(
                (w) =>
                  (w.applicationId && c.id && w.applicationId === c.id) ||
                  (w.applicantName && c.name && w.applicantName.trim().toLowerCase() === c.name.trim().toLowerCase()),
              )
              const isHovered = highlightBallIdx === idx
              return (
                <div
                  key={c.id || idx}
                  onMouseEnter={() => setHighlightBallIdx(idx)}
                  onMouseLeave={() => setHighlightBallIdx(null)}
                  className={`flex items-center justify-between gap-3 rounded-2xl border p-3 sm:px-4 sm:py-3 transition-all cursor-pointer ${isHovered
                    ? 'border-amber-400 bg-amber-50/80 shadow-md ring-2 ring-amber-300/60'
                    : isDrawn
                      ? 'border-emerald-200 bg-emerald-50/70'
                      : 'border-slate-200 bg-slate-50/70 hover:bg-white'
                    }`}
                >
                  {/* Quả bóng & Thông tin hồ sơ (Hiển thị 2 dòng gọn gàng, không bị khuất chữ) */}
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <div
                      className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-full shadow-md border-2 border-white"
                      style={{ background: palette.bg }}
                    >
                      <span className="text-xs sm:text-sm font-black text-white">{c.numStr}</span>
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-slate-900 text-sm sm:text-base uppercase tracking-wide">
                          {c.name}
                        </span>
                        <span className="font-mono text-[11px] font-bold text-slate-700 bg-slate-200/80 px-2 py-0.5 rounded-md">
                          {c.code}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] font-medium text-amber-950 bg-amber-100/90 px-2.5 py-0.5 rounded-md border border-amber-200 inline-block leading-tight">
                          {c.priority}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Trạng thái trúng */}
                  <div className="shrink-0 self-center pl-2">
                    {isDrawn ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-black text-emerald-800 border border-emerald-300 shadow-xs whitespace-nowrap">
                        ✓ ĐÃ TRÚNG
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-slate-200 px-3 py-1 text-[11px] font-bold text-slate-600 whitespace-nowrap">
                        Trong lồng
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
