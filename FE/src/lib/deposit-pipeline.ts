import type { PaymentInstallment } from '@/api/contracts'

/** Đợt 1 đã PAID trên lịch, hoặc hồ sơ đã qua bước cọc (dữ liệu cũ). */
export function isPhase1Paid(
  installments: PaymentInstallment[],
  applicationStatus?: string | null,
): boolean {
  if (installments.some((i) => i.ordinal === 1 && (i.status === 'PAID' || i._rawStatus === 'PAID'))) {
    return true
  }
  const status = String(applicationStatus || '').toUpperCase()
  return (
    status === 'DEPOSIT_PAID' ||
    status === 'CONTRACT_SIGNED' ||
    status === 'INSTALLMENT_IN_PROGRESS' ||
    status === 'FULLY_PAID'
  )
}

/**
 * Sau cấp nhà BE để DEPOSIT_PENDING (đã có căn).
 * CONTRACT_PENDING còn gặp khi chưa cọc (dữ liệu cũ).
 */
export function needsDepositBeforeContract(opts: {
  applicationStatus: string
  hasApartment: boolean
  depositPaid: boolean
}): boolean {
  if (opts.depositPaid) return false
  const status = String(opts.applicationStatus || '').toUpperCase()
  if (status === 'DEPOSIT_PENDING') return true
  return status === 'CONTRACT_PENDING' && opts.hasApartment
}

/** Ký HĐ: đã cấp căn + đã cọc Đợt 1. */
export function canSignAfterDeposit(opts: {
  applicationStatus: string
  hasApartment: boolean
  depositPaid: boolean
}): boolean {
  if (!opts.hasApartment || !opts.depositPaid) return false
  const status = String(opts.applicationStatus || '').toUpperCase()
  return (
    status === 'CONTRACT_PENDING' ||
    status === 'DEPOSIT_PENDING' ||
    status === 'DEPOSIT_PAID' ||
    status === 'CONTRACTING'
  )
}
