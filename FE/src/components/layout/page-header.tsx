import type { RouteId } from '@/router'

export function PageHeader(_props: { routeId?: RouteId }) {
  return null
}

export function PageCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={`glass-card ${className ?? ''}`}>{children}</div>
}
