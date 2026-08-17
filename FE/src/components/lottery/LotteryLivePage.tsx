import { useEffect, useRef, useState } from 'react'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { PageCard, PageHeader } from '@/components/layout/page-header'
import { navigate } from '@/hooks/useHashRoute'
import { formatError } from '@/lib/format-error'
import {
  lotteryApi,
  parseLotterySchedule,
  parseLiveState,
  type LiveStateDto,
  type LotteryScheduleDto,
} from '@/api/lottery'
import { connectLotteryHub, stopLotteryHub } from '@/api/lotteryHub'
import { getRole } from '@/router'
import { getLotteryPhase } from '@/lib/lottery-phase'
import { LiveZone } from './LiveZone'
import { WinnersZone } from './WinnersZone'
import { ApartmentFundZone } from './ApartmentFundZone'
import { ControlPanel } from './ControlPanel'

const PROJECT_KEY = 'lotteryProjectId'

function loadProjectId(): string {
  return sessionStorage.getItem(PROJECT_KEY) ?? ''
}

/** OTP dân nhập ở lottery-lobby, lưu lại theo projectId để Hub JoinProjectLobby
 *  gửi kèm khi Applicant vào xem Live lần kế tiếp (mà không phải nhập OTP lại). */
function loadApplicantOtp(projectId: string): string {
  return sessionStorage.getItem(`lotteryLobbyOtp:${projectId}`) ?? ''
}

/**
 * Rút ra thông báo thân thiện cho banner lỗi Hub.
 * SignalR khi BE chưa chạy thường ném `TypeError: Failed to fetch` thuần —
 * nhưng connectLotteryHub() đã gói lại thành `Error('Hub ...: <msg>. <hint>')`
 * để người debug dễ truy vết. Ta cắt bỏ phần stack/hint, chỉ giữ thông điệp
 * ngắn gọn đủ để user biết realtime tạm ngắt.
 */
function hubErrorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err)
  if (raw.includes('Failed to fetch') || raw.toLowerCase().includes('networkerror')) {
    return 'Không thể kết nối realtime (BE chưa chạy hoặc bị chặn). Dữ liệu vẫn được tải qua polling.'
  }
  return formatError(err)
}

