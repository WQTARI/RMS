import { useTranslation } from 'react-i18next'
import type { OrderItemStatus, TableStatus } from '../types'

type SupportedStatus = TableStatus | OrderItemStatus

const statusColors: Record<SupportedStatus, string> = {
  AVAILABLE: 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20',
  RESERVED: 'bg-amber-500/10 text-amber-600 border border-amber-500/20',
  OCCUPIED: 'bg-rose-500/10 text-rose-600 border border-rose-500/20',
  PENDING: 'bg-slate-500/10 text-slate-500 border border-slate-500/20',
  IN_PROGRESS: 'bg-indigo-500/10 text-indigo-600 border border-indigo-500/20',
  READY: 'bg-emerald-500 text-white border border-emerald-600 shadow-sm shadow-emerald-200',
  SERVED: 'bg-slate-100 text-slate-400 border border-slate-200 opacity-60',
  CANCELLED: 'bg-rose-100 text-rose-700 border border-rose-200',
}

export const StatusPill = ({ status }: { status: SupportedStatus }) => {
  const { t } = useTranslation()
  return (
    <span
      className={`rounded-full px-3 py-1.5 text-sm font-bold uppercase tracking-wide ${statusColors[status]}`}
    >
      {t(`status.${status.toLowerCase()}`)}
    </span>
  )
}
