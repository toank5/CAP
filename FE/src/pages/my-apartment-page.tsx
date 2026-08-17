import { useEffect, useState } from 'react'
import { Home } from 'lucide-react'
import {
  contractApi,
  parseContractStatus,
  parseInstallmentsEnvelope,
  summarizeInstallments,
  type ContractStatusDto,
  type ContractStatus,
} from '@/api/contracts'
import { housingApplicationsApi, parseApplicationDetail } from '@/api/housing-applications'
import { APPLICATION_STATUS } from '@/lib/constants'
import { PageCard, PageHeader } from '@/components/layout/page-header'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  ApartmentCard,
  PaymentSection,
  SignContractSection,
} from '@/components/payment/payment-section'
import type { ApplicationSummaryDto } from '@/types'

// ─── Status mapping ────────────────────────────────────────────────────────────

function mapStatus(s: ContractStatusDto | null): ContractStatus {
  if (!s) return 'NOT_AVAILABLE'
  if (s.isSigned) return 'SIGNED'
  switch (s.applicationStatus) {
    case 'CONTRACT_SIGNED':
    case 'CONTRACTING':
    case 'PAID':
    case 'FINALIZED':
      return 'SIGNED'
    case 'PAYMENT_PENDING':
      return 'PAYMENT_PENDING'
    case 'PARTIALLY_PAID':
      return 'PARTIALLY_PAID'
    case 'CANCELED':
    case 'REJECTED':
      return 'CANCELED'
    default:
      return 'PENDING_SIGNATURE'
  }
}

// ─── Flow Step Indicator ───────────────────────────────────────────────────────

type FlowStep = 'none' | 'deposit' | 'sign' | 'pay-installment' | 'paid'

