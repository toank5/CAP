import { APPLICATION_STATUS } from '@/lib/constants'
import { labelApplicationStatus } from '@/lib/labels'
import { Badge } from '@/components/ui/badge'

export function StatusBadge({ status }: { status: string }) {
  if (!status) return <Badge variant="secondary">—</Badge>
  const key = status.trim()
  const st = APPLICATION_STATUS[key] ?? APPLICATION_STATUS[key.toUpperCase()]
  return <Badge variant={st?.variant ?? 'default'}>{st?.label ?? labelApplicationStatus(status)}</Badge>
}
