import { useEffect, useState } from 'react'
import { Calendar, ExternalLink, Sparkles, Trophy } from 'lucide-react'
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
import { PageCard, PageHeader } from '@/components/layout/page-header'
import { navigate } from '@/hooks/useHashRoute'
import { formatError } from '@/lib/format-error'
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

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
            : 'Chưa có hồ sơ nào đủ điều kiện. Hồ sơ cần được Sở duyệt (APPROVED) trước khi vào sảnh.',
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

  const enterLobby = (projectId: string) => {
    sessionStorage.setItem('lotteryProjectId', projectId)
    navigate('lottery-lobby')
  }

  const watchLive = (projectId: string) => {
    sessionStorage.setItem('lotteryProjectId', projectId)
    // Applicant: OTP đã verify được cache ở sessionStorage khi qua lottery-lobby.
    // Nếu chưa có (lần đầu hoặc cache hết hạn), đá về lobby để nhập lại.
    if (getRole() === 'Applicant' && !sessionStorage.getItem(`lotteryLobbyOtp:${projectId}`)) {
      navigate('lottery-lobby')
      return
    }
    navigate('lottery-live')
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
      <PageHeader routeId="my-lottery" />
      <PageCard className="space-y-4 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">Bốc thăm của tôi</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Hồ sơ đã được duyệt sẽ hiển thị ở đây. Bạn vào sảnh chờ bằng OTP và theo dõi kết quả do Chủ đầu tư công bố.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void load()}>
            Tải lại
          </Button>
        </div>

        {error && <Alert variant="error">{error}</Alert>}
        {info && <Alert variant="info">{info}</Alert>}
        {loading && <p className="text-sm text-slate-500 dark:text-slate-400">Đang tải...</p>}

        {/* ── PHIÊN ĐANG LIVE — công khai cho mọi Applicant (NĐ 100/2024 Đ36: minh bạch) ── */}
        {!publicLoading && publicLive.length > 0 && (
          <section className="rounded-xl border-2 border-amber-300 bg-amber-50/50 p-4 dark:border-amber-700 dark:bg-amber-950/20">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-600" />
              <h3 className="text-base font-bold text-amber-900 dark:text-amber-200">
                Phiên đang Live — dự án mở công khai
              </h3>
              <Badge variant="warning">{publicLive.length}</Badge>
            </div>
            <p className="mb-3 text-xs text-amber-800 dark:text-amber-300">
              Theo NĐ 100/2024 Đ36, dân được theo dõi trực tiếp phiên bốc thăm công khai.
              Bấm <strong>Vào sảnh</strong> để nhập OTP — hệ thống sẽ đưa bạn vào sảnh Live.
            </p>
            <div className="grid gap-2">
              {publicLive.map((sd) => {
                const phase = String(sd.status ?? '')
                return (
                  <div
                    key={sd.projectId}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-white p-3 dark:border-amber-800 dark:bg-slate-900"
                  >
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-semibold">{sd.projectName ?? 'Dự án'}</h4>
                        <Badge variant={LOTTERY_STATUS_TONE[phase] ?? 'warning'}>
                          {LOTTERY_STATUS_LABEL[phase] ?? phase}
                        </Badge>
                      </div>
                      {sd.scheduledAt && (
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          <Calendar className="mr-1 inline h-3 w-3" />
                          Lịch: {new Date(sd.scheduledAt).toLocaleString('vi-VN')}
                        </p>
                      )}
                      {sd.joinCode && (
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          OTP vào sảnh:{' '}
                          <strong className="font-mono text-blue-700 dark:text-blue-300">
                            {sd.joinCode}
                          </strong>
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="accent"
                        size="sm"
                        onClick={() => enterLobby(sd.projectId)}
                      >
                        <ExternalLink className="mr-1.5 h-4 w-4" />
                        Vào sảnh (nhập OTP)
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {!loading && rows.length > 0 && (
          <div className="grid gap-3">
            {rows.map((row) => {
              const own = myOwnResult(row)
              const phase = row.schedule?.status ?? 'NOT_SCHEDULED'
              const isFinished = phase === 'Finished' || phase === 'Published' || phase === 'FINISHED'
              const isLive = phase === 'Live' || phase === 'RUNNING'
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
                          Mã OTP vào sảnh:{' '}
                          <strong className="font-mono text-blue-700 dark:text-blue-300">{row.schedule.joinCode}</strong>
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {!isFinished && (
                        <Button variant="accent" size="sm" onClick={() => enterLobby(row.application.projectId)}>
                          <ExternalLink className="mr-1.5 h-4 w-4" />
                          Vào sảnh
                        </Button>
                      )}
                      <Button variant="outline" size="sm" onClick={() => watchLive(row.application.projectId)}>
                        Xem sảnh Live
                      </Button>
                    </div>
                  </div>

                  {/* Kết quả của tôi */}
                  {own && (
                    <div
                      className={`mt-3 rounded-lg border p-3 text-sm ${
                        won
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
                              : own.lotteryResult === 'LOST'
                                ? 'CHƯA TRÚNG (chờ bổ sung)'
                                : own.lotteryResult || 'ĐANG CẬP NHẬT'}
                          </p>
                          {won && !hasSlot && (
                            <p className="mt-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                              Chờ CĐT chọn căn
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
                            Đang Live
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
        )}
      </PageCard>
    </div>
  )
}
