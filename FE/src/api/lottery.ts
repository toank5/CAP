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
  applicationCode?: string | null
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

export function maskCccd(cid: string | null | undefined): string {
  if (!cid) return ''
  if (cid.length < 4) return cid
  return cid.slice(0, 3) + '****' + cid.slice(-4)
}

export function parseCandidate(raw: unknown): LiveNextCandidate | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const id =
    (o.applicationId as string) ??
    (o.ApplicationId as string) ??
    (o.applicantId as string) ??
    (o.ApplicantId as string) ??
    (o.id as string) ??
    (o.Id as string) ??
    ''
  if (!id) return null
  return {
    applicationId: id,
    applicationCode: (o.applicationCode ?? o.ApplicationCode ?? o.code ?? o.Code ?? null) as string | null,
    applicantName: (o.applicantName ?? o.ApplicantName ?? o.fullName ?? o.FullName ?? o.name ?? o.Name ?? null) as string | null,
    citizenId: (o.citizenId ?? o.CitizenId ?? o.idCard ?? o.IdCard ?? null) as string | null,
    priorityGroup: (o.priorityGroup ?? o.PriorityGroup ?? null) as string | null,
  }
}

export function parseWinner(raw: unknown): LiveWinnerEntry | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const id =
    (o.applicationId as string) ??
    (o.ApplicationId as string) ??
    (o.applicantId as string) ??
    (o.ApplicantId as string) ??
    (o.id as string) ??
    (o.Id as string) ??
    (o.code as string) ??
    (o.applicationCode as string) ??
    ''
  if (!id) return null

  const rawResult = str(o.result ?? o.Result ?? o.lotteryResult ?? o.LotteryResult ?? '')
  const slot = (o.slotCode ?? o.SlotCode ?? o.apartmentCode ?? o.ApartmentCode ?? o.unitCode ?? o.UnitCode ?? null) as string | null

  // Phân định chính xác kết quả trúng
  const isWon = rawResult === 'WON' || rawResult === 'PRIORITY_WON' || rawResult === 'WIN' || Boolean(slot)
  const isLost = rawResult === 'LOST' || rawResult === 'FAIL' || rawResult === 'REJECTED' || rawResult === 'WAITLIST'
  const finalResult = isWon ? (rawResult || 'WON') : isLost ? 'LOST' : ''

  return {
    applicationId: id,
    applicationCode: (o.applicationCode ?? o.ApplicationCode ?? o.code ?? o.Code ?? (id.length <= 12 ? id : id.slice(0, 8))) as string | null,
    applicantName:
      (o.applicantName as string) ??
      (o.ApplicantName as string) ??
      (o.fullName as string) ??
      (o.FullName as string) ??
      (o.name as string) ??
      (o.Name as string) ??
      '',
    maskedCitizenId:
      (o.maskedCitizenId as string | null) ??
      (o.MaskedCitizenId as string | null) ??
      maskCccd((o.citizenId as string | undefined) ?? (o.CitizenId as string | undefined) ?? (o.idCard as string | undefined) ?? (o.IdCard as string | undefined)),
    stt: num(o.stt ?? o.STT ?? o.index ?? o.Index),
    result: finalResult,
    slotCode: slot,
    drawnAt: (o.drawnAt ?? o.DrawnAt ?? o.createdAt ?? o.CreatedAt ?? null) as string | null,
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

  const rawWinners = (
    o.recentWinners ??
    o.RecentWinners ??
    o.winners ??
    o.Winners ??
    o.drawResults ??
    o.DrawResults
  ) as unknown[] | undefined

  let winners: LiveWinnerEntry[] = []
  if (Array.isArray(rawWinners) && rawWinners.length > 0) {
    winners = rawWinners
      .map(parseWinner)
      .filter((w): w is LiveWinnerEntry => w !== null && (w.result === 'WON' || w.result === 'PRIORITY_WON' || Boolean(w.slotCode)))
  } else {
    const rawAll = (o.results ?? o.Results ?? o.participants ?? o.Participants ?? o.allEntries ?? o.AllEntries ?? []) as unknown[]
    if (Array.isArray(rawAll)) {
      winners = rawAll
        .map(parseWinner)
        .filter((w): w is LiveWinnerEntry => w !== null && (w.result === 'WON' || w.result === 'PRIORITY_WON' || Boolean(w.slotCode)))
    }
  }

  const totalUnits = num(o.totalUnits ?? o.TotalUnits)
  if (totalUnits > 0 && winners.length > totalUnits) {
    winners = winners.slice(0, totalUnits)
  }

  const drawnUnitsCount = num(o.drawnUnitsCount ?? o.DrawnUnitsCount ?? o.drawnCount) || winners.length
  const remainingUnits =
    num(o.remainingUnits ?? o.RemainingUnits) ||
    (totalUnits > 0 ? Math.max(0, totalUnits - drawnUnitsCount) : 0)

  const priorityWinnersCount =
    num(o.priorityWinnersCount ?? o.PriorityWinnersCount) ||
    winners.filter((w) => w.result === 'PRIORITY_WON' || (w.priorityGroup && w.priorityGroup !== 'None')).length

  const randomWinnersCount =
    num(o.randomWinnersCount ?? o.RandomWinnersCount) ||
    winners.filter((w) => w.result === 'WON' || (!w.priorityGroup || w.priorityGroup === 'None')).length

  const apartmentFundStats = (
    o.apartmentFundStats ??
    o.ApartmentFundStats ??
    o.fundStats ??
    []
  ) as unknown[]

  const latest =
    parseWinner(o.latestDrawResult ?? o.LatestDrawResult ?? o.latestResult ?? o.LatestResult) ||
    (winners.length > 0 ? winners[0] : null)

  return {
    projectId: str(o.projectId ?? o.ProjectId) || undefined,
    projectName: (o.projectName ?? o.ProjectName ?? null) as string | null,
    developerName: (o.developerName ?? o.DeveloperName ?? null) as string | null,
    sessionStatus: str(o.sessionStatus ?? o.SessionStatus) || undefined,
    totalUnits,
    drawnUnitsCount,
    remainingUnits,
    totalEligibleParticipants: num(o.totalEligibleParticipants ?? o.TotalEligibleParticipants),
    sxdOnlineCount: num(o.sxdOnlineCount ?? o.SxdOnlineCount ?? o.sxdOnline ?? o.SxdOnline),
    lobbyCount: num(o.lobbyCount ?? o.LobbyCount),
    priorityWinnersCount,
    randomWinnersCount,
    undrawnParticipantsCount: num(o.undrawnParticipantsCount ?? o.UndrawnParticipantsCount),
    winRatePercentage: num(o.winRatePercentage ?? o.WinRatePercentage),
    nextCandidate: parseCandidate(o.nextCandidate ?? o.NextCandidate ?? o.candidate ?? o.Candidate),
    latestDrawResult: latest,
    recentWinners: winners,
    projectApartmentFundStat: parseFund(o.projectApartmentFundStat ?? o.ProjectApartmentFundStat ?? o.totalFund ?? {}),
    apartmentFundStats: Array.isArray(apartmentFundStats) ? apartmentFundStats.map(parseFund) : [],
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

  /** Lấy danh sách dự bị (Waitlist) theo dự án và loại căn */
  getWaitlist(projectId: string, desiredApartmentTypeId?: string) {
    const qs = desiredApartmentTypeId ? `?desiredApartmentTypeId=${encodeURIComponent(desiredApartmentTypeId)}` : ''
    return request<WaitlistEntryDto[] | ApiResult>(`/api/projects/${projectId}/lottery/waitlist${qs}`, { auth: true })
  },

  /** Đôn ứng viên đứng đầu danh sách chờ (Waitlist #1) lên quyền mua chính thức */
  promoteWaitlist(projectId: string, desiredApartmentTypeId?: string) {
    const qs = desiredApartmentTypeId ? `?desiredApartmentTypeId=${encodeURIComponent(desiredApartmentTypeId)}` : ''
    return request<ApiResult>(`/api/projects/${projectId}/lottery/promote-waitlist${qs}`, {
      method: 'POST',
      auth: true,
    })
  },

  minutesUrl(projectId: string) {
    const base = import.meta.env.VITE_API_BASE_URL ?? ''
    return `${base}/api/projects/${projectId}/lottery/minutes.pdf`
  },

  async downloadMinutesBlob(projectId: string): Promise<void> {
    const token = sessionStorage.getItem('accessToken')
    const res = await fetch(
      `${import.meta.env.VITE_API_BASE_URL ?? ''}/api/projects/${projectId}/lottery/minutes.pdf`,
      { headers: token ? { Authorization: `Bearer ${token}` } : {} },
    )
    if (!res.ok) throw new Error(`Không tải được biên bản PDF (HTTP ${res.status})`)
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `BienBan_BocTham_${projectId.slice(0, 8)}.pdf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  },
}

export interface WaitlistEntryDto {
  applicationId: string
  applicantName: string
  citizenId: string
  phoneNumber?: string
  waitlistRank: number
  score?: number
  apartmentTypeName?: string
  desiredApartmentTypeId?: string
  depositDeadline?: string | null
  status?: string
}

export function parseWaitlist(data: unknown): WaitlistEntryDto[] {
  const mapItem = (it: unknown, idx: number): WaitlistEntryDto => {
    const x = (it && typeof it === 'object' ? it : {}) as Record<string, unknown>
    return {
      applicationId: String(x.applicationId ?? x.ApplicationId ?? ''),
      applicantName: String(x.applicantName ?? x.ApplicantName ?? x.fullName ?? x.FullName ?? ''),
      citizenId: String(x.citizenId ?? x.CitizenId ?? ''),
      phoneNumber: (x.phoneNumber ?? x.PhoneNumber) as string | undefined,
      waitlistRank: Number(x.waitlistRank ?? x.WaitlistRank ?? x.rank ?? x.Rank ?? idx + 1),
      score: x.score != null ? Number(x.score ?? x.Score) : undefined,
      apartmentTypeName: (x.apartmentTypeName ?? x.ApartmentTypeName ?? x.unitType ?? x.UnitType) as string | undefined,
      desiredApartmentTypeId: (x.desiredApartmentTypeId ?? x.DesiredApartmentTypeId) as string | undefined,
      depositDeadline: (x.depositDeadline ?? x.DepositDeadline) as string | null | undefined,
      status: (x.status ?? x.Status ?? 'WAITLIST') as string | undefined,
    }
  }
  let list: WaitlistEntryDto[] = []
  if (Array.isArray(data)) {
    list = data.map(mapItem)
  } else if (data && typeof data === 'object') {
    const o = data as Record<string, unknown>
    const items = o.items ?? o.Items ?? o.data ?? o.Data ?? o.waitlist ?? o.Waitlist
    if (Array.isArray(items)) list = items.map(mapItem)
  }
  return list.sort((a, b) => a.waitlistRank - b.waitlistRank)
}


export const LOTTERY_STATUS_LABEL: Record<string, string> = {
  NOT_SCHEDULED: 'Chưa lên lịch',
  SCHEDULED: 'Đã lên lịch (chờ Sở)',
  AWAITING_APPROVAL: 'Chờ Sở phê duyệt',
  APPROVED: 'Đã duyệt — chờ mở sảnh',
  RUNNING: 'Đang quay số',
  Paused: 'Tạm dừng',
  FINISHED: 'Đã kết thúc',
  Scheduled: 'Đã lên lịch',
  WaitingLobby: 'Sảnh chờ',
  Live: 'Đang quay số',
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

  const rawParticipants = (
    src.participants ??
    src.Participants ??
    src.results ??
    src.Results ??
    src.drawResults ??
    src.DrawResults ??
    src.allEntries ??
    src.AllEntries ??
    src.items ??
    src.Items ??
    []
  ) as Array<Record<string, unknown>>

  const rawWinners = (src.winners ?? src.Winners ?? []) as Array<Record<string, unknown>>
  const rawLosers = (src.losers ?? src.Losers ?? []) as Array<Record<string, unknown>>

  const mapEntry = (p: Record<string, unknown>): LotteryEligibleEntry => ({
    applicationId: String(p.applicationId ?? p.ApplicationId ?? p.applicantId ?? p.ApplicantId ?? p.id ?? p.Id ?? ''),
    applicantName: String(p.fullName ?? p.FullName ?? p.applicantName ?? p.ApplicantName ?? p.name ?? p.Name ?? ''),
    citizenId: String(p.citizenId ?? p.CitizenId ?? p.idCard ?? p.IdCard ?? ''),
    lotteryResult: String(p.result ?? p.Result ?? p.lotteryResult ?? p.LotteryResult ?? (p.isWinner ? 'WON' : '')),
    slotCode: (p.slotCode ?? p.SlotCode ?? p.apartmentCode ?? p.ApartmentCode ?? null) as string | null,
    priorityGroup: (p.priorityGroup ?? p.PriorityGroup ?? null) as string | null,
  })

  let allMapped: LotteryEligibleEntry[] = []
  if (Array.isArray(rawParticipants) && rawParticipants.length > 0) {
    allMapped = rawParticipants.map(mapEntry)
  }

  let mappedWinners: LotteryEligibleEntry[] = []
  if (Array.isArray(rawWinners) && rawWinners.length > 0) {
    mappedWinners = rawWinners.map(mapEntry)
  } else if (allMapped.length > 0) {
    mappedWinners = allMapped.filter((m) => m.lotteryResult === 'WON' || m.lotteryResult === 'PRIORITY_WON' || (m.slotCode && m.lotteryResult !== 'LOST'))
  }

  let mappedLosers: LotteryEligibleEntry[] = []
  if (Array.isArray(rawLosers) && rawLosers.length > 0) {
    mappedLosers = rawLosers.map(mapEntry)
  } else if (allMapped.length > 0) {
    mappedLosers = allMapped.filter((m) => m.lotteryResult === 'LOST')
  }

  const parsedTotalUnits = Number(src.totalUnits ?? src.TotalUnits ?? src.availableUnits ?? src.AvailableUnits ?? 0)
  let finalWinners = mappedWinners
  let finalLosers = mappedLosers

  if (parsedTotalUnits > 0 && finalWinners.length > parsedTotalUnits) {
    const excess: LotteryEligibleEntry[] = finalWinners.slice(parsedTotalUnits).map((w) => ({
      ...w,
      lotteryResult: 'LOST',
      slotCode: null,
    }))
    finalWinners = finalWinners.slice(0, parsedTotalUnits)
    finalLosers = [...excess, ...finalLosers]
  }

  return {
    projectId: String(src.projectId ?? src.ProjectId ?? ''),
    drawId: src.drawId ? String(src.drawId) : src.DrawId ? String(src.DrawId) : undefined,
    drawnAt: (src.drawnAt ?? src.DrawnAt ?? src.runAt ?? src.RunAt) as string | null,
    totalUnits: parsedTotalUnits,
    winners: finalWinners,
    losers: finalLosers,
    allEntries: allMapped.length > 0 ? allMapped : finalWinners.concat(finalLosers),
    participants: allMapped.length > 0 ? allMapped : finalWinners.concat(finalLosers),
  }
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
    notes: (o.notes ?? o.Notes) as string | null,
    sessionStatus: (o.sessionStatus ?? o.SessionStatus) as string | undefined,
    joinCode: (o.joinCode ?? o.JoinCode) as string | null,
    sxdOnlineCount: (o.sxdOnlineCount ?? o.SxdOnlineCount ?? 0) as number,
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
  let list: unknown[] = []
  if (Array.isArray(data)) list = data
  else if (data && typeof data === 'object') {
    const o = data as Record<string, unknown>
    const items = o.items ?? o.Items ?? o.data ?? o.Data ?? o.participants ?? o.Participants ?? o.eligibleParticipants
    if (Array.isArray(items)) list = items
  }
  return list
    .map((p) => {
      if (!p || typeof p !== 'object') return { applicationId: '', applicantName: '', citizenId: '' }
      const o = p as Record<string, unknown>
      return {
        applicationId: String(o.applicationId ?? o.ApplicationId ?? o.applicantId ?? o.ApplicantId ?? o.id ?? o.Id ?? ''),
        applicantId: String(o.applicantId ?? o.ApplicantId ?? ''),
        applicantName: String(o.applicantName ?? o.ApplicantName ?? o.fullName ?? o.FullName ?? o.name ?? o.Name ?? ''),
        citizenId: String(o.citizenId ?? o.CitizenId ?? o.idCard ?? o.IdCard ?? ''),
        priorityGroup: (o.priorityGroup ?? o.PriorityGroup ?? null) as string | null,
        applicationStatus: String(o.applicationStatus ?? o.ApplicationStatus ?? o.status ?? o.Status ?? ''),
        priorityScore: Number(o.priorityScore ?? o.PriorityScore ?? 0),
        lotteryResult: (o.lotteryResult ?? o.LotteryResult ?? o.result ?? o.Result ?? null) as string | null,
        slotCode: (o.slotCode ?? o.SlotCode ?? o.apartmentCode ?? o.ApartmentCode ?? null) as string | null,
      }
    })
    .filter((e) => e.applicationId || e.applicantName)
}

export const parseLotterySession = parseLotteryResult
export const parseLotterySessions = parseEligibleList
export type LotterySessionDto = LotteryResultDto
export type LotterySessionStatusAlias = LotteryScheduleStatus | string
