import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Calendar, ExternalLink, KeyRound, Sparkles, Trophy, X } from 'lucide-react'
import {
  lotteryApi,
  LOTTERY_STATUS_LABEL,
  LOTTERY_STATUS_TONE,
  parseLotteryResult,
  parseLotterySchedule,
  type LotteryResultDto,
  type LotteryScheduleDto,
} from '@/api/lottery'
import { housingProjectsApi } from '@/api/housing-projects'
import { housingApplicationsApi, parsePagedApplications } from '@/api/housing-applications'
import type { ApplicationSummaryDto } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { PageCard } from '@/components/layout/page-header'
import { navigate } from '@/hooks/useHashRoute'
import { formatError } from '@/lib/format-error'
import { LOTTERY_RESULT_LABELS } from '@/lib/constants'
import { getRole } from '@/router'

interface Row {
  application: ApplicationSummaryDto
  schedule: LotteryScheduleDto | null
  result: LotteryResultDto | null
}

export function MyLotteryPage() {
  const [rows, setRows] = useState<Row[]>([])
  // Phiên đang Live công khai (mọi dự án có lịch mở sảnh) — hiển thị cho Applicant
  // kể cả khi chưa có hồ sơ APPROVED, để dân ở ngoài vẫn vào xem tiếp (NĐ 100/2024 Đ36).
  const [publicLive, setPublicLive] = useState<LotteryScheduleDto[]>([])
  const [publicLoading, setPublicLoading] = useState(true)
  const myProjectIds = useMemo(() => new Set(rows.map((r) => r.application.projectId)), [rows])
  const otherPublicLive = useMemo(
    () => publicLive.filter((sd) => !myProjectIds.has(sd.projectId)),
    [publicLive, myProjectIds],
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [verifyModal, setVerifyModal] = useState<{
    open: boolean
    projectId: string
    projectName: string
    code: string
    error?: string
    busy?: boolean
  } | null>(null)

  const loadPublicLive = async () => {
    setPublicLoading(true)
    try {
      const data = await housingProjectsApi.list({ pageIndex: 1, pageSize: 50 })
      const raw = data && typeof data === 'object' ? (data as Record<string, unknown>) : {}
      const list = (raw.items ?? raw.Items ?? []) as { id: string; projectName: string; status?: string }[]
      // Lấy schedule từng dự án; chỉ giữ phiên đang Live / Sảnh chờ / Tạm dừng
      const sessions = await Promise.all(
        list.map(async (p) => {
          try {
            const sd = parseLotterySchedule(await lotteryApi.getSchedule(p.id))
            if (!sd) return null
            const s = String(sd.status ?? '').toUpperCase()
            const open = s === 'LIVE' || s === 'RUNNING' || s === 'PAUSED' || s === 'WAITINGLOBBY'
            return open ? sd : null
          } catch {
            return null
          }
        }),
      )
      setPublicLive(sessions.filter((s): s is LotteryScheduleDto => s !== null))
    } catch {
      setPublicLive([])
    } finally {
      setPublicLoading(false)
    }
  }

  const load = async () => {
    setLoading(true)
    setError('')
    setInfo('')
    try {
      const data = await housingApplicationsApi.getMy({ pageIndex: 1, pageSize: 50 })
      const apps = parsePagedApplications(data)
      // Hiện hồ sơ đã duyệt hoặc trúng (CONTRACT_PENDING) hoặc trượt bốc (LOTTERY_LOST)
      const eligible = apps.filter((a) => {
        const s = String(a.applicationStatus || '').toUpperCase()
        return (
          s === 'APPROVED' ||
          s === 'APPROVED_BY_TIMEOUT' ||
          s === 'PROPOSED' ||
          s === 'CONTRACT_PENDING' ||
          s === 'LOTTERY_LOST'
        )
      })
      if (eligible.length === 0) {
        setRows([])
        setInfo(
          apps.length === 0
            ? 'Bạn chưa có hồ sơ nào. Hãy tạo và nộp hồ sơ trước khi tham gia bốc thăm.'
            : 'Chưa có hồ sơ nào đủ điều kiện. Hồ sơ cần được Sở duyệt trước khi vào sảnh.',
        )
        return
      }

      const enriched: Row[] = await Promise.all(
        eligible.map(async (app) => {
          let schedule: LotteryScheduleDto | null = null
          let result: LotteryResultDto | null = null
          try {
            schedule = parseLotterySchedule(await lotteryApi.getSchedule(app.projectId))
          } catch {
            schedule = null
          }
          try {
            result = parseLotteryResult(await lotteryApi.getResult(app.projectId))
          } catch {
            result = null
          }
          return { application: app, schedule, result }
        }),
      )
      setRows(enriched)
      if (enriched.length === 0) {
        setInfo('Chưa có lịch bốc thăm cho dự án nào trong hồ sơ của bạn.')
      }
    } catch (err) {
      setError(formatError(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    void loadPublicLive()
  }, [])

  const joinLiveStudio = async (projectId: string, defaultCode?: string | null, projectName?: string) => {
    sessionStorage.setItem('lotteryProjectId', projectId)
    const role = getRole()
    if (role !== 'Applicant') {
      navigate('lottery-live')
      return
    }

    const cachedOtp = sessionStorage.getItem(`lotteryLobbyOtp:${projectId}`)
    if (cachedOtp) {
      navigate('lottery-live')
      return
    }

    // Nếu đã có sẵn mã vào sảnh từ cấu hình phiên, thử xác thực tự động
    if (defaultCode && defaultCode.length >= 6) {
      try {
        await lotteryApi.verifyOtp(projectId, defaultCode)
        sessionStorage.setItem(`lotteryLobbyOtp:${projectId}`, defaultCode)
        navigate('lottery-live')
        return
      } catch {
        // Mở modal nếu tự động chưa khớp
      }
    }

    setVerifyModal({
      open: true,
      projectId,
      projectName: projectName || 'Dự án bốc thăm',
      code: defaultCode || '',
    })
  }

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!verifyModal || verifyModal.busy) return
    const { projectId, code } = verifyModal
    if (!code || code.length < 6) {
      setVerifyModal((p) => (p ? { ...p, error: 'Vui lòng nhập đủ 6 chữ số mã vào sảnh.' } : p))
      return
    }

    setVerifyModal((p) => (p ? { ...p, busy: true, error: undefined } : p))
    try {
      await lotteryApi.verifyOtp(projectId, code)
      sessionStorage.setItem(`lotteryLobbyOtp:${projectId}`, code)
      setVerifyModal(null)
      navigate('lottery-live')
    } catch (err) {
      setVerifyModal((p) => (p ? { ...p, busy: false, error: formatError(err) } : p))
    }
  }

  const myOwnResult = (row: Row) => {
    const me = row.application.applicationId
    // Ưu tiên result API (sau Finish/Publish), fallback từ applicationStatus
    const fromResult =
      row.result?.participants?.find((p) => p.applicationId === me) ??
      row.result?.winners?.find((w) => w.applicationId === me) ??
      row.result?.losers?.find((w) => w.applicationId === me) ??
      row.result?.allEntries?.find((w) => w.applicationId === me) ??
      null
    if (fromResult) return fromResult
    // Infer trúng từ CONTRACT_PENDING nếu result chưa có (chưa Finish)
    if (row.application.applicationStatus === 'CONTRACT_PENDING') {
      return {
        applicationId: me,
        applicantName: row.application.applicantFullName ?? '—',
        citizenId: row.application.citizenId ?? '',
        lotteryResult: 'WON' as const,
        slotCode: (row.application as unknown as { apartmentId?: string | null }).apartmentId ?? null,
        applicationStatus: 'CONTRACT_PENDING',
      }
    }
    return null
  }

  const isWon = (row: Row): boolean => {
    const own = myOwnResult(row)
    return !!(own && (own.lotteryResult === 'WON' || own.lotteryResult === 'PRIORITY_WON'))
  }

  return (
    <div>
      <PageCard className="space-y-4 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">Bốc thăm của tôi</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Hồ sơ đã được duyệt sẽ hiển thị ở đây. Bạn vào sảnh chờ bằng mã vào sảnh và theo dõi kết quả do chủ đầu tư công bố.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void load()}>
            Tải lại
          </Button>
        </div>

        {error && <Alert variant="error">{error}</Alert>}
        {info && <Alert variant="info">{info}</Alert>}
        {loading && <p className="text-sm text-slate-500 dark:text-slate-400">Đang tải...</p>}

        {/* ── PHIÊN BỐC THĂM DỰ ÁN BẠN THAM GIA ── */}
        {!loading && rows.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Trophy className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              Phiên bốc thăm của bạn ({rows.length})
            </h3>
            <div className="grid gap-3">
            {rows.map((row) => {
              const own = myOwnResult(row)
              const phase = row.schedule?.status ?? 'NOT_SCHEDULED'
              const isFinished = phase === 'Finished' || phase === 'Published' || phase === 'FINISHED'
              const isLive = phase === 'Live' || phase === 'RUNNING'
              const isLobby = phase === 'WaitingLobby'
              const won = isWon(row)
              const hasSlot = !!own?.slotCode

              return (
                <div
                  key={row.application.applicationId}
                  className="rounded-xl border border-slate-200 p-4 dark:border-slate-700"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">{row.application.projectName}</h3>
                        <Badge variant={LOTTERY_STATUS_TONE[phase] ?? 'secondary'}>
                          {LOTTERY_STATUS_LABEL[phase] ?? phase}
                        </Badge>
                        {row.application.applicationStatus === 'CONTRACT_PENDING' && (
                          <Badge variant="success">Đã trúng</Badge>
                        )}
                        {row.application.applicationStatus === 'LOTTERY_LOST' && (
                          <Badge variant="warning">Chưa trúng</Badge>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Hồ sơ #{row.application.applicationId.slice(0, 8)} · CCCD {row.application.citizenId}
                      </p>
                      {row.schedule?.scheduledAt && (
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          <Calendar className="mr-1 inline h-3 w-3" />
                          Lịch: {new Date(row.schedule.scheduledAt).toLocaleString('vi-VN')}
                        </p>
                      )}
                      {row.schedule?.joinCode && (
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          Mã vào sảnh:{' '}
                          <strong className="font-mono text-blue-700 dark:text-blue-300">{row.schedule.joinCode}</strong>
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant={isLive || isLobby ? 'accent' : 'outline'}
                        size="sm"
                        onClick={() => void joinLiveStudio(row.application.projectId, row.schedule?.joinCode, row.application.projectName)}
                      >
                        {isLive || isLobby ? (
                          <>
                            <Sparkles className="mr-1.5 h-4 w-4" />
                            Vào xem trực tiếp
                          </>
                        ) : isFinished ? (
                          <>
                            <Trophy className="mr-1.5 h-4 w-4 text-amber-500" />
                            Xem kết quả trường quay
                          </>
                        ) : (
                          <>
                            <ExternalLink className="mr-1.5 h-4 w-4" />
                            Theo dõi sảnh quay số
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Kết quả của tôi */}
                  {own && (
                    <div
                      className={`mt-3 rounded-lg border p-3 text-sm ${won
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200'
                        : own.lotteryResult === 'LOST'
                          ? 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200'
                          : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/40'
                        }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="font-semibold">
                            <Trophy className="mr-1 inline h-4 w-4" />
                            Kết quả:&nbsp;
                            {won
                              ? 'ĐÃ TRÚNG SUẤT'
                              : own.lotteryResult === 'LOST' || own.lotteryResult === 'LOTTERY_LOST'
                                ? 'CHƯA TRÚNG (chờ bổ sung)'
                                : own.lotteryResult
                                  ? (LOTTERY_RESULT_LABELS[own.lotteryResult] || own.lotteryResult).toUpperCase()
                                  : 'ĐANG CẬP NHẬT'}
                          </p>
                          {won && !hasSlot && (
                            <p className="mt-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                              Chờ chủ đầu tư chọn căn
                            </p>
                          )}
                          {won && hasSlot && (
                            <p className="mt-1 font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                              Mã căn: {own.slotCode}
                            </p>
                          )}
                        </div>
                        {isLive && (
                          <Badge variant="warning">
                            <Sparkles className="mr-1 inline h-3 w-3" />
                            Đang quay số
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {!own && isFinished && (
                    <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-800/40">
                      <p>Phiên đã kết thúc — chưa có kết quả cho hồ sơ của bạn trong lần chạy này.</p>
                    </div>
                  )}
                </div>
              )
            })}
            </div>
          </div>
        )}

        {/* ── PHIÊN ĐANG LIVE CÔNG KHAI KHÁC (Chỉ hiện khi có dự án KHÁC mà user không nộp hồ sơ) ── */}
        {!publicLoading && otherPublicLive.length > 0 && (
          <section className="mt-6 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50/60 via-orange-50/30 to-white p-5 dark:border-amber-900/50 dark:from-amber-950/20 dark:to-slate-900 shadow-sm">
            <div className="mb-2 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              <h3 className="text-base font-bold text-amber-900 dark:text-amber-200">
                Phiên bốc thăm công khai khác đang diễn ra
              </h3>
              <Badge variant="warning">{otherPublicLive.length}</Badge>
            </div>
            <p className="mb-3 text-xs text-amber-800 dark:text-amber-300/90 leading-relaxed">
              Theo Điều 36 Nghị định số 100 năm 2024 của Chính phủ, người dân được theo dõi trực tiếp các phiên bốc thăm công khai tại các dự án khác. Bấm <strong>Vào xem trực tiếp</strong> để theo dõi trực tuyến.
            </p>
            <div className="grid gap-2.5">
              {otherPublicLive.map((sd) => {
                const phase = String(sd.status ?? '')
                return (
                  <div
                    key={sd.projectId}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200/80 bg-white p-3.5 dark:border-amber-800/50 dark:bg-slate-900 shadow-xs"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">{sd.projectName ?? 'Dự án'}</h4>
                        <Badge variant={LOTTERY_STATUS_TONE[phase] ?? 'warning'}>
                          {LOTTERY_STATUS_LABEL[phase] ?? phase}
                        </Badge>
                      </div>
                      {sd.scheduledAt && (
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-slate-400" />
                          Lịch: {new Date(sd.scheduledAt).toLocaleString('vi-VN')}
                        </p>
                      )}
                      {sd.joinCode && (
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                          Mã vào sảnh:{' '}
                          <strong className="font-mono text-blue-700 dark:text-blue-300">
                            {sd.joinCode}
                          </strong>
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 shrink-0">
                      <Button
                        variant="accent"
                        size="sm"
                        className="rounded-xl font-bold"
                        onClick={() => void joinLiveStudio(sd.projectId, sd.joinCode, sd.projectName)}
                      >
                        <Sparkles className="mr-1.5 h-4 w-4" />
                        Vào xem trực tiếp
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}
      </PageCard>

      {/* Modal xác thực mã vào sảnh trực tiếp */}
      {verifyModal?.open && (
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
                  <p className="text-xs text-slate-500 dark:text-slate-400">{verifyModal.projectName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setVerifyModal(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="mt-4 text-xs text-slate-600 leading-relaxed dark:text-slate-300">
              Nhập mã vào sảnh gồm 6 chữ số (xem trong thông báo hoặc phiếu hẹn bốc thăm) để kết nối trực tiếp với trường quay.
            </p>

            {verifyModal.error && (
              <Alert variant="error" className="mt-3">
                {verifyModal.error}
              </Alert>
            )}

            <form onSubmit={handleVerifySubmit} className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Mã vào sảnh 6 chữ số
                </label>
                <input
                  type="text"
                  autoFocus
                  maxLength={6}
                  value={verifyModal.code}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '')
                    setVerifyModal((p) => (p ? { ...p, code: val, error: undefined } : p))
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
                  onClick={() => setVerifyModal(null)}
                >
                  Hủy bỏ
                </Button>
                <Button
                  type="submit"
                  variant="accent"
                  size="sm"
                  disabled={verifyModal.busy || verifyModal.code.length < 6}
                >
                  {verifyModal.busy ? 'Đang kết nối…' : 'Vào xem trực tiếp'}
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
