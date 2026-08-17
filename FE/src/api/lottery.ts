import { request } from './http'
import type { ApiResult } from '../types'

/**
 * Lottery API — khớp BE project-based + FSM phiên live.
 */

export type LotterySessionStatus =
  | 'Scheduled'
  | 'WaitingLobby'
  | 'Live'
  | 'Finished'
  | 'Published'
  | string

export type LotteryScheduleStatus =
  | 'NOT_SCHEDULED'
  | 'SCHEDULED'
  | 'AWAITING_APPROVAL'
  | 'APPROVED'
  | 'RUNNING'
  | 'FINISHED'
  | LotterySessionStatus

export interface LotteryScheduleDto {
  projectId: string
  projectName?: string
  scheduledAt?: string | null
  lotteryDate?: string | null
  lotteryLocation?: string | null
  lotteryType?: string | null
  lotteryDescription?: string | null
  totalUnits?: number | null
  availableUnits?: number | null
  status: LotteryScheduleStatus | string
  sessionStatus?: string | null
  joinCode?: string | null
  sxdOnlineCount?: number
  supervisorId?: string | null
  supervisorName?: string | null
  isLotteryApproved?: boolean | null
  approvedAt?: string | null
  lotteryApprovedAt?: string | null
  notes?: string | null
  totalEligibleParticipants?: number
}

export interface LotteryEligibleEntry {
  applicationId: string
  applicantId?: string
  applicantName: string
  citizenId: string
  priorityGroup?: string | null
  applicationStatus?: string
  priorityScore?: number
  lotteryResult?: string | null
  slotCode?: string | null
}

export interface LotteryResultDto {
  projectId: string
  projectName?: string
  drawId?: string
  totalUnits?: number
  runAt?: string | null
  drawnAt?: string | null
  winners: LotteryEligibleEntry[]
  losers?: LotteryEligibleEntry[]
  allEntries?: LotteryEligibleEntry[]
  participants?: Array<LotteryEligibleEntry>
  notes?: string | null
}

export interface ScheduleLotteryInput {
  lotteryDate: string
  lotteryLocation: string
  lotteryType?: string
  lotteryDescription?: string
  totalUnits?: number
  /** alias cũ FE */
  scheduledAt?: string
  notes?: string
}

export interface LiveDrawEvent {
  projectId?: string
  applicationId?: string
  applicantName?: string
  citizenId?: string
  result?: string
  slotCode?: string | null
  remainingUnits?: number
  drawnAt?: string
}

/** 1 hồ sơ trúng — hiện trên khu 2 (recentWinners) */
export interface LiveWinnerEntry {
  applicationId: string
  applicationCode?: string | null
  applicantName: string
  maskedCitizenId?: string | null
  stt?: number
  result?: string
  slotCode?: string | null
  drawnAt?: string | null
  remainingUnits?: number | null
  priorityGroup?: string | null
}

/** 1 loại căn — hiện trên khu 3 (apartmentFundStats) */
export interface ApartmentFundEntry {
  categoryName?: string | null
  totalUnits?: number | null
  remainingUnits?: number | null
  assignedUnits?: number | null
  remainingPercentage?: number | null
}

/** Trạng thái đang quay — hiện trên khu 1 */
export interface LiveNextCandidate {
  applicationId: string
  applicationCode?: string | null
  applicantName?: string | null
  citizenId?: string | null
  priorityGroup?: string | null
}

/** Kết quả vừa bốc — hiện trên khu 1 */
export interface LiveLatestResult {
  applicationId: string
  applicationCode?: string | null
  applicantName?: string | null
  maskedCitizenId?: string | null
  stt?: number | null
  result?: string
  slotCode?: string | null
  drawnAt?: string | null
  remainingUnits?: number | null
  priorityGroup?: string | null
}

