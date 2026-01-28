import { useEffect, useMemo, useState } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchOrders, updateOrderItemStatus } from '../api/orders'
import { fetchPrepSections } from '../api/sections'
import { PageHeader } from '../components/PageHeader'
import { StatusPill } from '../components/StatusPill'
import type { OrderItem, OrderItemStatus, PrepSection } from '../types'
import { useAuth } from '../context/AuthContext'
import { useTranslation } from 'react-i18next'
import { Dialog } from '../components/Dialog'
import { useRealtime } from '../realtime/RealtimeProvider'

const nextStatus = (status: OrderItem['status']) => {
    if (status === 'PENDING') return 'IN_PROGRESS'
    if (status === 'IN_PROGRESS') return 'READY'
    if (status === 'READY') return 'SERVED'
    return 'SERVED'
}

const getElapsedMinutes = (createdAt: string, nowTime: number) => {
    const created = new Date(createdAt).getTime()
    return Math.floor((nowTime - created) / 60000)
}

const getUrgencyClasses = (minutes: number) => {
    if (minutes < 5) return 'border-emerald-200 bg-emerald-50/50'
    if (minutes < 12) return 'border-amber-200 bg-amber-50/50'
    return 'border-rose-400 bg-rose-50 border-l-[6px] animate-pulse-urgency'
}

export const SectionOrdersPage = () => {
    const { sectionId } = useParams<{ sectionId: string }>()
    const { t } = useTranslation()
    const { user, hasPermission } = useAuth()
    const { isEnabled: isRealtimeEnabled } = useRealtime()
    const queryClient = useQueryClient()
    const [currentTime, setCurrentTime] = useState(Date.now())
    const [dialog, setDialog] = useState<{
        isOpen: boolean;
        title: string;
        description?: string;
        type: 'info' | 'danger' | 'warning' | 'prompt';
        onConfirm: (val?: string) => void;
    }>({ isOpen: false, title: '', type: 'info', onConfirm: () => { } })

    useEffect(() => {
        const interval = setInterval(() => setCurrentTime(Date.now()), 10000) // Faster update interval for kitchen timers
        return () => clearInterval(interval)
    }, [])

    const { data: prepSections = [] } = useQuery({
        queryKey: ['prep-sections'],
        queryFn: fetchPrepSections,
    })

    const currentSection = useMemo(() => {
        if (sectionId === 'all') return { name: t('common.all_sections') } as Partial<PrepSection>
        return prepSections.find(s => s.id === parseInt(sectionId || '0'))
    }, [prepSections, sectionId, t])

    const {
        data: orders = [],
        isLoading: ordersLoading,
        isError: ordersError,
    } = useQuery({
        queryKey: ['orders', 'prep', sectionId],
        queryFn: () => fetchOrders({ status: 'ACTIVE', kitchen_visible: true }),
        refetchInterval: isRealtimeEnabled ? false : 5000,
    })

    const mutation = useMutation({
        mutationFn: ({ id, status }: { id: number; status: OrderItemStatus }) =>
            updateOrderItemStatus(id, status),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders'] }),
        onError: (err: any) => {
            const msg = err.response?.data?.message || err.message || t('common.error')
            setDialog({ isOpen: true, title: t('common.update_failed'), description: msg, type: 'danger', onConfirm: () => { } })
        },
    })

    const tickets = useMemo(() => {
        const sId = sectionId === 'all' ? null : parseInt(sectionId || '0')
        return orders
            .map((order) => {
                const items = order.items.filter((item) => {
                    const matchSection = sId === null || item.prep_section_id === sId
                    return matchSection && item.status !== 'SERVED' && item.status !== 'CANCELLED'
                })
                if (items.length === 0 || order.status === 'CANCELLED') return null
                return { ...order, filteredItems: items }
            })
            .filter(Boolean)
    }, [orders, sectionId])

    // Access Guard
    const canAccess = useMemo(() => {
        if (hasPermission('manage_settings')) return true // Admin
        if (sectionId === 'all' && hasPermission('create_order')) return true // Cashier aggregated
        if (user?.prep_section_id && sectionId && user.prep_section_id === parseInt(sectionId)) return true
        return false
    }, [user, sectionId, hasPermission])

    if (!canAccess && !ordersLoading) return <Navigate to="/" replace />

    return (
        <div>
            <PageHeader
                title={currentSection?.name || t('common.operational_center')}
                subtitle={sectionId === 'all' ? t('reports.aggregated_view') : t('common.prep_station')}
            />

            {ordersLoading ? (
                <div className="flex justify-center py-12">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />
                </div>
            ) : ordersError ? (
                <p className="p-8 glass text-rose-600 font-bold">{t('common.error')}</p>
            ) : (
                <div className="grid gap-6 lg:grid-cols-2">
                    {tickets.map((order: any) => {
                        const elapsed = getElapsedMinutes(order.created_at, currentTime)
                        const urgency = getUrgencyClasses(elapsed)
                        return (
                            <div key={order.id} className={`rounded-[32px] border-2 p-8 glass transition-all duration-500 shadow-xl ${urgency}`}>
                                <div className="flex items-start justify-between mb-6">
                                    <div>
                                        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                                            {order.table?.name || `Table ${order.table_id}`}
                                        </h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs font-black text-slate-400 uppercase">Order #{order.id}</span>
                                            <span className="h-1 w-1 rounded-full bg-slate-300" />
                                            <span className="text-xs font-black text-indigo-600 uppercase">{elapsed} {t('common.minutes')} {t('common.ago')}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {order.filteredItems.map((item: OrderItem) => (
                                        <div key={item.id} className="bg-white/80 rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center justify-between group hover:border-indigo-200 transition-all">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3">
                                                    <span className="h-8 w-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-black text-sm">{item.quantity}x</span>
                                                    <span className="text-lg font-black text-slate-800 uppercase tracking-tight">{item.menu_item?.name}</span>
                                                </div>
                                                {item.notes && (
                                                    <div className="mt-2 text-xs font-bold text-amber-600 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-100 inline-block">
                                                        📝 {item.notes}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex flex-col items-end gap-3">
                                                <StatusPill status={item.status} />
                                                <button
                                                    onClick={() => mutation.mutate({ id: item.id, status: nextStatus(item.status) })}
                                                    disabled={mutation.isPending}
                                                    className="px-6 py-2.5 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-lg active:scale-95 disabled:opacity-50"
                                                >
                                                    {item.status === 'PENDING' ? t('common.start_prep') : item.status === 'IN_PROGRESS' ? t('common.mark_ready') : t('common.serve')}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )
                    })}
                    {tickets.length === 0 && (
                        <div className="lg:col-span-2 p-20 glass rounded-[40px] text-center border-dashed border-slate-300">
                            <div className="text-4xl mb-4 opacity-20">🍳</div>
                            <p className="text-slate-400 font-bold uppercase tracking-[0.3em]">{t('common.no_queue_items')}</p>
                        </div>
                    )}
                </div>
            )}

            <Dialog
                isOpen={dialog.isOpen}
                title={dialog.title}
                description={dialog.description}
                type={dialog.type}
                onClose={() => setDialog(p => ({ ...p, isOpen: false }))}
                onConfirm={dialog.onConfirm}
            />
        </div>
    )
}
