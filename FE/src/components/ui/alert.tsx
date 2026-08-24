import { cn } from '@/lib/utils'

export function Alert({
  variant = 'info',
  children,
  className,
}: {
  variant?: 'info' | 'success' | 'error' | 'warning'
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'rounded-xl border px-4 py-3 text-sm',
        variant === 'success' && 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200',
        variant === 'error' && 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300',
        variant === 'warning' && 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200',
        variant === 'info' && 'border-sky-200 bg-sky-50 text-slate-800 dark:border-sky-800 dark:bg-sky-950/40 dark:text-slate-200',
        className,
      )}
    >
      {children}
    </div>
  )
}
