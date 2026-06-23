import { getRouteConfig, type RouteId } from '@/router'

export function PageHeader({ routeId }: { routeId: RouteId }) {
  const m = getRouteConfig(routeId)
  return (
    <div className="mb-6">
      <p className="text-xs font-bold uppercase tracking-widest text-accent">Nền tảng RHS</p>
      <h1 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">{m.title}</h1>
      {m.subtitle && <p className="mt-2 max-w-3xl text-slate-500 dark:text-slate-400">{m.subtitle}</p>}
    </div>
  )
}

export function PageCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={`glass-card ${className ?? ''}`}>{children}</div>
}
