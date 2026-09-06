import { cn } from '@/lib/utils'

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn('mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300', className)} {...props} />
}

export function FormField({
  label,
  children,
  htmlFor,
  required,
  hint,
  error,
}: {
  label: string
  children: React.ReactNode
  htmlFor?: string
  required?: boolean
  hint?: string
  error?: string
}) {
  return (
    <div className="space-y-0">
      <Label htmlFor={htmlFor}>
        {label}
        {required ? <span className="ml-0.5 text-red-600">*</span> : null}
      </Label>
      {children}
      {error ? (
        <p className="mt-1 text-xs text-red-600">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p>
      ) : null}
    </div>
  )
}
