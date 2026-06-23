import * as React from 'react'
import { cn } from '@/lib/utils'

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-xl bg-slate-200/80 dark:bg-slate-700/50', className)}
      {...props}
    />
  )
}

export function KpiSkeleton() {
  return (
    <div className="glass-card p-6">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-3 h-9 w-20" />
      <Skeleton className="mt-2 h-3 w-32" />
    </div>
  )
}