/** LiveState — nguồn sự thật cho sảnh Live */
export interface LiveStateDto {
  projectId?: string
  projectName?: string | null
  developerName?: string | null
  sessionStatus?: string | null
  totalUnits?: number | null
  drawnUnitsCount?: number | null
  remainingUnits?: number | null
  totalEligibleParticipants?: number | null
  sxdOnlineCount?: number | null
  lobbyCount?: number | null
  priorityWinnersCount?: number | null
  randomWinnersCount?: number | null
  undrawnParticipantsCount?: number | null
  winRatePercentage?: number | null
  nextCandidate?: LiveNextCandidate | null
  latestDrawResult?: LiveLatestResult | null
  recentWinners?: LiveWinnerEntry[]
  projectApartmentFundStat?: ApartmentFundEntry | null
  apartmentFundStats?: ApartmentFundEntry[]
}

function str(v: unknown): string {
  return v == null ? '' : String(v)
}

function num(v: unknown): number {
  return Number(v) || 0
}

function maskCccd(cid: string | null | undefined): string {
  if (!cid) return ''
  if (cid.length < 4) return cid
  return cid.slice(0, 3) + '****' + cid.slice(-4)
}

function parseCandidate(raw: unknown): LiveNextCandidate | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const id =
    (o.applicationId as string) ??
    (o.ApplicationId as string) ??
    (o.applicantId as string) ??
    (o.ApplicantId as string) ??
    ''
  if (!id) return null
  return {
    applicationId: id,
    applicationCode: (o.applicationCode ?? o.ApplicationCode ?? null) as string | null,
    applicantName: (o.applicantName ?? o.ApplicantName ?? null) as string | null,
    citizenId: (o.citizenId ?? o.CitizenId ?? null) as string | null,
    priorityGroup: (o.priorityGroup ?? o.PriorityGroup ?? null) as string | null,
  }
}

function parseWinner(raw: unknown): LiveWinnerEntry | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const id =
    (o.applicationId as string) ??
    (o.ApplicationId as string) ??
    ''
  if (!id) return null
  return {
    applicationId: id,
    applicationCode: (o.applicationCode ?? o.ApplicationCode ?? null) as string | null,
    applicantName:
      (o.applicantName as string) ??
      (o.ApplicantName as string) ??
      (o.fullName as string) ??
      (o.FullName as string) ??
      '',
    maskedCitizenId:
      (o.maskedCitizenId as string | null) ??
      (o.MaskedCitizenId as string | null) ??
      maskCccd(o.citizenId as string | undefined ?? o.CitizenId as string | undefined),
    stt: num(o.stt ?? o.STT ?? o.index ?? o.Index),
    result: str(o.result ?? o.Result ?? o.lotteryResult ?? o.LotteryResult),
    slotCode: (o.slotCode ?? o.SlotCode ?? null) as string | null,
    drawnAt: (o.drawnAt ?? o.DrawnAt ?? null) as string | null,
    remainingUnits:
      (o.remainingUnits ?? o.RemainingUnits ?? null) as number | null,
    priorityGroup: (o.priorityGroup ?? o.PriorityGroup ?? null) as string | null,
  }
}

function parseFund(raw: unknown): ApartmentFundEntry {
  if (!raw || typeof raw !== 'object') return {}
  const o = raw as Record<string, unknown>
  return {
    categoryName: (o.categoryName ?? o.CategoryName ?? o.unitType ?? o.UnitType ?? null) as string | null,
    totalUnits: num(o.totalUnits ?? o.TotalUnits),
    remainingUnits: num(o.remainingUnits ?? o.RemainingUnits),
    assignedUnits: num(o.assignedUnits ?? o.AssignedUnits),
    remainingPercentage: num(o.remainingPercentage ?? o.RemainingPercentage),
  }
}

