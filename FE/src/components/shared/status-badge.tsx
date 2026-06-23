import { APPLICATION_STATUS } from '@/lib/constants'
import { labelApplicationStatus } from '@/lib/labels'
import { Badge } from '@/components/ui/badge'

export function StatusBadge({ status }: { status: string }) {
  const st = APPLICATION_STATUS[status]
  return <Badge variant={st?.variant ?? 'default'}>{st?.label ?? labelApplicationStatus(status)}</Badge>
}
