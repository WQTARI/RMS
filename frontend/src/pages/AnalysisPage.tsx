import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { fetchOrderHistory } from '../api/reports'
import { PageHeader } from '../components/PageHeader'
import { formatCurrency } from '../utils/format'
import { Receipt, Hash, Clock, Calendar, ArrowLeft } from 'lucide-react'

export const AnalysisPage = () => {
    const { t } = useTranslation()
    const navigate = useNavigate()

    const {
        data: history,
        isLoading,
        isError,
    } = useQuery({
        queryKey: ['analysis-limited-history'],
        queryFn: () => fetchOrderHistory({
            page: 1, // Always first page for limited view
        }),
    })

    const orders = history?.data || []

    return (
        <div className="pb-32">
            <div className="px-10 py-8">
                <button
                    onClick={() => navigate('/')}
                    className="group glass flex items-center gap-4 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-indigo-600 hover:bg-white/80 transition-all duration-500 shadow-xl shadow-indigo-500/5"
                >
                    <ArrowLeft className="w-5 h-5" />
                    {t('common.back')}
                </button>
            </div>

            <PageHeader
                title="Analysis Daily Report"
                subtitle="Daily limited record view (Top 5)"
            />

            <div className="px-10 mt-12 space-y-10">
                <div className="grid gap-8 lg:grid-cols-2 xl:grid-cols-3">
                    {isLoading ? (
                        Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="aspect-[4/5] bg-white/20 rounded-[3rem] animate-pulse border border-white/40" />
                        ))
                    ) : isError ? (
                        <div className="col-span-full py-32 text-center glass rounded-[3rem] border-dashed border-2 border-rose-200">
                            <p className="text-sm font-black text-rose-500 uppercase tracking-widest">{t('reports.history_error')}</p>
                        </div>
                    ) : orders.length === 0 ? (
                        <div className="col-span-full py-40 text-center flex flex-col items-center gap-10 glass rounded-[4rem] border-dashed border-2">
                            <div className="size-32 rounded-[3.5rem] bg-slate-900/5 flex items-center justify-center">
                                <Receipt className="size-20 text-slate-200" />
                            </div>
                            <p className="text-base font-black text-slate-400 uppercase tracking-[0.4em]">{t('reports.no_records')}</p>
                        </div>
                    ) : (
                        orders.map((order: any) => {
                            const total = order.items?.reduce((sum: number, i: any) => sum + i.price * i.quantity, 0) || 0
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
                                                    {order.customer_name || t('reports.walking_guest')}
                                                </h3>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-6 mb-10 pb-6 border-b border-white/80 text-slate-400 font-bold uppercase text-[9px]">
                                            <div className="flex items-center gap-2"><Calendar className="size-3 text-indigo-500" /> {new Date(order.created_at).toLocaleDateString()}</div>
                                            <div className="flex items-center gap-2"><Clock className="size-3 text-purple-500" /> {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                        </div>

                                        <div className="mt-auto pt-8 border-t border-white/80 flex justify-between items-end">
                                            <div className="space-y-1">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] leading-none">{t('reports.grand_total')}</p>
                                                <div className="text-4xl font-black text-slate-900 tracking-tighter tabular-nums leading-none">
                                                    {formatCurrency(total)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>

                <div className="p-8 glass rounded-[2rem] border-amber-200 bg-amber-50/30">
                    <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest text-center">
                        Note: This is a limited analytical view restricted to the top 5 records of the day.
                    </p>
                </div>
            </div>
        </div>
    )
}