export function parseLiveState(raw: unknown): LiveStateDto | null {
  if (!raw || typeof raw !== 'object') return null
  const o0 = raw as Record<string, unknown>
  const nested = o0.data ?? o0.Data
  const o = (nested && typeof nested === 'object' ? nested : o0) as Record<string, unknown>

  const recentWinners = (
    o.recentWinners ??
    o.RecentWinners ??
    o.winners ??
    o.Winners ??
    []
  ) as unknown[]
  const apartmentFundStats = (
    o.apartmentFundStats ??
    o.ApartmentFundStats ??
    o.fundStats ??
    []
  ) as unknown[]

  return {
    projectId: str(o.projectId ?? o.ProjectId) || undefined,
    projectName: (o.projectName ?? o.ProjectName ?? null) as string | null,
    developerName: (o.developerName ?? o.DeveloperName ?? null) as string | null,
    sessionStatus: str(o.sessionStatus ?? o.SessionStatus) || undefined,
    totalUnits: num(o.totalUnits ?? o.TotalUnits),
    drawnUnitsCount: num(o.drawnUnitsCount ?? o.DrawnUnitsCount ?? o.drawnCount),
    remainingUnits: num(o.remainingUnits ?? o.RemainingUnits),
    totalEligibleParticipants: num(o.totalEligibleParticipants ?? o.TotalEligibleParticipants),
    sxdOnlineCount: num(o.sxdOnlineCount ?? o.SxdOnlineCount ?? o.sxdOnline ?? o.SxdOnline),
    lobbyCount: num(o.lobbyCount ?? o.LobbyCount),
    priorityWinnersCount: num(o.priorityWinnersCount ?? o.PriorityWinnersCount),
    randomWinnersCount: num(o.randomWinnersCount ?? o.RandomWinnersCount),
    undrawnParticipantsCount: num(o.undrawnParticipantsCount ?? o.UndrawnParticipantsCount),
    winRatePercentage: num(o.winRatePercentage ?? o.WinRatePercentage),
    nextCandidate: parseCandidate(o.nextCandidate ?? o.NextCandidate ?? o.candidate ?? o.Candidate),
    latestDrawResult: parseWinner(
      o.latestDrawResult ?? o.LatestDrawResult ?? o.latestResult ?? o.LatestResult,
    ),
    recentWinners: recentWinners.map(parseWinner).filter((w): w is LiveWinnerEntry => w !== null),
    projectApartmentFundStat: parseFund(o.projectApartmentFundStat ?? o.ProjectApartmentFundStat ?? o.totalFund ?? {}),
    apartmentFundStats: apartmentFundStats.map(parseFund),
  }
}

function mapSessionToUiStatus(o: Record<string, unknown>): string {
  const session = String(o.sessionStatus ?? o.SessionStatus ?? '')
  const approved = o.isLotteryApproved ?? o.IsLotteryApproved
  // Giữ session FSM rõ trên list (WaitingLobby ≠ generic APPROVED)
  if (session === 'Live') return 'RUNNING'
  if (session === 'WaitingLobby') return 'WaitingLobby'
  if (session === 'Finished') return 'Finished'
  if (session === 'Published') return 'Published'
  if (session === 'Scheduled' && approved === true) return 'APPROVED'
  if (approved === true) return 'APPROVED'
  if (approved === false && (o.lotteryDate || o.LotteryDate)) return 'SCHEDULED'
  if (o.lotteryDate || o.LotteryDate) return 'AWAITING_APPROVAL'
  return 'NOT_SCHEDULED'
}

