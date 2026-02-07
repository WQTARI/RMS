import { useTranslation } from 'react-i18next'
import type { OrderItemStatus, TableStatus } from '../types'

type SupportedStatus = TableStatus | OrderItemStatus

export const StatusPill = ({ status }: { status: SupportedStatus }) => {
  const { t } = useTranslation()

  const config: Record<string, { bg: string; text: string; dot: string; label: string }> = {
    AVAILABLE: {
      bg: 'bg-emerald-500/15',
      text: 'text-emerald-700',
      dot: 'bg-emerald-500',
      label: t('status.available'),
    },
    OCCUPIED: {
      bg: 'bg-accent/15',
      text: 'text-accent-dark',
      dot: 'bg-accent',
      label: t('status.occupied'),
    },
    BROWSING: {
      bg: 'bg-amber-500/15',
      text: 'text-amber-700',
      dot: 'bg-amber-500',
      label: t('status.browsing'),
    },
    COMPLETED: {
      bg: 'bg-blue-500/15',
      text: 'text-blue-700',
      dot: 'bg-blue-500',
      label: t('status.completed'),
    },
    PENDING: {
      bg: 'bg-slate-500/15',
      text: 'text-slate-700',
      dot: 'bg-slate-500',
      label: t('status.pending'),
    },
    PREPARING: {
      bg: 'bg-indigo-500/15',
      text: 'text-indigo-700',
      dot: 'bg-indigo-500',
      label: t('status.preparing'),
    },
    READY: {
      bg: 'bg-purple-500/15',
      text: 'text-purple-700',
      dot: 'bg-purple-500',
      label: t('status.ready'),
    },
    SERVED: {
      bg: 'bg-emerald-500/15',
      text: 'text-emerald-700',
      dot: 'bg-emerald-500',
      label: t('status.served'),
    },
    SEATED: {
      bg: 'bg-sky-500/15',
      text: 'text-sky-700',
      dot: 'bg-sky-500',
      label: t('status.seated'),
    },
    IN_PROGRESS: {
      bg: 'bg-indigo-500/15',
      text: 'text-indigo-700',
      dot: 'bg-indigo-500',
      label: t('status.preparing'),
    },
    CANCELLED: {
      bg: 'bg-rose-500/15',
      text: 'text-rose-700',
      dot: 'bg-rose-500',
      label: t('common.cancelled'),
    },
  }

  const statusConfig = config[status] || {
    bg: 'bg-slate-500/15',
    text: 'text-slate-700',
    dot: 'bg-slate-500',
    label: status,
  }

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-black uppercase tracking-widest ${statusConfig.bg} ${statusConfig.text}`}
    >
      <span className={`mr-2 rtl:mr-0 rtl:ml-2 h-2 w-2 rounded-full ${statusConfig.dot}`} />
      {statusConfig.label}
    </span>
  )
}
