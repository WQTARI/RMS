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
        <div className="min-h-screen bg-slate-50/50 pb-20">
            {/* Context Navigation */}
            <div className="px-4 py-4">
                <button
                    onClick={() => navigate('/reports')}
                    className="group flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                    {t('common.back')}
                </button>
            </div>

            <PageHeader
                title={t('nav.archive')}
                subtitle={t('common.historical_audit')}
            />

            <div className="px-4 mt-8 space-y-6">

                {/* Search & Filter Bar */}
                <div className="bg-white rounded-[32px] p-6 border border-slate-200 shadow-sm flex flex-wrap gap-4 items-center">
                    <div className="relative flex-1 min-w-[300px]">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder={t('reports.search_hint')}
                            className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        />
                    </div>

                    <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-2xl">
                        <div className="flex items-center gap-2 px-3 border-r border-slate-200">
                            <Calendar className="w-4 h-4 text-slate-400" />
                            <input
                                type="date"
                                className="bg-transparent border-none text-xs font-black uppercase outline-none p-0 cursor-pointer"
                                value={startDate}
                                onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                            />
                        </div>
                        <div className="flex items-center gap-2 px-3">
                            <input
                                type="date"
                                className="bg-transparent border-none text-xs font-black uppercase outline-none p-0 cursor-pointer"
                                value={endDate}
                                onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                            />
                        </div>
                    </div>

                    {(search || startDate || endDate) && (
                        <button
                            onClick={() => { setSearch(''); setStartDate(''); setEndDate(''); setPage(1); }}
                            className="px-6 py-4 bg-rose-50 text-rose-600 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-rose-100 transition-colors"
                        >
                            {t('common.clear_filters')}
                        </button>
                    )}
                </div>

                {/* Orders List */}
                <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
                    {isLoading ? (
                        Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="h-64 bg-white rounded-[32px] border border-slate-100 animate-pulse" />
                        ))
                    ) : isError ? (
                        <div className="col-span-full py-20 text-center">
                            <p className="text-sm font-bold text-rose-500">{t('common.history_error')}</p>
                        </div>
                    ) : orders.length === 0 ? (
                        <div className="col-span-full py-20 text-center flex flex-col items-center gap-4">
                            <Receipt className="w-12 h-12 text-slate-200" />
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">{t('common.no_records')}</p>
                        </div>
                    ) : (
                        orders.map((order) => {
                            const total = order.items.reduce((sum, i) => sum + i.price * i.quantity, 0)
                            return (
                                <div
                                    key={order.id}
                                    className="group relative bg-white rounded-[32px] border border-slate-200 p-8 shadow-sm hover:shadow-xl transition-all hover:-translate-y-1 overflow-hidden"
                                >
                                    {/* Receipt Visual Polish */}
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50/50 rounded-bl-[100px] -mr-8 -mt-8 grayscale group-hover:grayscale-0 transition-all opacity-50" />

                                    <div className="relative z-10">
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2 text-xs font-black uppercase text-indigo-600 tracking-tighter">
                                                    <Hash className="w-3 h-3" /> {order.id}
                                                </div>
                                                <h3 className="text-2xl font-black text-slate-900 leading-none">
                                                    {order.customer_name || t('common.walking_guest')}
                                                </h3>
                                            </div>
                                            <div className="bg-slate-900 text-white px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest">
                                                {order.status}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4 mb-8 text-xs font-bold text-slate-400 uppercase tracking-widest">
                                            <div className="flex items-center gap-1.5">
                                                <Receipt className="w-3.5 h-3.5" />
                                                {t('common.area')}: {order.table?.name || '---'}
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <Clock className="w-3.5 h-3.5" />
                                                {new Date(order.created_at).toLocaleDateString()}
                                            </div>
                                        </div>

                                        <div className="space-y-3 mb-8 border-y border-slate-50 py-6">
                                            {order.items.map((item) => (
                                                <div key={item.id} className="flex justify-between items-center text-xs font-bold">
                                                    <span className="text-slate-700 flex items-center gap-2">
                                                        <span className="w-6 h-6 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-xs font-black text-slate-400">
                                                            {item.quantity}
                                                        </span>
                                                        {item.menu_item?.name || 'Deleted Item'}
                                                    </span>
                                                    <span className="text-slate-500 tabular-nums">
                                                        {formatCurrency(item.price * item.quantity)}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="flex justify-between items-end">
                                            <div>
                                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{t('common.grand_total')}</p>
                                                <div className="text-3xl font-black text-slate-900 leading-none tabular-nums">
                                                    {formatCurrency(total)}
                                                </div>
                                            </div>
                                            <div className="text-xs font-bold text-slate-300 italic">
                                                {t('common.paid_at')} {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                    <div className="flex justify-center items-center gap-6 mt-12 bg-white rounded-full p-4 border border-slate-200 shadow-sm w-fit mx-auto">
                        <button
                            disabled={page === 1}
                            onClick={() => { setPage(p => p - 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                            className="p-3 rounded-full hover:bg-slate-50 border border-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                        >
                            <ChevronLeft className="w-5 h-5 text-slate-600" />
                        </button>

                        <div className="flex items-center gap-2">
                            <span className="text-xs font-black uppercase text-slate-400">{t('common.page')}</span>
                            <span className="text-sm font-black text-slate-900">{history.current_page}</span>
                            <span className="text-xs font-black uppercase text-slate-200">{t('common.of')}</span>
                            <span className="text-sm font-black text-slate-400">{history.last_page}</span>
                        </div>

                        <button
                            disabled={page === history.last_page}
                            onClick={() => { setPage(p => p + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                            className="p-3 rounded-full hover:bg-slate-50 border border-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                        >
                            <ChevronRight className="w-5 h-5 text-slate-600" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
