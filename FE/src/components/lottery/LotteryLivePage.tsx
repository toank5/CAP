import React, { useEffect, useRef, useState } from 'react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { navigate } from '@/hooks/useHashRoute'
import { formatError } from '@/lib/format-error'
import {
  lotteryApi,
  parseLotterySchedule,
  parseLiveState,
  parseWinner,
  parseLotteryResult,
  parseEligibleList,
  parseWaitlist,
  maskCccd,
  type LiveStateDto,
  type LiveWinnerEntry,
  type LotteryScheduleDto,
  type WaitlistEntryDto,
} from '@/api/lottery'
import { housingProjectsApi } from '@/api/housing-projects'
import type { HousingProjectSummaryDto } from '@/types'
import { WAITLIST_CONFIRM_HOURS_DEFAULT } from '@/lib/lottery-allocation'
import { connectLotteryHub, stopLotteryHub } from '@/api/lotteryHub'
import { getRole } from '@/router'
import { getLotteryPhase } from '@/lib/lottery-phase'
import { normalizeStatus } from '@/lib/project-status-flow'
import { LiveZone } from './LiveZone'
import { WinnersZone } from './WinnersZone'
import { ApartmentFundZone } from './ApartmentFundZone'
import { ControlPanel } from './ControlPanel'
import { lotteryAudio } from '@/lib/lottery-audio'
import {
  RefreshCw,
  ArrowLeft,
  Volume2,
  VolumeX,
  Zap,
  KeyRound,
  X,
  Clock,
  Building2,
  Users,
  CheckCircle2,
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

  const [projectId, setProjectId] = useState<string>('')
  const [projectList, setProjectList] = useState<LiveEligibleProject[]>([])
  const [currentProject, setCurrentProject] = useState<LiveEligibleProject | null>(null)
  const [eligibleList, setEligibleList] = useState<import('@/api/lottery').LotteryEligibleEntry[]>([])

  const [schedule, setSchedule] = useState<LotteryScheduleDto | null>(null)
  const [liveState, setLiveState] = useState<LiveStateDto | null>(null)
  const [waitlist, setWaitlist] = useState<WaitlistEntryDto[]>([])
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

  // Quản lý mã vào sảnh cho Người dân
  const [applicantOtpState, setApplicantOtpState] = useState(() => (loadStoredProjectId() ? loadApplicantOtp(loadStoredProjectId()) : ''))
  const [liveOtpModalOpen, setLiveOtpModalOpen] = useState(false)
  const [liveOtpInput, setLiveOtpInput] = useState('')
  const [liveOtpError, setLiveOtpError] = useState('')
  const [liveOtpBusy, setLiveOtpBusy] = useState(false)

  // 1. Tải danh sách dự án hợp lệ cho trường quay trực tiếp (đã được Sở duyệt lịch bốc thăm)
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        setLoading(true)
        const data = await housingProjectsApi.list({ pageIndex: 1, pageSize: 50 })
        const raw = data && typeof data === 'object' ? (data as Record<string, unknown>) : {}
        const list = (raw.items ?? raw.Items ?? []) as HousingProjectSummaryDto[]

        // Lọc các dự án hợp lệ (không bị từ chối)
        const approvedProjects = list.filter((p) => {
          const s = normalizeStatus(p.status)
          return !/REJECTED|TỪ CHỐI/.test(s)
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

        const storedId = loadStoredProjectId()
        const storedMatch = eligible.find((p) => p.id === storedId)
        const activeLive = eligible.find(
          (p) => p.sessionStatus === 'Live' || p.sessionStatus === 'WaitingLobby',
        )

        if (activeLive) {
          setProjectId(activeLive.id)
          persistProjectId(activeLive.id)
          setCurrentProject(activeLive)
        } else if (storedMatch) {
          setProjectId(storedMatch.id)
          persistProjectId(storedMatch.id)
          setCurrentProject(storedMatch)
        } else {
          // Không có phiên Live nào đang chạy và dự án trong storage chưa duyệt lịch -> Giữ sảnh ở chế độ chờ (trống)
          setProjectId('')
          persistProjectId('')
          setCurrentProject(null)
          setSchedule(null)
          setLiveState(null)
          setWaitlist([])
          setEligibleList([])
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
    setWaitlist([])
    setEligibleList([])
    setHubError('')
    setMsg(null)
  }

  // 2. Load dữ liệu lịch & trạng thái Live
  const load = async (quiet = false) => {
    if (!projectId) {
      setSchedule(null)
      setLiveState(null)
      setWaitlist([])
      setEligibleList([])
      if (!quiet) setLoading(false)
      return
    }
    if (!quiet) setLoading(true)
    try {
      const schedRes = await lotteryApi
        .getSchedule(projectId)
        .then((d) => ({ ok: true as const, data: d }))
        .catch((e) => ({ ok: false as const, err: formatError(e) }))

      let loadedSchedule: LotteryScheduleDto | null = null
      if (schedRes.ok) {
        loadedSchedule = parseLotterySchedule(schedRes.data)
      }

      const isApproved =
        loadedSchedule?.isLotteryApproved === true ||
        ['Live', 'WaitingLobby', 'Scheduled', 'Paused', 'Finished', 'Published'].includes(
          String(loadedSchedule?.sessionStatus),
        )

      if (loadedSchedule && isApproved) {
        setSchedule(loadedSchedule)
        const [liveRes, elRes, resultRes, waitlistRes] = await Promise.all([
          lotteryApi
            .getLiveState(projectId)
            .then((d) => ({ ok: true as const, data: d }))
            .catch((e) => ({ ok: false as const, err: formatError(e) })),
          lotteryApi
            .getEligibleParticipants(projectId)
            .then((d) => ({ ok: true as const, data: d }))
            .catch(() => ({ ok: false as const, data: [] })),
          lotteryApi
            .getResult(projectId)
            .then((d) => ({ ok: true as const, data: d }))
            .catch(() => ({ ok: false as const, data: null })),
          lotteryApi
            .getWaitlist(projectId)
            .then((d) => ({ ok: true as const, data: d }))
            .catch(() => ({ ok: false as const, data: [] })),
        ])

        let ls = liveRes.ok ? parseLiveState(liveRes.data) : null
        const lotteryResult = resultRes.ok ? parseLotteryResult(resultRes.data) : null

        const effectiveTotalUnits = Number(loadedSchedule.totalUnits || loadedSchedule.availableUnits || 2)

        // Đồng bộ danh sách người trúng từ bảng kết quả nếu liveState chưa kịp cập nhật
        if (lotteryResult && Array.isArray(lotteryResult.winners) && lotteryResult.winners.length > 0) {
          const resultWinners: LiveWinnerEntry[] = lotteryResult.winners.map((w, idx) => ({
            applicationId: w.applicationId,
            applicationCode: w.applicationId.length <= 12 ? w.applicationId : w.applicationId.slice(0, 8).toUpperCase(),
            applicantName: w.applicantName,
            maskedCitizenId: maskCccd(w.citizenId),
            stt: idx + 1,
            result: w.lotteryResult || 'WON',
            slotCode: w.slotCode,
            drawnAt: lotteryResult.drawnAt || new Date().toISOString(),
            remainingUnits: null,
            priorityGroup: w.lotteryResult === 'PRIORITY_WON' ? 'MERIT_PERSON' : 'NONE',
          }))

          if (!ls) {
            ls = {
              projectId,
              projectName: loadedSchedule.projectName,
              sessionStatus: loadedSchedule.sessionStatus,
              totalUnits: effectiveTotalUnits,
              drawnUnitsCount: Math.min(resultWinners.length, effectiveTotalUnits),
              remainingUnits: Math.max(0, effectiveTotalUnits - resultWinners.length),
              recentWinners: resultWinners.slice(0, effectiveTotalUnits),
              latestDrawResult: resultWinners[0] || null,
              priorityWinnersCount: resultWinners.slice(0, effectiveTotalUnits).filter((w) => w.result === 'PRIORITY_WON').length,
              randomWinnersCount: resultWinners.slice(0, effectiveTotalUnits).filter((w) => w.result === 'WON').length,
            }
          } else {
            const currentWinners = ls.recentWinners ?? []
            const map = new Map<string, LiveWinnerEntry>()
            resultWinners.forEach((w) => map.set(w.applicationId, w))
            currentWinners.forEach((w) => map.set(w.applicationId, w))
            const merged = Array.from(map.values()).slice(0, effectiveTotalUnits)
            ls.recentWinners = merged
            ls.totalUnits = effectiveTotalUnits
            ls.drawnUnitsCount = merged.length
            ls.remainingUnits = Math.max(0, effectiveTotalUnits - merged.length)
            if (!ls.latestDrawResult && merged.length > 0) {
              ls.latestDrawResult = merged[0]
            }
            ls.priorityWinnersCount = merged.filter((w) => w.result === 'PRIORITY_WON' || (w.priorityGroup && w.priorityGroup !== 'None')).length
            ls.randomWinnersCount = merged.filter((w) => w.result === 'WON' || (!w.priorityGroup || w.priorityGroup === 'None')).length
          }
        }

        const parsedEligible = parseEligibleList(elRes.ok ? elRes.data : [])
        setEligibleList(parsedEligible)

        // Hợp nhất người trúng từ danh sách hồ sơ đủ điều kiện nếu có thông tin kết quả trúng thực sự
        const eligibleWinners: LiveWinnerEntry[] = parsedEligible
          .filter((p) => p.lotteryResult === 'WON' || p.lotteryResult === 'PRIORITY_WON')
          .map((p, idx) => ({
            applicationId: p.applicationId,
            applicationCode: p.applicationId.length <= 12 ? p.applicationId : p.applicationId.slice(0, 8).toUpperCase(),
            applicantName: p.applicantName,
            maskedCitizenId: maskCccd(p.citizenId),
            stt: idx + 1,
            result: p.lotteryResult || 'WON',
            slotCode: p.slotCode,
            drawnAt: new Date().toISOString(),
            remainingUnits: null,
            priorityGroup: p.priorityGroup || (p.lotteryResult === 'PRIORITY_WON' ? 'MERIT_PERSON' : 'NONE'),
          }))

        if (eligibleWinners.length > 0) {
          if (!ls) {
            ls = {
              projectId,
              projectName: loadedSchedule.projectName,
              sessionStatus: loadedSchedule.sessionStatus,
              totalUnits: effectiveTotalUnits,
              drawnUnitsCount: Math.min(eligibleWinners.length, effectiveTotalUnits),
              remainingUnits: Math.max(0, effectiveTotalUnits - eligibleWinners.length),
              recentWinners: eligibleWinners.slice(0, effectiveTotalUnits),
              latestDrawResult: eligibleWinners[0] || null,
              priorityWinnersCount: eligibleWinners.slice(0, effectiveTotalUnits).filter((w) => w.result === 'PRIORITY_WON').length,
              randomWinnersCount: eligibleWinners.slice(0, effectiveTotalUnits).filter((w) => w.result === 'WON').length,
            }
          } else {
            const currentWinners = ls.recentWinners ?? []
            const map = new Map<string, LiveWinnerEntry>()
            eligibleWinners.forEach((w) => map.set(w.applicationId, w))
            currentWinners.forEach((w) => map.set(w.applicationId, w))
            const merged = Array.from(map.values()).slice(0, effectiveTotalUnits)
            ls.recentWinners = merged
            ls.totalUnits = effectiveTotalUnits
            ls.drawnUnitsCount = merged.length
            ls.remainingUnits = Math.max(0, effectiveTotalUnits - merged.length)
            if (!ls.latestDrawResult && merged.length > 0) {
              ls.latestDrawResult = merged[0]
            }
            ls.priorityWinnersCount = merged.filter((w) => w.result === 'PRIORITY_WON' || (w.priorityGroup && w.priorityGroup !== 'None')).length
            ls.randomWinnersCount = merged.filter((w) => w.result === 'WON' || (!w.priorityGroup || w.priorityGroup === 'None')).length
          }
        }

        if (ls) {
          if (effectiveTotalUnits > 0) {
            ls.totalUnits = effectiveTotalUnits
            if (ls.recentWinners && ls.recentWinners.length > effectiveTotalUnits) {
              ls.recentWinners = ls.recentWinners.slice(0, effectiveTotalUnits)
            }
            ls.drawnUnitsCount = ls.recentWinners?.length ?? 0
            ls.remainingUnits = Math.max(0, effectiveTotalUnits - ls.drawnUnitsCount)
          }
          ls.priorityWinnersCount = ls.recentWinners?.filter((w) => w.result === 'PRIORITY_WON' || (w.priorityGroup && w.priorityGroup !== 'None')).length ?? 0
          ls.randomWinnersCount = ls.recentWinners?.filter((w) => w.result === 'WON' || (!w.priorityGroup || w.priorityGroup === 'None')).length ?? 0
          setLiveState(ls)
        } else {
          setLiveState(null)
        }

        // Cập nhật danh sách dự bị (Waitlist)
        const parsedWl = parseWaitlist(waitlistRes.ok ? waitlistRes.data : [])
        if (parsedWl.length > 0) {
          setWaitlist(parsedWl)
        } else if (parsedEligible.length > 0 && ls && ls.recentWinners && ls.recentWinners.length > 0) {
          const winnerIds = new Set(ls.recentWinners.map((w) => w.applicationId))
          const nonWinners: WaitlistEntryDto[] = parsedEligible
            .filter((e) => !winnerIds.has(e.applicationId) && e.lotteryResult !== 'WON' && e.lotteryResult !== 'PRIORITY_WON')
            .sort((a, b) => (b.priorityScore ?? 0) - (a.priorityScore ?? 0))
            .map((e, idx) => ({
              applicationId: e.applicationId,
              applicantName: e.applicantName,
              citizenId: e.citizenId,
              waitlistRank: idx + 1,
              score: e.priorityScore,
              status: 'WAITLIST',
            }))
          setWaitlist(nonWinners)
        } else {
          setWaitlist([])
        }
      } else {
        // Dự án chưa được duyệt lịch bốc thăm
        setSchedule(null)
        setLiveState(null)
        setWaitlist([])
        setEligibleList([])
        setProjectId('')
        persistProjectId('')
        setCurrentProject(null)
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

  // Tự động kiểm tra / đồng bộ mã vào sảnh cho Người dân
  useEffect(() => {
    if (!projectId || !isApplicant) return
    const current = loadApplicantOtp(projectId)
    if (current) {
      setApplicantOtpState(current)
      setLiveOtpModalOpen(false)
      return
    }

    if (schedule?.joinCode && schedule.joinCode.length >= 6) {
      void (async () => {
        try {
          await lotteryApi.verifyOtp(projectId, schedule.joinCode!)
          sessionStorage.setItem(`lotteryLobbyOtp:${projectId}`, schedule.joinCode!)
          setApplicantOtpState(schedule.joinCode!)
          setLiveOtpModalOpen(false)
        } catch {
          setLiveOtpInput(schedule.joinCode || '')
          setLiveOtpModalOpen(true)
        }
      })()
    } else {
      setLiveOtpModalOpen(true)
    }
  }, [projectId, isApplicant, schedule?.joinCode])

  const handleLiveOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!projectId || liveOtpBusy) return
    if (!liveOtpInput || liveOtpInput.length < 6) {
      setLiveOtpError('Vui lòng nhập đủ 6 chữ số mã vào sảnh.')
      return
    }

    setLiveOtpBusy(true)
    setLiveOtpError('')
    try {
      await lotteryApi.verifyOtp(projectId, liveOtpInput)
      sessionStorage.setItem(`lotteryLobbyOtp:${projectId}`, liveOtpInput)
      setApplicantOtpState(liveOtpInput)
      setLiveOtpModalOpen(false)
      setMsg({ type: 'success', text: 'Xác thực thành công. Đã kết nối với trường quay.' })
    } catch (err) {
      setLiveOtpError(formatError(err))
    } finally {
      setLiveOtpBusy(false)
    }
  }

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

    const applicantOtp = isApplicant ? (applicantOtpState || loadApplicantOtp(projectId)) : ''
    if (isApplicant && !applicantOtp) return

    let cancelled = false

    const poll = window.setInterval(() => {
      void load(true)
    }, 4000)

    void (async () => {
      try {
        const conn = await connectLotteryHub(projectId, isApplicant ? applicantOtp : undefined, {
          onLobbyCount: (n) => setLiveState((p) => (p ? { ...p, lobbyCount: n } : p)),
          onSxdSupervisorCount: (n) => setLiveState((p) => (p ? { ...p, sxdOnlineCount: n } : p)),
          onStatus: (s) => {
            setLiveState((p) => (p ? { ...p, sessionStatus: s } : p))
            setSchedule((p) => (p ? { ...p, sessionStatus: s } : p))
          },
          onDrawResult: (data) => {
            lotteryAudio.playWinnerFanfare()
            const drawn = parseWinner(data)
            if (drawn && drawn.result !== 'LOST') {
              setLiveState((prev) => {
                const existing = prev?.recentWinners ?? []
                const exists = existing.some((w) => w.applicationId === drawn.applicationId)
                const updated = exists ? existing : [drawn, ...existing]
                const total = prev?.totalUnits ?? schedule?.totalUnits ?? 0
                const drawnCount = updated.length
                return {
                  ...(prev || {
                    projectId,
                    projectName: schedule?.projectName,
                    sessionStatus: 'Live',
                  }),
                  latestDrawResult: drawn,
                  recentWinners: updated,
                  drawnUnitsCount: drawnCount,
                  remainingUnits: total > 0 ? Math.max(0, total - drawnCount) : Math.max(0, (prev?.remainingUnits ?? 1) - 1),
                  priorityWinnersCount: updated.filter((w) => w.result === 'PRIORITY_WON' || (w.priorityGroup && w.priorityGroup !== 'None')).length,
                  randomWinnersCount: updated.filter((w) => w.result === 'WON' || (!w.priorityGroup || w.priorityGroup === 'None')).length,
                }
              })
            }
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
      const res = await fn()
      // Tự động giải mã và nạp ngay kết quả người trúng nếu API trả về chi tiết lượt bốc
      if (res && typeof res === 'object') {
        const drawn = parseWinner(res)
        if (drawn && drawn.result !== 'LOST') {
          setLiveState((prev) => {
            const existing = prev?.recentWinners ?? []
            const exists = existing.some((w) => w.applicationId === drawn.applicationId)
            const updated = exists ? existing : [drawn, ...existing]
            const total = prev?.totalUnits ?? schedule?.totalUnits ?? 0
            const drawnCount = updated.length
            return {
              ...(prev || {
                projectId,
                projectName: schedule?.projectName,
                sessionStatus: 'Live',
              }),
              latestDrawResult: drawn,
              recentWinners: updated,
              drawnUnitsCount: drawnCount,
              remainingUnits: total > 0 ? Math.max(0, total - drawnCount) : Math.max(0, (prev?.remainingUnits ?? 1) - 1),
              priorityWinnersCount: updated.filter((w) => w.result === 'PRIORITY_WON' || (w.priorityGroup && w.priorityGroup !== 'None')).length,
              randomWinnersCount: updated.filter((w) => w.result === 'WON' || (!w.priorityGroup || w.priorityGroup === 'None')).length,
            }
          })
        }
      }
      await load(true)
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
                  {sessionStatus === 'Live' && 'TRỰC TIẾP TỪ TRƯỜNG QUAY'}
                  {sessionStatus === 'WaitingLobby' && 'SẢNH CHỜ MỞ'}
                  {sessionStatus === 'Paused' && 'TẠM DỪNG'}
                  {sessionStatus === 'Finished' && 'KẾT THÚC'}
                  {sessionStatus === 'Published' && 'ĐÃ CÔNG BỐ'}
                  {!sessionStatus && 'CHẾ ĐỘ CHỜ'}
                </span>
              </div>
              <h1 className="mt-0.5 text-lg font-black text-slate-900 sm:text-xl">
                {projectId && (schedule?.projectName ?? liveState?.projectName ?? currentProject?.projectName)
                  ? (schedule?.projectName ?? liveState?.projectName ?? currentProject?.projectName)
                  : 'Sảnh Bốc Thăm Trực Tuyến'}
              </h1>
            </div>
          </div>

          {/* Right: Studio Metric Badges & Utilities */}
          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            {/* Live Time */}
            <span className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 font-mono font-semibold text-slate-700">
              <Clock className="h-3.5 w-3.5 text-slate-500" /> {now.toLocaleTimeString('vi-VN')}
            </span>

            {/* SXD Supervisor Presence */}
            <span className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 font-bold text-emerald-800">
              <Building2 className="h-3.5 w-3.5 text-emerald-600" /> Sở giám sát: {sxdOnline}
            </span>

            {/* Lobby Viewers */}
            <span className="flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 font-bold text-blue-800">
              <Users className="h-3.5 w-3.5 text-blue-600" /> Khán phòng: {lobbyCount}
            </span>

            {/* Realtime Hub Status */}
            {projectId && (
              <span
                className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 font-bold ${hubConnected
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-amber-200 bg-amber-50 text-amber-800'
                  }`}
              >
                {hubConnected ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    KẾT NỐI TRỰC TUYẾN
                  </>
                ) : (
                  'ĐANG ĐỒNG BỘ'
                )}
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
              onClick={() => navigate(isApplicant ? 'my-lottery' : 'lottery-sessions')}
              className="text-xs"
            >
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
              {isApplicant ? 'Về Bốc thăm của tôi' : 'Về quản lý phiên'}
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

      {/* Thông báo khi sảnh ở chế độ chờ */}
      {!projectId && !loading && (
        <Alert variant="info" className="text-xs">
          <strong>Chế độ chờ:</strong> Hiện chưa chọn phiên bốc thăm hoặc chưa có dự án nào đang mở sảnh quay số trực tiếp.
          Theo quy định tại Điều 38 Nghị định số 100/2024/NĐ-CP, chỉ các dự án <strong>đã được Sở Xây dựng phê duyệt lịch bốc thăm</strong> mới hiển thị tại Trường quay trực tiếp. Bạn có thể chuyển sang mục <strong>«{isApplicant ? 'Bốc thăm của tôi' : 'Quản lý phiên'}»</strong> để kiểm tra.
        </Alert>
      )}

      {/* Thông báo thao tác */}
      {msg && <Alert variant={msg.type === 'error' ? 'error' : 'success'}>{msg.text}</Alert>}

      {/* Realtime Hub Error Alert */}
      {hubError && (
        <Alert variant="error">
          Lưu ý kết nối trực tiếp: {hubError}
        </Alert>
      )}

      {/* Main Studio 2-Column Responsive Layout */}
      <div className="grid gap-4 lg:grid-cols-12 items-start">
        {/* Left Column: Live Shuffler Studio & Candidate Balls (Span 7) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <LiveZone
            state={liveState}
            sessionStatus={sessionStatus}
            isDev={isDev}
            eligibleList={eligibleList}
            onDrawNext={() => action('Bốc tiếp', () => lotteryApi.drawNext(projectId))}
            onRunBatch={() => setBatchModalOpen(true)}
            busy={busy === 'Bốc tiếp' || busy === 'Chạy bốc thăm tự động'}
          />
        </div>

        {/* Right Column: Realtime Winners Board, Fund Stats & Operator Deck (Span 5) */}
        <div className="lg:col-span-5 flex flex-col gap-4 sticky top-4">
          <WinnersZone state={liveState} myAppId={myAppId} waitlist={waitlist} />
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
              Hệ thống xáo trộn ngẫu nhiên công khai phần quỹ căn còn lại. Hồ sơ không trúng được xếp danh sách chờ theo hạng. Căn trả lại (hủy hợp đồng / không cọc) đôn người đứng đầu — hạn xác nhận {WAITLIST_CONFIRM_HOURS_DEFAULT} giờ, không mở lại đợt bốc thăm.
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

      {/* Modal xác thực mã vào sảnh cho Người dân */}
      {isApplicant && liveOtpModalOpen && projectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                  <KeyRound className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Xác thực mã vào sảnh
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{currentProject?.projectName || schedule?.projectName || 'Trường quay bốc thăm'}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate('my-lottery')}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="mt-4 text-xs text-slate-600 leading-relaxed dark:text-slate-300">
              Vui lòng nhập mã vào sảnh gồm 6 chữ số (xem trong thông báo hoặc phiếu hẹn bốc thăm) để kết nối và theo dõi trường quay trực tiếp.
            </p>

            {liveOtpError && (
              <Alert variant="error" className="mt-3">
                {liveOtpError}
              </Alert>
            )}

            <form onSubmit={handleLiveOtpSubmit} className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Mã vào sảnh 6 chữ số
                </label>
                <input
                  type="text"
                  autoFocus
                  maxLength={6}
                  value={liveOtpInput}
                  onChange={(e) => {
                    setLiveOtpInput(e.target.value.replace(/\D/g, ''))
                    setLiveOtpError('')
                  }}
                  placeholder="000000"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-center font-mono text-2xl font-bold tracking-widest text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('my-lottery')}
                >
                  Quay lại
                </Button>
                <Button
                  type="submit"
                  variant="accent"
                  size="sm"
                  disabled={liveOtpBusy || liveOtpInput.length < 6}
                >
                  {liveOtpBusy ? 'Đang kết nối…' : 'Xác nhận và vào sảnh'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
