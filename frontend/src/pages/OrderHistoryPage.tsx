import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
    fetchOrderHistory
} from '../api/reports'
import { PageHeader } from '../components/PageHeader'
import { formatCurrency } from '../utils/format'
import {
    Search, Calendar, ChevronLeft, ChevronRight,
    Receipt, Hash, Clock, ArrowLeft
} from 'lucide-react'

export const OrderHistoryPage = () => {
    const { t } = useTranslation()
    const navigate = useNavigate()
    const [page, setPage] = useState(1)
    const [search, setSearch] = useState('')
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')

    const {
        data: history,
        isLoading,
        isError,
    } = useQuery({
        queryKey: ['reports', 'order-history', page, search, startDate, endDate],
        queryFn: () => fetchOrderHistory({
            page,
            search: search || undefined,
            start_date: startDate || undefined,
            end_date: endDate || undefined
        }),
    })

    const orders = history?.data || []

    return (
        <div className="pb-32">
            {/* Context Navigation */}
            <div className="px-10 py-8">
                <button
                    onClick={() => navigate('/reports')}
                    className="group glass flex items-center gap-4 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-indigo-600 hover:bg-white/80 transition-all duration-500 shadow-xl shadow-indigo-500/5 hover:-translate-x-2"
                >
                    <ArrowLeft className="w-5 h-5" />
                    {t('common.back')}
                </button>
            </div>

            <PageHeader
                title={t('nav.archive')}
                subtitle={t('common.historical_audit')}
            />

            <div className="px-10 mt-12 space-y-10">
                {/* Search & Filter Bar */}
                <div className="glass rounded-[3rem] p-8 border-white/40 shadow-2xl shadow-indigo-500/5 flex flex-wrap gap-8 items-center bg-white/40 backdrop-blur-3xl">
                    <div className="relative flex-1 min-w-[350px] group">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                        <input
                            type="text"
                            placeholder={t('reports.search_hint')}
                            className="w-full pl-16 pr-6 py-6 bg-white/60 border border-white/80 rounded-[2rem] text-sm font-black uppercase tracking-tight placeholder:text-slate-400 focus:ring-4 focus:ring-indigo-500/10 focus:bg-white transition-all duration-500 shadow-inner"
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        />
                    </div>

                    <div className="flex items-center gap-4 bg-white/60 p-2.5 rounded-[2rem] border border-white/80 shadow-inner">
                        <div className="flex items-center gap-3 px-5 border-r border-white/60">
                            <Calendar className="w-5 h-5 text-indigo-500" />
                            <input
                                type="date"
                                className="bg-transparent border-none text-[11px] font-black uppercase tracking-widest outline-none p-0 cursor-pointer text-slate-600"
                                value={startDate}
                                onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                            />
                        </div>
                        <div className="flex items-center gap-3 px-5">
                            <input
                                type="date"
                                className="bg-transparent border-none text-[11px] font-black uppercase tracking-widest outline-none p-0 cursor-pointer text-slate-600"
                                value={endDate}
                                onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                            />
                        </div>
                    </div>

                    {(search || startDate || endDate) && (
                        <button
                            onClick={() => { setSearch(''); setStartDate(''); setEndDate(''); setPage(1); }}
                            className="px-10 py-6 bg-rose-500 text-white rounded-[2rem] text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-rose-500/30 hover:bg-rose-600 hover:scale-105 active:scale-95 transition-all duration-500"
                        >
                            {t('common.clear_filters')}
                        </button>
                    )}
                </div>

                {/* Orders List */}
                <div className="grid gap-8 lg:grid-cols-2 xl:grid-cols-3">
                    {isLoading ? (
                        Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="aspect-[4/5] bg-white/20 rounded-[3rem] animate-pulse border border-white/40" />
                        ))
                    ) : isError ? (
                        <div className="col-span-full py-32 text-center glass rounded-[3rem] border-dashed border-2 border-rose-200">
                            <p className="text-sm font-black text-rose-500 uppercase tracking-widest">{t('common.history_error')}</p>
                        </div>
                    ) : orders.length === 0 ? (
                        <div className="col-span-full py-40 text-center flex flex-col items-center gap-10 glass rounded-[4rem] border-dashed border-2">
                            <div className="size-32 rounded-[3.5rem] bg-slate-900/5 flex items-center justify-center">
                                <Receipt className="size-20 text-slate-200" />
                            </div>
                            <p className="text-base font-black text-slate-400 uppercase tracking-[0.4em]">{t('common.no_records')}</p>
                        </div>
                    ) : (
                        orders.map((order) => {
                            const total = order.items.reduce((sum, i) => sum + i.price * i.quantity, 0)
                            const statusColor = order.status === 'CLOSED' ? 'bg-emerald-500 shadow-emerald-500/40' : 'bg-slate-900 shadow-slate-900/40'

                            return (
                                <div
                                    key={order.id}
                                    className="group relative glass rounded-[2rem] border-white/60 p-10 shadow-2xl shadow-indigo-500/5 hover:-translate-y-3 transition-all duration-700 overflow-hidden"
                                >
                                    <div className="relative z-10 h-full flex flex-col">
                                        <div className="flex justify-between items-start mb-10">
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-3 px-3 py-1 bg-slate-900 text-white rounded-full w-fit">
                                                    <Hash className="size-3" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest">{order.id}</span>
                                                </div>
                                                <h3 className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none">
                                                    {(() => {
                                                        const name = order.customer_name || order.reservation?.customer_name || order.invoice?.customer_name
                                                        return (!name || name === 'WALKING_GUEST')
                                                            ? t('reports.walking_guest')
                                                            : name
                                                    })()}
                                                </h3>
                                            </div>
                                            <div className={`px-5 py-2.5 rounded-2xl text-[10px] font-black text-white uppercase tracking-[0.2em] shadow-xl ${statusColor}`}>
                                                {order.status}
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-6 mb-10 pb-6 border-b border-white/80">
                                            {order.table && (
                                                <div className="flex items-center gap-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                    <div className="size-7 rounded-lg bg-indigo-50 text-indigo-500 flex items-center justify-center"><Receipt className="size-4" /></div>
                                                    {order.table.name}
                                                </div>
                                            )}
                                            {order.reservation && (
                                                <div className="flex items-center gap-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                    <div className="size-7 rounded-lg bg-amber-50 text-amber-500 flex items-center justify-center"><Clock className="size-4" /></div>
                                                    {new Date(order.reservation.date_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            )}
                                            <div className="flex items-center gap-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                <div className="size-7 rounded-lg bg-purple-50 text-purple-500 flex items-center justify-center"><Calendar className="size-4" /></div>
                                                {new Date(order.created_at).toLocaleDateString()}
                                            </div>
                                        </div>

                                        <div className="flex-1 space-y-5 mb-12">
                                            {order.items.map((item) => (
                                                <div key={item.id} className="flex justify-between items-center group/item transition-all">
                                                    <div className="flex items-center gap-4">
                                                        <div className="size-8 rounded-xl bg-slate-900 text-white flex items-center justify-center text-[11px] font-black shadow-lg group-hover/item:scale-110 transition-transform">
                                                            {item.quantity}
                                                        </div>
                                                        <span className="text-sm font-black text-slate-800 uppercase tracking-tight group-hover/item:text-indigo-600 transition-colors">
                                                            {item.menu_item?.name || 'Deleted Item'}
                                                        </span>
                                                    </div>
                                                    <span className="text-xs font-black text-slate-400 tabular-nums">
                                                        {formatCurrency(item.price * item.quantity)}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="mt-auto pt-8 border-t border-white/80 flex justify-between items-end">
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] leading-none">{t('reports.grand_total')}</p>
                                                <div className="text-4xl font-black text-slate-900 tracking-tighter tabular-nums leading-none">
                                                    {formatCurrency(total)}
                                                </div>
                                            </div>
                                            <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest tabular-nums bg-white/40 px-3 py-1.5 rounded-xl border border-white/60">
                                                {t('reports.paid_at')} {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>

                {/* Advanced Pagination */}
                {history && history.last_page > 1 && (
                    <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-50">
                        <div className="glass flex justify-center items-center gap-10 px-10 py-5 rounded-[2.5rem] border-white/60 shadow-2xl shadow-indigo-900/10 backdrop-blur-3xl">
                            <button
                                disabled={page === 1}
                                onClick={() => { setPage(p => p - 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                className="size-14 rounded-2xl glass hover:bg-white text-slate-600 disabled:opacity-20 border-white/60 transition-all duration-500 flex items-center justify-center hover:scale-110 active:scale-90"
                            >
                                <ChevronLeft className="size-6" />
                            </button>

                            <div className="flex items-center gap-5">
                                <div className="space-y-0.5 text-center">
                                    <div className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em]">{t('common.page')}</div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-2xl font-black text-indigo-600 tabular-nums">{history.current_page}</span>
                                        <span className="text-xs font-black uppercase text-slate-300">/</span>
                                        <span className="text-xl font-black text-slate-400 tabular-nums">{history.last_page}</span>
                                    </div>
                                </div>
                            </div>

                            <button
                                disabled={page === history.last_page}
                                onClick={() => { setPage(p => p + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                className="size-14 rounded-2xl glass hover:bg-white text-slate-600 disabled:opacity-20 border-white/60 transition-all duration-500 flex items-center justify-center hover:scale-110 active:scale-90"
                            >
                                <ChevronRight className="size-6" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div >
    )
}
