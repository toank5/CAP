import { Alert } from '@/components/ui/alert'
import type { MilestoneSetupItemDto } from '@/types'

interface Props {
  projectId: string
  milestones?: MilestoneSetupItemDto[]
  onUnlocked?: () => void
}

/** Mở đợt nằm trên trang chi tiết dự án — không mở theo từng hồ sơ. */
export function ApplicationPaymentPanel({ projectId }: Props) {
  if (!projectId) return null
  return (
    <Alert variant="info">
      Mở đợt thanh toán trên trang chi tiết dự án, khối Tiến độ thu tiền. Một lần mở cho cả dự án.
    </Alert>
  )
}
