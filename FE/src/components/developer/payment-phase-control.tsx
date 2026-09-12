import { Alert } from '@/components/ui/alert'
import type { HousingProjectDto } from '@/types'

interface Props {
  project: HousingProjectDto
  onChanged?: (next: HousingProjectDto) => void
}

/** Mở đợt nằm trên trang chi tiết dự án — không mở theo từng hồ sơ. */
export function PaymentPhaseControl({ project }: Props) {
  if (!project.id) return null
  return (
    <Alert variant="info" className="mb-6">
      Mở đợt thanh toán trên trang chi tiết dự án, khối Tiến độ thu tiền. Một lần mở cho cả dự án.
    </Alert>
  )
}