export const lotteryApi = {
  schedule(projectId: string, body: ScheduleLotteryInput) {
    const lotteryDate = body.lotteryDate || body.scheduledAt || ''
    return request<ApiResult>(`/api/projects/${projectId}/lottery/schedule`, {
      method: 'POST',
      body: JSON.stringify({
        lotteryDate,
        lotteryLocation: body.lotteryLocation || body.notes || 'Hội trường / Zoom (demo)',
        lotteryType: body.lotteryType || 'ONLINE',
        lotteryDescription: body.lotteryDescription || body.notes || undefined,
        totalUnits: body.totalUnits,
      }),
      auth: true,
    })
  },

  approveSchedule(projectId: string) {
    return request<ApiResult>(`/api/projects/${projectId}/lottery/schedule/approve`, {
      method: 'POST',
      auth: true,
    })
  },

  getSchedule(projectId: string) {
    return request<LotteryScheduleDto>(`/api/projects/${projectId}/lottery/schedule`, { auth: false })
  },

  getEligibleParticipants(projectId: string) {
    return request<LotteryEligibleEntry[]>(
      `/api/projects/${projectId}/lottery/eligible-participants`,
      { auth: true },
    )
  },

  drawUnit(projectId: string) {
    return request<ApiResult>(`/api/projects/${projectId}/lottery/draw-unit`, {
      method: 'POST',
      auth: true,
    })
  },

  runLottery(projectId: string, totalUnits?: number) {
    return request<LotteryResultDto>(`/api/projects/${projectId}/lottery/run`, {
      method: 'POST',
      body: JSON.stringify(totalUnits != null ? { totalUnits } : {}),
      auth: true,
    })
  },

  getResult(projectId: string) {
    return request<LotteryResultDto>(`/api/projects/${projectId}/lottery/result`, { auth: true })
  },

  openLobby(projectId: string) {
    return request<LotteryScheduleDto>(`/api/projects/${projectId}/lottery/session/open-lobby`, {
      method: 'POST',
      auth: true,
    })
  },

  startLive(projectId: string) {
    return request<LotteryScheduleDto>(`/api/projects/${projectId}/lottery/session/start`, {
      method: 'POST',
      auth: true,
    })
  },

  finishSession(projectId: string) {
    return request<LotteryScheduleDto>(`/api/projects/${projectId}/lottery/session/finish`, {
      method: 'POST',
      auth: true,
    })
  },

  publishSession(projectId: string) {
    return request<LotteryScheduleDto>(`/api/projects/${projectId}/lottery/session/publish`, {
      method: 'POST',
      auth: true,
    })
  },

  pauseSession(projectId: string) {
    return request<LotteryScheduleDto>(`/api/projects/${projectId}/lottery/session/pause`, {
      method: 'POST',
      auth: true,
    })
  },

  resumeSession(projectId: string) {
    return request<LotteryScheduleDto>(`/api/projects/${projectId}/lottery/session/resume`, {
      method: 'POST',
      auth: true,
    })
  },

  drawNext(projectId: string) {
    return request<LotteryScheduleDto>(`/api/projects/${projectId}/lottery/draw-next`, {
      method: 'POST',
      auth: true,
    })
  },

  getLiveState(projectId: string) {
    return request<LiveStateDto>(`/api/projects/${projectId}/lottery/live-state`, { auth: false })
  },

  verifyOtp(projectId: string, joinCode: string) {
    return request<{ success: boolean; message: string; sessionStatus?: string }>(
      `/api/projects/${projectId}/lottery/session/verify-otp`,
      {
        method: 'POST',
        body: JSON.stringify({ joinCode }),
        auth: true,
      },
    )
  },

  minutesUrl(projectId: string) {
    const base = import.meta.env.VITE_API_BASE_URL ?? ''
    return `${base}/api/projects/${projectId}/lottery/minutes.pdf`
  },
}

export const LOTTERY_STATUS_LABEL: Record<string, string> = {
  NOT_SCHEDULED: 'Chưa lên lịch',
  SCHEDULED: 'Đã lên lịch (chờ Sở)',
  AWAITING_APPROVAL: 'Chờ Sở phê duyệt',
  APPROVED: 'Đã duyệt — chờ mở sảnh',
  RUNNING: 'Đang Live',
  Paused: 'Tạm dừng',
  FINISHED: 'Đã kết thúc',
  Scheduled: 'Đã lên lịch',
  WaitingLobby: 'Sảnh chờ',
  Live: 'Đang Live',
  Finished: 'Đã kết thúc — chờ công bố',
  Published: 'Đã công bố',
}

export const LOTTERY_STATUS_TONE: Record<
  string,
  'default' | 'success' | 'warning' | 'danger' | 'secondary'
> = {
  NOT_SCHEDULED: 'secondary',
  SCHEDULED: 'warning',
  AWAITING_APPROVAL: 'warning',
  APPROVED: 'default',
  RUNNING: 'warning',
  Paused: 'warning',
  FINISHED: 'success',
  WaitingLobby: 'default',
  Live: 'warning',
  Finished: 'success',
  Published: 'success',
  Scheduled: 'warning',
}