export function LotteryLivePage() {
  const projectId = loadProjectId()
  const role = getRole()
  const isDev = role === 'Housing Developer'
  const isSxd = role === 'Department Of Construction'
  const isApplicant = role === 'Applicant'

  const [schedule, setSchedule] = useState<LotteryScheduleDto | null>(null)
  const [liveState, setLiveState] = useState<LiveStateDto | null>(null)
  const [myAppId, setMyAppId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [hubError, setHubError] = useState('')
  const [hubConnected, setHubConnected] = useState(false)
  // Đồng hồ cho top bar (UI-only, không ảnh hưởng logic)
  const [now, setNow] = useState<Date>(() => new Date())
  // Lần đầu fail mới hiện banner đỏ; các lần reconnect sau chỉ log console.
  const hubAnnouncedRef = useRef(false)
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const connectionRef = useRef<import('@microsoft/signalr').HubConnection | null>(null)

  // ── Initial data load ──────────────────────────────────────────────────────
  // Bóc lỗi riêng từng API: nếu 1 cái fail (vd Applicant không được xem
  // schedule sau khi phiên Finished), vẫn hiển thị được phần còn lại thay vì
  // banner đỏ che hết UI. Gộp thông điệm vào `msg` để debug.
  const load = async (quiet = false) => {
    if (!projectId) return
    if (!quiet) setLoading(true)
    const errs: string[] = []
    try {
      const schedRes = await lotteryApi
        .getSchedule(projectId)
        .then((d) => ({ ok: true as const, data: d }))
        .catch((e) => ({ ok: false as const, err: formatError(e) }))
      if (schedRes.ok) {
        setSchedule(parseLotterySchedule(schedRes.data))
      } else {
        errs.push(`schedule: ${schedRes.err}`)
      }

      const liveRes = await lotteryApi
        .getLiveState(projectId)
        .then((d) => ({ ok: true as const, data: d }))
        .catch((e) => ({ ok: false as const, err: formatError(e) }))
      if (liveRes.ok) {
        const ls = parseLiveState(liveRes.data)
        if (ls) setLiveState(ls)
      } else {
        errs.push(`live-state: ${liveRes.err}`)
      }
    } finally {
      if (!quiet) setLoading(false)
    }
    if (!quiet && errs.length > 0) {
      setMsg({ type: 'error', text: errs.join(' · ') })
    } else if (!quiet) {
      setMsg(null)
    }
  }

  // Auto-dismiss error banner sau 6s — UI-only, không đổi logic API.
  // Tránh banner đỏ "dính" vĩnh viễn khi BE tạm thời 400 (vd Applicant xem
  // live-state khi phiên đã Finished).
  useEffect(() => {
    if (!msg || msg.type !== 'error') return
    const id = window.setTimeout(() => setMsg(null), 6000)
    return () => window.clearTimeout(id)
  }, [msg])

  // Polling fails: chỉ log console, không set msg error — tránh banner
  // nhấp nháy mỗi 4s khi applicant xem phiên Finished.
  const polledFailCountRef = useRef(0)

  // ── Quiet-load wrapper (dùng cho polling + sau drawResult) ───────────────
  // Luôn log lỗi console (không nuốt), nhưng KHÔNG bao giờ set `msg` —
  // chỉ initial `load()` (không quiet) mới hiện banner.
  const loadQuiet = async () => {
    if (!projectId) return
    try {
      const [s, l] = await Promise.all([
        lotteryApi.getSchedule(projectId).catch((e) => ({ __err: formatError(e) } as never)),
        lotteryApi.getLiveState(projectId).catch((e) => ({ __err: formatError(e) } as never)),
      ])
      const schedData = s && !(s as { __err?: string }).__err ? (s as Awaited<ReturnType<typeof lotteryApi.getSchedule>>) : null
      const liveData = l && !(l as { __err?: string }).__err ? (l as Awaited<ReturnType<typeof lotteryApi.getLiveState>>) : null
      if (schedData) setSchedule(parseLotterySchedule(schedData))
      if (liveData) {
        const ls = parseLiveState(liveData)
        if (ls) setLiveState(ls)
      }
    } catch (err) {
      polledFailCountRef.current += 1
      // Log lần đầu + mỗi 10 lần để khỏi spam console; vẫn để dev thấy.
      if (polledFailCountRef.current === 1 || polledFailCountRef.current % 10 === 0) {
        console.warn(
          `[LotteryLivePage] Quiet reload failed (${polledFailCountRef.current}):`,
          err,
        )
      }
    }
  }

  useEffect(() => { void load() }, [projectId])

  // Tick đồng hồ UI top bar mỗi 1s (không đụng logic)
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])

  // ── My appId for highlight ────────────────────────────────────────────────
  useEffect(() => {
    if (!isApplicant) return
    void (async () => {
      try {
        const raw = await fetch(`${import.meta.env.VITE_API_BASE_URL ?? ''}/api/applications/my`, {
          headers: { Authorization: `Bearer ${sessionStorage.getItem('accessToken') ?? ''}` },
        })
        if (!raw.ok) return
        const data = await raw.json()
        const items = (data.items ?? data.Items ?? data ?? []) as { applicationId: string; projectId: string }[]
        const mine = items.find((a) => a.projectId === projectId)
        if (mine) setMyAppId(mine.applicationId)
      } catch { /* ignore */ }
    })()
  }, [projectId, isApplicant])

  // ── SignalR hub ───────────────────────────────────────────────────────────
  // Cho phép cả 3 role nối Hub/polling: CĐT + SXD điều khiển/giám sát,
  // Applicant xem realtime. LiveZone đã ẩn nút "BỐC TIẾP" khi !isDev,
  // nên mở guard không gây rủi ro cấp quyền.
  useEffect(() => {
    if (!projectId) return
    // Applicant phải vào qua lottery-lobby trước để có OTP; nếu chưa có thì
    // bỏ qua effect này — render block "chưa vào sảnh" bên dưới sẽ tự xử lý.
    const applicantOtp = isApplicant ? loadApplicantOtp(projectId) : ''
    if (isApplicant && !applicantOtp) return

    let cancelled = false

    // Poll backup every 4s
    const poll = window.setInterval(() => {
      void loadQuiet()
    }, 4000)

    void (async () => {
      try {
        const conn = await connectLotteryHub(projectId, isApplicant ? applicantOtp : undefined, {
          onLobbyCount: (n) => setLiveState((p) => p ? { ...p, lobbyCount: n } : p),
          onSxdSupervisorCount: (n) => setLiveState((p) => p ? { ...p, sxdOnlineCount: n } : p),
          onStatus: (s) => {
            setLiveState((p) => p ? { ...p, sessionStatus: s } : p)
            setSchedule((p) => p ? { ...p, sessionStatus: s } : p)
          },
          onDrawResult: () => { void loadQuiet() },
          onLiveState: (state) => {
            if (!cancelled) setLiveState(state)
          },
        })
        if (cancelled) {
          await stopLotteryHub(conn)
          return
        }
        connectionRef.current = conn
        setHubConnected(true)
        setHubError('')
        // Khi đã nối thành công, reset cờ để lần fail kế tiếp (reconnect hoặc đổi dự án)
        // lại được phép hiện banner 1 lần.
        hubAnnouncedRef.current = false
      } catch (err) {
        if (!cancelled) {
          setHubConnected(false)
          // Lần đầu fail mới hiện banner — lần sau (reconnect) chỉ log console
          // để tránh UI nhấp nháy đỏ liên tục khi BE chưa sẵn sàng.
          if (!hubAnnouncedRef.current) {
            hubAnnouncedRef.current = true
            setHubError(hubErrorMessage(err))
          } else {
            console.warn('[LotteryLivePage] Hub reconnect failed (suppressed):', err)
          }
        }
      }
    })()

    return () => {
      cancelled = true
      window.clearInterval(poll)
      void stopLotteryHub(connectionRef.current)
      connectionRef.current = null
      setHubConnected(false)
      // Reset cờ thông báo để lần mount kế tiếp coi như "lần đầu".
      hubAnnouncedRef.current = false
    }
  }, [projectId, isDev, isSxd, isApplicant])

  // ── Action helper ──────────────────────────────────────────────────────────
  const action = async (label: string, fn: () => Promise<unknown>) => {
    if (busy) return
    setBusy(label)
    setMsg(null)
    try {
      await fn()
      await load()
      setMsg({ type: 'success', text: `${label} thành công.` })
    } catch (err) {
      setMsg({ type: 'error', text: formatError(err) })
    } finally {
      setBusy('')
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  if (!projectId) {
    return (
      <div>
        <PageHeader routeId="lottery-live" />
        <PageCard className="p-6">
          <Alert variant="warning">
            <strong>Chưa chọn dự án.</strong> Vào <strong>Danh sách bốc thăm</strong> → chọn dự án → mở Live.
          </Alert>
          <div className="mt-3">
            <button className="rounded-xl bg-primary px-4 py-2 font-semibold text-white" onClick={() => navigate('lottery-sessions')}>
              ← Danh sách bốc thăm
            </button>
          </div>
        </PageCard>
      </div>
    )
  }

  if (loading) {
    return (
      <div>
        <PageHeader routeId="lottery-live" />
        <PageCard className="p-6">
          <div className="flex items-center gap-3">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span className="text-slate-500">Đang tải sảnh Live…</span>
          </div>
        </PageCard>
      </div>
    )
  }

  const sessionStatus = liveState?.sessionStatus ?? schedule?.sessionStatus ?? ''
  const phase = getLotteryPhase(schedule)
  const sxdOnline = liveState?.sxdOnlineCount ?? schedule?.sxdOnlineCount ?? 0
  const lobbyCount = liveState?.lobbyCount ?? 0

  return (
    <div>
      <PageHeader routeId="lottery-live" />
      <PageCard className="space-y-4 p-4">

        {/* ── Top bar (mẫu: status pill trái · tên dự án · đồng hồ + connection pill phải) ── */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant={sessionStatus === 'Live' ? 'warning' : sessionStatus === 'Finished' || sessionStatus === 'Published' ? 'success' : 'default'}>
              {sessionStatus === 'Live' && '● ĐANG XÁY VÀ LIVE'}
              {sessionStatus === 'Paused' && '⏸ TẠM DỪNG'}
              {sessionStatus === 'WaitingLobby' && '⏳ SẢNH CHỜ'}
              {sessionStatus === 'Finished' && '✓ KẾT THÚC'}
              {sessionStatus === 'Published' && '📢 ĐÃ CÔNG BỐ'}
              {sessionStatus === 'Scheduled' && '📅 ĐÃ LÊN LỊCH'}
              {!sessionStatus && '…'}
            </Badge>
            <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100">
              {schedule?.projectName ?? liveState?.projectName ?? 'Dự án bốc thăm'}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono tabular-nums dark:border-slate-700 dark:bg-slate-800">
              🕒 {now.toLocaleTimeString('vi-VN')}
            </span>
            <span
              className={`rounded-full px-2.5 py-1 font-bold uppercase tracking-wide ${
                hubConnected
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                  : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
              }`}
            >
              {hubConnected ? '✓ KẾT NỐI ỔN ĐỊNH' : '⏳ ĐANG KẾT NỐI'}
            </span>
            <span>👥 Sảnh: <strong>{lobbyCount}</strong></span>
            <span>🏛 SXD online: <strong>{sxdOnline}</strong></span>
            <span>🎲 Tỷ lệ: <strong className="text-emerald-600">{liveState?.winRatePercentage ?? 0}%</strong></span>
          </div>
        </div>

        {/* ── Connection status ── */}
        {hubError ? (
          <Alert variant="error">
            Không nối realtime: {hubError}
          </Alert>
        ) : !hubConnected && !isApplicant ? (
          <Alert variant="info">Đang kết nối sảnh realtime…</Alert>
        ) : hubConnected ? (
          <Alert variant="success">
            ✓ Đã nối realtime · SXD online: {sxdOnline}
            {isSxd ? ' (bạn đang giám sát — giữ trang mở)' : ''}
          </Alert>
        ) : null}

        {/* ── Message ── */}
        {msg && <Alert variant={msg.type === 'error' ? 'error' : 'success'}>{msg.text}</Alert>}

        {/* ── Applicant fallback: phiên đã kết thúc / công bố (BE 400) ── */}
        {isApplicant && !loading && !liveState && !schedule && msg?.type === 'error' && (
          <Alert variant="info">
            Phiên bốc thăm đã kết thúc hoặc công bố — không còn dữ liệu trực tiếp.
            Bạn có thể xem kết quả trong mục <strong>Bốc thăm của tôi</strong> hoặc <strong>Quỹ căn</strong> của dự án.
            <div className="mt-3 flex gap-2">
              <button
                className="rounded-xl bg-primary px-4 py-2 font-semibold text-white"
                onClick={() => navigate('my-lottery')}
              >
                ← Về Bốc thăm của tôi
              </button>
              <button
                className="rounded-xl border border-slate-300 px-4 py-2 font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200"
                onClick={() => navigate('projects')}
              >
                Danh sách dự án
              </button>
            </div>
          </Alert>
        )}

        {/* ── Applicant guard: phải qua lottery-lobby nhập OTP trước khi xem ── */}
        {isApplicant && !loadApplicantOtp(projectId) && (
          <Alert variant="warning">
            Bạn chưa vào sảnh (thiếu OTP). Vui lòng vào sảnh chờ để nhập mã OTP 6 số,
            rồi quay lại đây xem tiếp.
            <div className="mt-3">
              <button
                className="rounded-xl bg-primary px-4 py-2 font-semibold text-white"
                onClick={() => navigate('lottery-lobby')}
              >
                Đi tới sảnh chờ nhập OTP
              </button>
            </div>
          </Alert>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* 2-COLUMN GRID (mẫu): trái = Sảnh quay, phải = Danh sách trúng */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* KHU 1 — Sảnh quay số */}
          <LiveZone
            state={liveState}
            sessionStatus={sessionStatus}
            isDev={isDev}
            onDrawNext={() => action('Bốc tiếp', () => lotteryApi.drawNext(projectId))}
            busy={busy === 'Bốc tiếp'}
          />

          {/* KHU 2 — Danh sách trúng */}
          <WinnersZone state={liveState} myAppId={myAppId} />
        </div>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* 2-COLUMN GRID: trái = Quỹ căn, phải = Điều khiển (CĐT/SXD/Applicant) */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* KHU 3 — Quỹ căn */}
          <ApartmentFundZone state={liveState} />

          {/* KHU 4 — Điều khiển (giữ nguyên ControlPanel đã có sẵn) */}
          <ControlPanel
            phase={phase}
            session={schedule}
            liveState={liveState}
            isDev={isDev}
            isSxd={isSxd}
            isApplicant={isApplicant}
            busy={busy}
            onAction={action}
            projectId={projectId}
          />
        </div>

        {/* ── Footer nav ── */}
        <div className="flex justify-end">
          <button
            className="rounded-lg px-3 py-1.5 text-sm text-slate-500 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
            onClick={() => navigate('lottery-detail')}
          >
            ← Về chi tiết bốc thăm
          </button>
        </div>
      </PageCard>
    </div>
  )
}
