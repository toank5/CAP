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
        variant === 'success' && 'border-success/30 bg-success/10 text-green-800 dark:text-green-300',
        variant === 'error' && 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300',
        variant === 'warning' && 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200',
        variant === 'info' && 'border-primary/20 bg-secondary text-slate-700 dark:text-slate-300',
        className,
      )}
    >
      {children}
    </div>
  )
}
