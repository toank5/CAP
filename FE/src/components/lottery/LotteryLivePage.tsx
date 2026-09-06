import React, { useEffect, useRef, useState } from 'react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { navigate } from '@/hooks/useHashRoute'
import { formatError } from '@/lib/format-error'
import {
  lotteryApi,
  parseLotterySchedule,
  parseLiveState,
  type LiveStateDto,
  type LotteryScheduleDto,
} from '@/api/lottery'
import { housingProjectsApi } from '@/api/housing-projects'
import type { HousingProjectSummaryDto } from '@/types'
import { WAITLIST_CONFIRM_HOURS } from '@/lib/lottery-allocation'
import { connectLotteryHub, stopLotteryHub } from '@/api/lotteryHub'
import { getRole } from '@/router'
import { getLotteryPhase } from '@/lib/lottery-phase'
import { LiveZone } from './LiveZone'
import { WinnersZone } from './WinnersZone'
import { ApartmentFundZone } from './ApartmentFundZone'
import { ControlPanel } from './ControlPanel'
import { LotteryStaffTabs } from './lottery-staff-tabs'
import { lotteryAudio } from '@/lib/lottery-audio'
import {
  RefreshCw,
  ArrowLeft,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react'

const PROJECT_KEY = 'lotteryProjectId'

function loadStoredProjectId(): string {
  return sessionStorage.getItem(PROJECT_KEY) ?? ''
}

function persistProjectId(id: string) {
  if (id) sessionStorage.setItem(PROJECT_KEY, id)
  else sessionStorage.removeItem(PROJECT_KEY)
}

function loadApplicantOtp(projectId: string): string {
  return sessionStorage.getItem(`lotteryLobbyOtp:${projectId}`) ?? ''
}

function hubErrorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err)
  if (raw.includes('Failed to fetch') || raw.toLowerCase().includes('networkerror')) {
    return 'Không thể kết nối trực tuyến (máy chủ chưa phản hồi). Dữ liệu vẫn được tự động đồng bộ liên tục.'
  }
  return formatError(err)
}

export interface LiveEligibleProject extends HousingProjectSummaryDto {
  sessionStatus?: string
  isLotteryApproved?: boolean
}