export function parseLotteryResult(data: unknown): LotteryResultDto | null {
  if (!data || typeof data !== 'object') return null
  const o = data as Record<string, unknown>
  const nested = (o.data ?? o.Data) as Record<string, unknown> | undefined
  const src = nested && typeof nested === 'object' ? nested : o

  const participants = (src.participants ?? src.Participants) as
    | Array<Record<string, unknown>>
    | undefined

  if (Array.isArray(participants)) {
    const mapped = participants.map((p) => ({
      applicationId: String(p.applicationId ?? p.ApplicationId ?? ''),
      applicantName: String(p.fullName ?? p.FullName ?? p.applicantName ?? ''),
      citizenId: String(p.citizenId ?? p.CitizenId ?? ''),
      lotteryResult: String(p.result ?? p.Result ?? ''),
      slotCode: (p.slotCode ?? p.SlotCode) as string | null,
    }))
    return {
      projectId: String(src.projectId ?? src.ProjectId ?? ''),
      drawId: src.drawId ? String(src.drawId) : src.DrawId ? String(src.DrawId) : undefined,
      drawnAt: (src.drawnAt ?? src.DrawnAt) as string | null,
      totalUnits: Number(src.totalUnits ?? src.TotalUnits ?? 0),
      winners: mapped.filter((m) => m.lotteryResult === 'WON' || m.lotteryResult === 'PRIORITY_WON'),
      losers: mapped.filter((m) => m.lotteryResult === 'LOST'),
      allEntries: mapped,
      participants: mapped,
    }
  }

  return src as unknown as LotteryResultDto
}

export function parseLotterySchedule(data: unknown): LotteryScheduleDto | null {
  if (!data || typeof data !== 'object') return null
  const o0 = data as Record<string, unknown>
  const nested = o0.data ?? o0.Data
  const o = (nested && typeof nested === 'object' ? nested : o0) as Record<string, unknown>

  const lotteryDate = (o.lotteryDate ?? o.LotteryDate ?? o.scheduledAt) as string | null
  const availableUnits = Number(o.availableUnits ?? o.AvailableUnits ?? o.totalUnits ?? 0)
  return {
    projectId: String(o.projectId ?? o.ProjectId ?? ''),
    projectName: (o.projectName ?? o.ProjectName) as string | undefined,
    scheduledAt: lotteryDate,
    lotteryDate,
    lotteryLocation: (o.lotteryLocation ?? o.LotteryLocation) as string | null,
    lotteryType: (o.lotteryType ?? o.LotteryType) as string | null,
    lotteryDescription: (o.lotteryDescription ?? o.LotteryDescription) as string | null,
    totalUnits: availableUnits,
    availableUnits,
    isLotteryApproved: (o.isLotteryApproved ?? o.IsLotteryApproved) as boolean | null,
    approvedAt: (o.lotteryApprovedAt ?? o.LotteryApprovedAt ?? o.approvedAt) as string | null,
    lotteryApprovedAt: (o.lotteryApprovedAt ?? o.LotteryApprovedAt) as string | null,
    sessionStatus: (o.sessionStatus ?? o.SessionStatus) as string | null,
    joinCode: (o.joinCode ?? o.JoinCode) as string | null,
    sxdOnlineCount: Number(o.sxdOnlineCount ?? o.SxdOnlineCount ?? 0),
    supervisorId: (() => {
      const v = o.supervisorId ?? o.SupervisorId
      return v == null ? null : String(v)
    })(),
    supervisorName: (o.supervisorName ?? o.SupervisorName) as string | null,
    totalEligibleParticipants: Number(o.totalEligibleParticipants ?? o.TotalEligibleParticipants ?? 0),
    status: mapSessionToUiStatus(o),
  }
}

export function parseEligibleList(data: unknown): LotteryEligibleEntry[] {
  if (Array.isArray(data)) return data as LotteryEligibleEntry[]
  if (data && typeof data === 'object') {
    const o = data as Record<string, unknown>
    const items = o.items ?? o.Items ?? o.data ?? o.Data
    if (Array.isArray(items)) return items as LotteryEligibleEntry[]
  }
  return []
}

export const parseLotterySession = parseLotteryResult
export const parseLotterySessions = parseEligibleList
export type LotterySessionDto = LotteryResultDto
export type LotterySessionStatusAlias = LotteryScheduleStatus | string