function FlowStepIndicator({ step }: { step: FlowStep }) {
  const steps = [
    { key: 'deposit', label: 'Đặt cọc' },
    { key: 'sign', label: 'Ký HĐ' },
    { key: 'pay-installment', label: 'Thanh toán' },
  ]
  const currentIdx =
    step === 'none' ? -1 :
    step === 'deposit' ? 0 :
    step === 'sign' ? 1 :
    step === 'pay-installment' ? 2 :
    3

  return (
    <div className="flex items-center justify-center gap-0">
      {steps.map((s, i) => {
        const done = i < currentIdx
        const active = i === currentIdx
        return (
          <div key={s.key} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-bold transition-all ${
                  done
                    ? 'border-emerald-500 bg-emerald-500 text-white'
                    : active
                      ? 'border-indigo-500 bg-indigo-500 text-white shadow-lg shadow-indigo-500/30'
                      : 'border-slate-300 bg-slate-100 text-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-500'
                }`}
              >
                {done ? '✓' : i + 1}
              </div>
              <span
                className={`text-[11px] font-medium ${
                  done || active ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400'
                }`}
              >
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`mb-5 h-0.5 w-8 transition-all ${
                  i < currentIdx ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'
                }`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export function MyApartmentPage() {
  const [apps, setApps] = useState<ApplicationSummaryDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Contract + payment state
  const [contractStatus, setContractStatus] = useState<ContractStatusDto | null>(null)
  const [installments, setInstallments] = useState<import('@/api/contracts').PaymentInstallment[]>([])
  const [installmentsError, setInstallmentsError] = useState(false)
  const [officialPrice, setOfficialPrice] = useState<number | null>(null)
  const [housePrice, setHousePrice] = useState<number | null>(null)
  const [contractPrice, setContractPrice] = useState<number | null>(null)
  const [appDetail, setAppDetail] = useState<Record<string, unknown> | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [signing, setSigning] = useState(false)

  // Load danh sách hồ sơ đủ điều kiện (trúng bốc thăm / đã cấp căn / đã ký)
  const loadApps = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await housingApplicationsApi.getMy({ pageIndex: 1, pageSize: 50 })
      const items = Array.isArray((data as { items?: ApplicationSummaryDto[] }).items)
        ? (data as { items: ApplicationSummaryDto[] }).items
        : []
      const eligible = items.filter((a) =>
        [
          'APPROVED',
          'APPROVED_BY_TIMEOUT',
          'DEPOSIT_PENDING',
          'CONTRACT_PENDING',
          'CONTRACT_SIGNED',
          'DEPOSIT_PAID',
          'CONTRACTING',
          'INSTALLMENT_IN_PROGRESS',
          'PARTIALLY_PAID',
          'PAID',
          'FULLY_PAID',
          'FINALIZED',
        ].includes(a.applicationStatus),
      )
      setApps(eligible)
      if (eligible.length === 1 && !selectedId) {
        setSelectedId(eligible[0].applicationId)
      }
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void loadApps() }, [])

  // Load chi tiết hồ sơ + lịch thanh toán khi chọn
  const loadDetail = async (appId: string) => {
    setLoadingDetail(true)
    setContractStatus(null)
    setInstallments([])
    setInstallmentsError(false)
    setAppDetail(null)
    setMsg(null)

    try {
      // Contract status
      try {
        const s = await contractApi.getStatus(appId)
        setContractStatus(parseContractStatus(s))
      } catch { setContractStatus(null) }

      // App detail
      try {
        const d = await housingApplicationsApi.getById(appId)
        setAppDetail(parseApplicationDetail(d) as unknown as Record<string, unknown>)
      } catch { setAppDetail(null) }

      // Installments
      try {
        const i = await contractApi.getInstallments(appId)
        const env = parseInstallmentsEnvelope(i)
        setInstallments(env.installments)
        setInstallmentsError(false)
        setOfficialPrice(env.officialPrice ?? null)
        setHousePrice(env.housePrice ?? null)
        setContractPrice(env.contractPrice ?? null)
      } catch {
        setInstallments([])
        setInstallmentsError(true)
        setHousePrice(null)
        setContractPrice(null)
        setOfficialPrice(null)
      }
    } finally {
      setLoadingDetail(false)
    }
  }

  useEffect(() => {
    if (selectedId) void loadDetail(selectedId)
  }, [selectedId])

  const signContract = async () => {
    if (!selectedId || signing) return
    setSigning(true)
    setMsg(null)
    try {
      await contractApi.sign(selectedId)
      await loadDetail(selectedId)
      setMsg({
        type: 'success',
        text: 'Đã ký HĐ thành công. Đợt 2 (20% — Thanh toán ký HĐ) đã tự mở. Bạn có thể đóng ngay.',
      })
    } catch (err) {
      setMsg({ type: 'error', text: String(err) })
    } finally {
      setSigning(false)
    }
  }

  const selectedApp = apps.find((a) => a.applicationId === selectedId)
  const appStatus = appDetail
    ? String(appDetail['applicationStatus'] ?? '')
    : selectedApp?.applicationStatus ?? ''
  const hasApartment = !!(
    appDetail?.['apartmentId'] ||
    selectedApp?.applicationStatus === 'CONTRACT_SIGNED' ||
    selectedApp?.applicationStatus === 'CONTRACTING' ||
    selectedApp?.applicationStatus === 'DEPOSIT_PAID'
  )

  const derivedStatus = mapStatus(contractStatus)
  const { remaining, progress } = summarizeInstallments(installments)

  // Xác định bước hiện tại trong flow
  const flowStep: FlowStep =
    derivedStatus === 'PAID' || appStatus === 'PAID' || appStatus === 'FULLY_PAID' || appStatus === 'FINALIZED'
      ? 'paid'
      : derivedStatus === 'SIGNED' || appStatus === 'CONTRACT_SIGNED' || appStatus === 'CONTRACTING'
        ? 'pay-installment'
        : derivedStatus === 'PENDING_SIGNATURE' || appStatus === 'CONTRACT_PENDING' || appStatus === 'DEPOSIT_PENDING'
          ? 'sign'
          : ['APPROVED', 'APPROVED_BY_TIMEOUT'].includes(appStatus)
            ? 'deposit'
            : 'none'

  const canSign =
    !contractStatus?.isSigned &&
    (
      contractStatus?.applicationStatus === 'CONTRACT_PENDING' ||
      contractStatus?.applicationStatus === 'DEPOSIT_PENDING' ||
      contractStatus?.applicationStatus === 'CONTRACTING'
    ) &&
    hasApartment

  return (
    <div>
      <PageHeader routeId="my-apartment" />
      <PageCard className="space-y-6 p-6">

        {/* Header */}
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            Căn của tôi
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Theo dõi căn hộ, đặt cọc, ký hợp đồng và thanh toán các đợt theo Luật Nhà ở xã hội.
          </p>
        </div>

        {/* Step indicator */}
        {selectedApp && flowStep !== 'none' && (
          <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900/40">
            <FlowStepIndicator step={flowStep} />
          </div>
        )}

        {/* Chọn hồ sơ */}
        {loading ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Đang tải...</p>
        ) : error ? (
          <Alert variant="error">{error}</Alert>
        ) : apps.length === 0 ? (
          <Alert variant="info">
            <strong>Chưa có căn hộ.</strong> Hồ sơ sẽ xuất hiện ở đây khi bạn trúng bốc thăm và được CĐT gán căn.
          </Alert>
        ) : (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Chọn hồ sơ:
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {apps.map((a) => {
                const isSelected = a.applicationId === selectedId
                return (
                  <button
                    key={a.applicationId}
                    type="button"
                    onClick={() => setSelectedId(a.applicationId)}
                    className={`rounded-xl border-2 p-4 text-left transition-all ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-950/40 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 bg-white hover:border-indigo-300 dark:border-slate-700 dark:bg-slate-900/40 dark:hover:border-indigo-600'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <Home className={`mt-0.5 h-5 w-5 shrink-0 ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-slate-900 dark:text-slate-100">
                          {a.projectName}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                          {a.applicantFullName}
                        </p>
                        <Badge
                          variant={(APPLICATION_STATUS[a.applicationStatus]?.variant as 'default' | 'success' | 'warning' | 'danger' | 'secondary') ?? 'secondary'}
                        >
                          {APPLICATION_STATUS[a.applicationStatus]?.label ?? a.applicationStatus}
                        </Badge>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Nội dung chi tiết */}
        {selectedId && (
          <div className="space-y-6">
            {msg && <Alert variant={msg.type === 'error' ? 'error' : 'success'}>{msg.text}</Alert>}

            {loadingDetail ? (
              <div className="flex items-center justify-center py-8">
                <div className="flex items-center gap-3 text-sm text-slate-500">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                  Đang tải chi tiết hồ sơ...
                </div>
              </div>
            ) : selectedApp ? (
              <>
                {/* Căn được cấp */}
                <ApartmentCard
                  apartmentUnitName={appDetail?.['apartmentUnitName'] as string | null ?? null}
                  apartmentArea={appDetail?.['apartmentArea'] as number | null ?? null}
                  apartmentPrice={appDetail?.['apartmentPrice'] as number | null ?? null}
                  projectName={appDetail?.['projectName'] as string ?? selectedApp.projectName}
                  lotteryResult={appDetail?.['lotteryResult'] as string | null ?? null}
                />

                {/* Ký hợp đồng */}
                <SignContractSection
                  canSign={canSign}
                  signing={signing}
                  onSign={() => void signContract()}
                  applicationStatus={contractStatus?.applicationStatus ?? appStatus}
                />

                {/* Lịch 6 đợt thanh toán + nút thanh toán + lịch sử GD */}
                <PaymentSection
                  installments={installments}
                  paid={installments.filter(i => i.status === 'PAID').reduce((s, i) => s + (i.paidAmount ?? i.amount), 0)}
                  remaining={remaining}
                  progress={progress}
                  contractPrice={contractPrice}
                  officialPrice={officialPrice}
                  housePrice={housePrice}
                  signedAt={contractStatus?.signedAt ?? null}
                  applicationId={selectedId}
                  applicationStatus={contractStatus?.applicationStatus ?? appStatus}
                  hasError={installmentsError}
                  hasApartment={hasApartment}
                  onReload={() => void loadDetail(selectedId)}
                />
              </>
            ) : null}
          </div>
        )}

        {/* Hint footer */}
        {selectedApp && !loadingDetail && (
          <p className="text-center text-xs text-slate-400 dark:text-slate-500">
            Hạn đặt cọc: 7 ngày (168 giờ) kể từ khi ký hợp đồng.{' '}
            {selectedApp.applicationStatus === 'CONTRACT_SIGNED'
              ? 'Hãy đóng Đợt 1 (cọc) ngay để giữ căn.'
              : 'Sau khi ký HĐ, hãy đóng Đợt 1 ngay để giữ căn.'}
          </p>
        )}
      </PageCard>
    </div>
  )
}