export const LotteryLivePage: React.FC = () => {
  const role = getRole()
  const isDev = role === 'Housing Developer'
  const isSxd = role === 'Department Of Construction'
  const isApplicant = role === 'Applicant'

  const [projectId, setProjectId] = useState<string>(() => loadStoredProjectId())
  const [projectList, setProjectList] = useState<LiveEligibleProject[]>([])
  const [currentProject, setCurrentProject] = useState<LiveEligibleProject | null>(null)
  const [eligibleList, setEligibleList] = useState<import('@/api/lottery').LotteryEligibleEntry[]>([])

  const [schedule, setSchedule] = useState<LotteryScheduleDto | null>(null)
  const [liveState, setLiveState] = useState<LiveStateDto | null>(null)
  const [myAppId, setMyAppId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [hubError, setHubError] = useState('')
  const [hubConnected, setHubConnected] = useState(false)
  const [now, setNow] = useState<Date>(() => new Date())
  const hubAnnouncedRef = useRef(false)
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [soundEnabled, setSoundEnabled] = useState(() => lotteryAudio.isEnabled())
  const [batchModalOpen, setBatchModalOpen] = useState(false)
  const connectionRef = useRef<import('@microsoft/signalr').HubConnection | null>(null)

  // 1. Tải danh sách dự án hợp lệ cho trường quay trực tiếp
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        setLoading(true)
        const data = await housingProjectsApi.list({ pageIndex: 1, pageSize: 50 })
        const raw = data && typeof data === 'object' ? (data as Record<string, unknown>) : {}
        const list = (raw.items ?? raw.Items ?? []) as HousingProjectSummaryDto[]

        // Lọc các dự án đã được Sở duyệt
        const approvedProjects = list.filter((p) => {
          const s = normalizeStatus(p.status)
          return s !== 'PENDING' && s !== 'REJECTED' && s !== 'CLOSED'
        })

        // Tải lịch bốc thăm
        const checked = await Promise.all(
          approvedProjects.map(async (p) => {
            try {
              const schedData = await lotteryApi.getSchedule(p.id)
              const sched = parseLotterySchedule(schedData)
              const isApproved =
                sched?.isLotteryApproved === true ||
                ['Live', 'WaitingLobby', 'Scheduled', 'Paused', 'Finished', 'Published'].includes(
                  String(sched?.sessionStatus),
                )
              return {
                project: p,
                schedule: sched,
                isApproved,
              }
            } catch {
              return { project: p, schedule: null, isApproved: false }
            }
          }),
        )

        const eligible: LiveEligibleProject[] = checked
          .filter((c) => c.isApproved)
          .map((c) => ({
            ...c.project,
            sessionStatus: c.schedule?.sessionStatus ?? undefined,
            isLotteryApproved: c.schedule?.isLotteryApproved ?? undefined,
          }))

        if (cancelled) return
        setProjectList(eligible)

        // Chỉ auto-select nếu có dự án đang thực sự LIVE hoặc MỞ SẢNH CHỜ
        const activeLive = eligible.find(
          (p) => p.sessionStatus === 'Live' || p.sessionStatus === 'WaitingLobby',
        )

        if (activeLive) {
          setProjectId(activeLive.id)
          persistProjectId(activeLive.id)
          setCurrentProject(activeLive)
        } else {
          // Không có phiên Live nào đang chạy -> Giữ sảnh ở chế độ chờ (trống)
          setProjectId('')
          persistProjectId('')
          setCurrentProject(null)
        }
      } catch (err) {
        console.warn('[LotteryLivePage] Failed to fetch eligible live project list:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  // Cập nhật currentProject khi projectId thay đổi
  useEffect(() => {
    if (!projectId) {
      setCurrentProject(null)
      return
    }
    const found = projectList.find((p) => p.id === projectId)
    if (found) {
      setCurrentProject(found)
    }
  }, [projectId, projectList])

  // Đổi dự án từ dropdown
  const handleSelectProject = (newId: string) => {
    if (newId === projectId) return
    setProjectId(newId)
    persistProjectId(newId)
    setSchedule(null)
    setLiveState(null)
    setEligibleList([])
    setHubError('')
    setMsg(null)
  }

  // 2. Load dữ liệu lịch & trạng thái Live
  const load = async (quiet = false) => {
    if (!projectId) return
    if (!quiet) setLoading(true)
    try {
      const schedRes = await lotteryApi
        .getSchedule(projectId)
        .then((d) => ({ ok: true as const, data: d }))
        .catch((e) => ({ ok: false as const, err: formatError(e) }))

      let loadedSchedule: LotteryScheduleDto | null = null
      if (schedRes.ok) {
        loadedSchedule = parseLotterySchedule(schedRes.data)
        setSchedule(loadedSchedule)
      } else {
        setSchedule(null)
      }

      const isApproved =
        loadedSchedule?.isLotteryApproved === true ||
        ['Live', 'WaitingLobby', 'Scheduled', 'Paused', 'Finished', 'Published'].includes(
          String(loadedSchedule?.sessionStatus),
        )

      if (isApproved) {
        const [liveRes, elRes] = await Promise.all([
          lotteryApi
            .getLiveState(projectId)
            .then((d) => ({ ok: true as const, data: d }))
            .catch((e) => ({ ok: false as const, err: formatError(e) })),
          lotteryApi
            .getEligibleParticipants(projectId)
            .then((d) => ({ ok: true as const, data: d }))
            .catch(() => ({ ok: false as const, data: [] })),
        ])

        if (liveRes.ok) {
          const ls = parseLiveState(liveRes.data)
          if (ls) setLiveState(ls)
        }
        if (elRes.ok && Array.isArray(elRes.data)) {
          setEligibleList(elRes.data)
        }
      } else {
        setLiveState(null)
        setEligibleList([])
      }
    } finally {
      if (!quiet) setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [projectId])

  // Tick đồng hồ
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(id)
  }, [])

  // Applicant highlight ID
  useEffect(() => {
    if (!isApplicant || !projectId) return
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

  // 3. SignalR Hub
  useEffect(() => {
    if (!projectId) return

    const isScheduleApproved =
      schedule?.isLotteryApproved === true ||
      ['Live', 'WaitingLobby', 'Scheduled', 'Paused', 'Finished', 'Published'].includes(
        String(schedule?.sessionStatus),
      )

    if (!isScheduleApproved) {
      setHubConnected(false)
      setHubError('')
      return
    }

    const applicantOtp = isApplicant ? loadApplicantOtp(projectId) : ''
    if (isApplicant && !applicantOtp) return

    let cancelled = false

    const poll = window.setInterval(() => {
      void load(true)
    }, 5000)

    void (async () => {
      try {
        const conn = await connectLotteryHub(projectId, isApplicant ? applicantOtp : undefined, {
          onLobbyCount: (n) => setLiveState((p) => (p ? { ...p, lobbyCount: n } : p)),
          onSxdSupervisorCount: (n) => setLiveState((p) => (p ? { ...p, sxdOnlineCount: n } : p)),
          onStatus: (s) => {
            setLiveState((p) => (p ? { ...p, sessionStatus: s } : p))
            setSchedule((p) => (p ? { ...p, sessionStatus: s } : p))
          },
          onDrawResult: () => {
            lotteryAudio.playWinnerFanfare()
            void load(true)
          },
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
        hubAnnouncedRef.current = false
      } catch (err) {
        if (!cancelled) {
          setHubConnected(false)
          if (!hubAnnouncedRef.current) {
            hubAnnouncedRef.current = true
            setHubError(hubErrorMessage(err))
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
      hubAnnouncedRef.current = false
    }
  }, [projectId, schedule?.isLotteryApproved, schedule?.sessionStatus, isApplicant])

  // Action helper
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

  const handleRunBatchConfirm = async () => {
    setBatchModalOpen(false)
    if (!projectId) return
    lotteryAudio.playSpin()
    await action('Chạy bốc thăm tự động', () => lotteryApi.runLottery(projectId))
    lotteryAudio.playWinnerFanfare()
  }

  const toggleSound = () => {
    const next = lotteryAudio.toggleSound()
    setSoundEnabled(next)
  }

  const phase = getLotteryPhase(schedule, currentProject?.status)
  const sessionStatus = liveState?.sessionStatus ?? schedule?.sessionStatus ?? ''
  const sxdOnline = liveState?.sxdOnlineCount ?? schedule?.sxdOnlineCount ?? 0
  const lobbyCount = liveState?.lobbyCount ?? 0

  return (
    <div className="space-y-4">
      <LotteryStaffTabs current="live" />
      {/* Top Studio Command Bar */}
      <div className="flex flex-col gap-4 rounded-3xl border border-slate-200/90 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Left: Studio Branding & Title */}
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 shadow-md text-white font-black text-2xl">
              🎲
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[11px] font-extrabold uppercase tracking-widest text-amber-700">
                  TRƯỜNG QUAY BỐC THĂM NHÀ Ở XÃ HỘI
                </span>
                <span
                  className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${sessionStatus === 'Live'
                    ? 'bg-rose-500 text-white animate-pulse'
                    : sessionStatus === 'WaitingLobby'
                      ? 'bg-amber-100 text-amber-900 border border-amber-300'
                      : sessionStatus === 'Finished' || sessionStatus === 'Published'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  {sessionStatus === 'Live' && '🔴 TRỰC TIẾP TỪ TRƯỜNG QUAY'}
                  {sessionStatus === 'WaitingLobby' && '⏳ SẢNH CHỜ MỞ'}
                  {sessionStatus === 'Paused' && '⏸ TẠM DỪNG'}
                  {sessionStatus === 'Finished' && '✓ KẾT THÚC'}
                  {sessionStatus === 'Published' && '📢 ĐÃ CÔNG BỐ'}
                  {!sessionStatus && '⚪ CHẾ ĐỘ CHỜ'}
                </span>
              </div>
              <h1 className="mt-0.5 text-lg font-black text-slate-900 sm:text-xl">
                {schedule?.projectName ?? liveState?.projectName ?? currentProject?.projectName ?? 'Sảnh Bốc Thăm Trực Tuyến'}
              </h1>
            </div>
          </div>

          {/* Right: Studio Metric Badges & Utilities */}
          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            {/* Live Time */}
            <span className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 font-mono font-semibold text-slate-700">
              🕒 {now.toLocaleTimeString('vi-VN')}
            </span>

            {/* SXD Supervisor Presence */}
            <span className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 font-bold text-emerald-800">
              🏛 Sở giám sát: {sxdOnline}
            </span>

            {/* Lobby Viewers */}
            <span className="flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 font-bold text-blue-800">
              👥 Khán phòng: {lobbyCount}
            </span>

            {/* Realtime Hub Status */}
            {projectId && (
              <span
                className={`rounded-xl border px-3 py-1.5 font-bold ${hubConnected
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-amber-200 bg-amber-50 text-amber-800'
                  }`}
              >
                {hubConnected ? '✓ KẾT NỐI TRỰC TUYẾN' : '⏳ ĐANG ĐỒNG BỘ'}
              </span>
            )}

            {/* Sound Toggle */}
            <button
              onClick={toggleSound}
              className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 font-bold text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
              title="Bật/Tắt âm thanh trường quay"
            >
              {soundEnabled ? <Volume2 className="h-4 w-4 text-amber-600" /> : <VolumeX className="h-4 w-4 text-slate-400" />}
            </button>
          </div>
        </div>

        {/* Project Selector & Actions Bar */}
        <div className="flex flex-col gap-3 border-t border-slate-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Chọn phiên bốc thăm:
            </span>
            <div className="relative">
              <select
                value={projectId}
                onChange={(e) => handleSelectProject(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-900 shadow-xs focus:border-indigo-500 focus:outline-none"
              >
                <option value="">-- Chưa chọn dự án bốc thăm --</option>
                {projectList.map((p) => {
                  const isLive = p.sessionStatus === 'Live'
                  const isLobby = p.sessionStatus === 'WaitingLobby'
                  const isPublished = p.sessionStatus === 'Published' || p.sessionStatus === 'Finished'
                  return (
                    <option key={p.id} value={p.id}>
                      {p.projectName} {isLive ? '🔴 (Đang trực tiếp)' : isLobby ? '⏳ (Sảnh chờ)' : isPublished ? '✓ (Đã công bố)' : '📅 (Đã duyệt lịch)'}
                    </option>
                  )
                })}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('lottery-sessions')}
              className="text-xs"
            >
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
              Về quản lý phiên
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={() => void load()}
              className="text-xs"
            >
              <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Làm mới
            </Button>
          </div>
        </div>
      </div>

      {/* Thông báo thao tác */}
      {msg && <Alert variant={msg.type === 'error' ? 'error' : 'success'}>{msg.text}</Alert>}

      {/* Realtime Hub Error Alert */}
      {hubError && (
        <Alert variant="error">
          Lưu ý kết nối trực tiếp: {hubError}
        </Alert>
      )}

      {/* 2-Column Grid Top: Live Candidate Shuffler Studio (Khu 1) & Realtime Prize Board (Khu 2) */}
      <div className="grid gap-4 lg:grid-cols-2">
        <LiveZone
          state={liveState}
          sessionStatus={sessionStatus}
          isDev={isDev}
          eligibleList={eligibleList}
          onDrawNext={() => action('Bốc tiếp', () => lotteryApi.drawNext(projectId))}
          onRunBatch={() => setBatchModalOpen(true)}
          busy={busy === 'Bốc tiếp' || busy === 'Chạy bốc thăm tự động'}
        />
        <WinnersZone state={liveState} myAppId={myAppId} />
      </div>

      {/* 2-Column Grid Bottom: Apartment Fund Vault (Khu 3) & Operator Deck (Khu 4) */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ApartmentFundZone state={liveState} />
        <ControlPanel
          phase={phase}
          session={schedule}
          liveState={liveState}
          isDev={isDev}
          isSxd={isSxd}
          isApplicant={isApplicant}
          busy={busy}
          onAction={action}
          onRunBatch={() => setBatchModalOpen(true)}
          projectId={projectId}
        />
      </div>

      {/* Modal xác nhận Chạy bốc thăm tự động (Batch Auto Run) */}
      {batchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl border border-amber-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
                <Zap className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 uppercase">
                  Chạy Bốc Thăm Tự Động Toàn Sảnh
                </h3>
                <p className="text-xs text-slate-500">Xáo trộn ngẫu nhiên theo khoản 2 Điều 38 Nghị định 100/2024</p>
              </div>
            </div>

            <p className="mt-4 text-xs leading-relaxed text-slate-600">
              Hệ thống xáo trộn ngẫu nhiên công khai phần quỹ căn còn lại. Hồ sơ không trúng được xếp danh sách chờ theo hạng. Căn trả lại (hủy hợp đồng / không cọc) đôn người đứng đầu — hạn xác nhận {WAITLIST_CONFIRM_HOURS} giờ, không mở lại đợt bốc thăm.
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBatchModalOpen(false)}
              >
                Hủy bỏ
              </Button>
              <Button
                variant="accent"
                size="sm"
                onClick={handleRunBatchConfirm}
                className="bg-gradient-to-r from-amber-500 to-rose-600 text-white font-black"
              >
                <Zap className="mr-1.5 h-4 w-4" />
                Xác nhận chạy ngay
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
