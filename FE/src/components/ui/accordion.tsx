import * as Accordion from '@radix-ui/react-accordion'
import { ChevronDown } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

export function FaqAccordion({ items }: { items: { q: string; a: string }[] }) {
  return (
    <Accordion.Root type="single" collapsible className="space-y-3">
      {items.map((item, i) => (
        <Accordion.Item
          key={item.q}
          value={`item-${i}`}
          className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/60 dark:border-slate-700 dark:bg-slate-900/50"
        >
          <Accordion.Header>
            <Accordion.Trigger className="group flex w-full items-center justify-between px-5 py-4 text-left text-sm font-semibold transition hover:bg-secondary/50 dark:hover:bg-slate-800/50">
              {item.q}
              <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Content className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
            <motion.div
              initial={false}
              className="border-t border-slate-100 px-5 py-4 text-sm leading-relaxed text-slate-600 dark:border-slate-800 dark:text-slate-400"
            >
              {item.a}
            </motion.div>
          </Accordion.Content>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  )
}

export function StatusTimeline({
  items,
}: {
  items: { title: string; time: string; note?: string; active?: boolean }[]
}) {
  return (
    <ol className="relative space-y-0 border-l-2 border-primary/20 pl-6 dark:border-accent/30">
      {items.map((item, i) => (
        <motion.li
          key={`${item.title}-${i}`}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.08 }}
          className="relative pb-8 last:pb-0"
        >
          <span
            className={cn(
              'absolute -left-[1.65rem] top-1 h-3 w-3 rounded-full ring-4 ring-white dark:ring-slate-900',
              item.active ? 'bg-accent shadow-lg shadow-accent/40' : 'bg-primary/40',
            )}
          />
          <p className="font-semibold text-slate-900 dark:text-slate-100">{item.title}</p>
          <p className="text-xs text-slate-500">{item.time}</p>
          {item.note && <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{item.note}</p>}
        </motion.li>
      ))}
    </ol>
  )
}
