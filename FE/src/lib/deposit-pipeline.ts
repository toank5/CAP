import type { PaymentInstallment } from '@/api/contracts'

/** Đợt 1 đã PAID trên lịch, hoặc hồ sơ đã qua bước thanh toán lần đầu. Không coi CONTRACT_SIGNED là đã đóng. */
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
    status === 'INSTALLMENT_IN_PROGRESS' ||
    status === 'FULLY_PAID'
  )
}

export function isSaleContractSigned(opts: {
  applicationStatus?: string | null
  isSigned?: boolean | null
}): boolean {
  if (opts.isSigned) return true
  const status = String(opts.applicationStatus || '').toUpperCase()
  return (
    status === 'CONTRACT_SIGNED' ||
    status === 'INSTALLMENT_IN_PROGRESS' ||
    status === 'FULLY_PAID'
  )
}

/** Ký HĐMB khi đã cấp căn, chưa ký. Đợt 1 nộp sau khi ký (Điều 89 Luật Nhà ở 2023). */
export function canSignSaleContract(opts: {
  applicationStatus: string
  hasApartment: boolean
  isSigned?: boolean | null
}): boolean {
  if (!opts.hasApartment || isSaleContractSigned(opts)) return false
  const status = String(opts.applicationStatus || '').toUpperCase()
  return (
    status === 'CONTRACT_PENDING' ||
    status === 'DEPOSIT_PENDING' ||
    status === 'DEPOSIT_PAID' ||
    status === 'CONTRACTING' ||
    status === 'APPROVED' ||
    status === 'APPROVED_BY_TIMEOUT' ||
    status === 'LOTTERY_WON'
  )
}

/** Đóng Đợt 1 khi đã ký HĐ và chưa thanh toán lần đầu. */
export function canPayPhase1(opts: {
  applicationStatus: string
  isSigned?: boolean | null
  phase1Paid: boolean
}): boolean {
  if (opts.phase1Paid) return false
  return isSaleContractSigned(opts)
}

/** @deprecated Dùng canSignSaleContract — giữ alias để chỗ cũ không gãy. */
export function canSignAfterDeposit(opts: {
  applicationStatus: string
  hasApartment: boolean
  depositPaid?: boolean
  isSigned?: boolean | null
}): boolean {
  return canSignSaleContract(opts)
}

/** @deprecated Không còn “cọc trước rồi mới ký”. */
export function needsDepositBeforeContract(_opts: {
  applicationStatus: string
  hasApartment: boolean
  depositPaid: boolean
}): boolean {
  return false
}
