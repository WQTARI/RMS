import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell
} from 'recharts'
import {
  TrendingUp, Users, DollarSign, Utensils,
  ChevronRight, ArrowUpRight, Award
} from 'lucide-react'
import {
  fetchDailySales,
  fetchMonthlySales,
  fetchSalesBySection,
  fetchTablePerformance,
  fetchTopItems,
  fetchSalesTrend,
  fetchReservationStats
} from '../api/reports'
import { PageHeader } from '../components/PageHeader'
import { Can } from '../components/Can'
import { formatCurrency } from '../utils/format'

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

export const ReportsPage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [days, setDays] = useState(30)

  // Queries
  const { data: trend = [] } = useQuery({ queryKey: ['reports', 'trend', days], queryFn: () => fetchSalesTrend(days) })
  const { data: today = { total: 0 } } = useQuery({ queryKey: ['reports', 'daily', 'today'], queryFn: () => fetchDailySales() })
  const { data: month = { total: 0 } } = useQuery({ queryKey: ['reports', 'monthly', 'current'], queryFn: () => fetchMonthlySales() })
  const { data: sections = [] } = useQuery({ queryKey: ['reports', 'sections'], queryFn: fetchSalesBySection })
  const { data: items = [] } = useQuery({ queryKey: ['reports', 'top-items'], queryFn: () => fetchTopItems(10) })
  const { data: tables = [] } = useQuery({ queryKey: ['reports', 'tables'], queryFn: fetchTablePerformance })
  const { data: resStats = { total_reservations: 0, total_guests: 0, by_status: [] } } = useQuery({
    queryKey: ['reports', 'res-stats', days],
    queryFn: () => fetchReservationStats(days)
  })

  // Summaries
  const totalRevenue = trend.reduce((acc, curr) => acc + Number(curr.total || 0), 0)
  // Calculate Average Daily using ACTIVE days (days with sales) instead of the selected period
  // This avoids artificially low averages for new restaurants with only a few days of data
  const activeDays = trend.length
  const avgDaily = activeDays > 0 ? totalRevenue / activeDays : 0

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass p-5 rounded-3xl border border-white/50 shadow-2xl animate-in fade-in zoom-in-95">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
          <p className="text-xl font-black text-indigo-600">{formatCurrency(payload[0].value)}</p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="pb-20">
      <PageHeader
        title={t('reports.hub_title')}
        subtitle={t('reports.hub_subtitle')}
      />

      <Can I="view_reports" fallback={<div className="p-12 text-center text-slate-400 font-bold italic glass m-4 rounded-3xl">{t('common.access_denied')}</div>}>
        <div className="px-4 mt-8 space-y-8">

          {/* KPI Row */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard title={t('reports.today_revenue')} value={formatCurrency(Number(today.total || 0))} icon={<DollarSign className="w-6 h-6" />} color="indigo" />
            <KpiCard title={t('reports.monthly_sales')} value={formatCurrency(Number(month.total || 0))} icon={<TrendingUp className="w-6 h-6" />} color="emerald" />
            <KpiCard title={t('reports.total_reservations')} value={resStats.total_reservations.toString()} icon={<Users className="w-6 h-6" />} color="amber" />
            <KpiCard title={t('reports.avg_daily')} value={formatCurrency(avgDaily)} icon={<Award className="w-6 h-6" />} color="purple" />
          </div>

          {/* ... (Trend/Section charts unchanged) ... */}

          {/* Secondary Grid: Trend & Distribution */}
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2 glass rounded-[3rem] p-10 border-white/40 shadow-2xl shadow-indigo-500/5 flex flex-col h-[450px]">
              <div className="flex justify-between items-center mb-10">
                <div className="space-y-1">
                  <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] leading-none mb-1">{t('reports.revenue_analytics')}</h3>
                  <div className="h-1 w-12 bg-gradient-to-r from-indigo-500 to-transparent rounded-full" />
                </div>
                <div className="flex bg-white/40 backdrop-blur-md p-1.5 rounded-2xl border border-white/60">
                  {[7, 30, 90].map(d => (
                    <button key={d} onClick={() => setDays(d)} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all duration-500 ${days === d ? 'bg-white text-indigo-600 shadow-xl' : 'text-slate-500 hover:text-indigo-600 hover:bg-white/60'}`}>{t('common.days_filter', { count: d })}</button>
                  ))}
                </div>
              </div>
              <div className="flex-1 min-h-0">
                {trend.length > 0 && (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#818cf8" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: '#94a3b8' }} dy={15} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: '#94a3b8' }} tickFormatter={(v) => `${v}`} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={5} fillOpacity={1} fill="url(#colorTotal)" animationDuration={2000} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="glass rounded-[3rem] p-10 border-white/40 shadow-2xl shadow-indigo-500/5 flex flex-col h-[450px]">
              <div className="space-y-1 mb-10">
                <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] leading-none mb-1">{t('reports.category_spread')}</h3>
                <div className="h-1 w-12 bg-gradient-to-r from-purple-500 to-transparent rounded-full" />
              </div>
              <div className="flex-1 min-h-0 flex flex-col items-center">
                {sections.length > 0 && (
                  <>
                    <ResponsiveContainer width="100%" height="70%">
                      <PieChart>
                        <Pie
                          data={sections}
                          dataKey="total"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={65}
                          outerRadius={90}
                          paddingAngle={10}
                          animationBegin={200}
                          animationDuration={1500}
                        >
                          {sections.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} strokeWidth={0} />)}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-wrap gap-4 mt-6 justify-center">
                      {sections.map((s, idx) => (
                        <div key={idx} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/40 border border-white/60 shadow-sm">
                          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                          <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{t(`common.${s.name.toLowerCase()}`)}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Tertiary Grid: Reservations & Performance */}
          <div className="grid gap-8 lg:grid-cols-2">
            {/* Reservations Distribution */}
            <div className="glass rounded-[3rem] p-10 border-white/40 shadow-2xl shadow-indigo-500/5 flex flex-col h-[500px]">
              <div className="flex justify-between items-start mb-10">
                <div className="space-y-1">
                  <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] leading-none mb-1">{t('reports.reservation_status')}</h3>
                  <div className="h-1 w-12 bg-gradient-to-r from-amber-500 to-transparent rounded-full" />
                </div>
                <div className="text-right glass px-6 py-3 rounded-2xl border border-white/60">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('reports.total_guests')}</div>
                  <div className="text-2xl font-black text-slate-900 leading-none tabular-nums">{resStats.total_guests}</div>
                </div>
              </div>
              <div className="flex-1 min-h-0">
                {resStats.by_status.length > 0 && (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={resStats.by_status} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <XAxis dataKey="status" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: '#94a3b8' }} tickFormatter={(s) => t(`status.${s.toLowerCase()}`)} dy={15} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: '#94a3b8' }} />
                      <Tooltip cursor={{ fill: 'rgba(255,255,255,0.4)', radius: 15 }} content={<CustomTooltip />} />
                      <Bar dataKey="count" radius={[15, 15, 0, 0]} animationDuration={1800}>
                        {resStats.by_status.map((_, index) => (
                          <Cell key={index} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Top Signature Items */}
            <div className="glass rounded-[3rem] p-10 border-white/40 shadow-2xl shadow-indigo-500/5 flex flex-col h-[500px]">
              <div className="flex justify-between items-center mb-10">
                <div className="space-y-1">
                  <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] leading-none mb-1">{t('reports.top_items')}</h3>
                  <div className="h-1 w-24 bg-gradient-to-r from-indigo-500 to-transparent rounded-full" />
                </div>
                <div className="size-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/10">
                  <Award className="size-6" />
                </div>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto pr-4 custom-scrollbar space-y-4">
                {items.map((item, idx) => (
                  <div key={idx} className="group relative glass rounded-[2rem] p-6 border-white/60 hover:bg-white/80 transition-all duration-500">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-5">
                        <div className="size-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-sm font-black shadow-xl group-hover:scale-110 transition-transform duration-500">
                          {idx + 1}
                        </div>
                        <div>
                          <div className="text-base font-black text-slate-900 uppercase tracking-tighter mb-1 line-clamp-1">{item.menu_item?.name}</div>
                          <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">x{item.qty} {t('common.total')}</div>
                        </div>
                      </div>
                    </div>
                    <div className="h-2 w-full bg-white/40 rounded-full overflow-hidden border border-white/40 shadow-inner">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 rounded-full shadow-lg shadow-indigo-500/20 group-hover:animate-pulse"
                        style={{ width: `${(item.qty / (items[0]?.qty || 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Table Yield Analysis */}
          <div className="glass rounded-[3rem] p-10 border-white/40 shadow-2xl shadow-indigo-500/5">
            <div className="flex justify-between items-center mb-10">
              <div className="space-y-1">
                <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] leading-none mb-1">{t('reports.floor_efficiency')}</h3>
                <div className="h-1 w-24 bg-gradient-to-r from-emerald-500 to-transparent rounded-full" />
              </div>
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest glass px-5 py-2 rounded-xl border border-white/60">{t('reports.sorted_yield')}</div>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {tables.map(t_item => (
                <div key={t_item.id} className="relative glass rounded-[2.5rem] p-8 border-white/80 hover:bg-white/80 transition-all duration-500 group overflow-hidden">
                  <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Utensils className="size-20 -rotate-12" />
                  </div>
                  <div className="flex items-center justify-between mb-10">
                    <div className="size-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-xl shadow-2xl shadow-slate-900/30 group-hover:scale-110 transition-transform duration-500">
                      {t_item.name}
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('common.order')}</div>
                      <div className="text-lg font-black text-slate-900 tabular-nums">{t_item.orders_count}</div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex justify-between items-end border-b border-white/60 pb-4">
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">{t('reports.yield_label')}</div>
                      <div className="text-lg font-black text-slate-900 tabular-nums">{formatCurrency(t_item.invoices_sum_total || 0)}</div>
                    </div>
                    <div className="flex justify-between items-end">
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">{t('reports.avg_order')}</div>
                      <div className="text-sm font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-xl tabular-nums">{formatCurrency(t_item.avg_order_value || 0)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Global CTA */}
          <div className="relative overflow-hidden bg-slate-900 rounded-[3rem] p-16 text-center text-white shadow-2xl shadow-indigo-900/20">
            <div className="relative z-10 space-y-8">
              <h2 className="text-5xl font-black uppercase tracking-tighter italic animate-pulse-subtle">{t('reports.drill_down_title')}</h2>
              <p className="text-lg text-slate-400 font-bold max-w-2xl mx-auto">{t('reports.drill_down_hint')}</p>
              <button
                onClick={() => navigate('/reports/order-history')}
                className="group inline-flex items-center gap-4 px-12 py-6 bg-white text-slate-900 rounded-[2rem] font-black text-base uppercase tracking-widest shadow-2xl hover:scale-110 active:scale-95 transition-all duration-500"
              >
                {t('reports.go_to_history')}
                <div className="size-6 bg-slate-100 rounded-lg flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  <ChevronRight size={18} />
                </div>
              </button>
            </div>
            {/* Aura Background for CTA */}
            <div className="absolute top-[-50%] right-[-10%] w-[40rem] h-[40rem] bg-indigo-600/20 blur-[120px] rounded-full animate-blob pointer-events-none" />
            <div className="absolute bottom-[-50%] left-[-10%] w-[40rem] h-[40rem] bg-purple-600/10 blur-[120px] rounded-full animate-blob pointer-events-none" style={{ animationDelay: '2s' }} />
          </div>

        </div>
      </Can>
    </div>
  )
}

const KpiCard = ({ title, value, icon, color }: any) => {
  const colors: any = {
    indigo: 'from-indigo-600 to-indigo-500 shadow-indigo-500/20',
    emerald: 'from-emerald-600 to-emerald-500 shadow-emerald-500/20',
    amber: 'from-amber-500 to-amber-400 shadow-amber-500/20',
    purple: 'from-purple-600 to-purple-500 shadow-purple-500/20',
  }

  return (
    <div className="glass rounded-[2.5rem] p-8 border-white/60 hover:border-white/90 hover:bg-white/70 transition-all duration-700 group hover:-translate-y-2 shadow-2xl shadow-indigo-500/5">
      <div className="flex items-center gap-6 mb-8">
        <div className={`size-16 rounded-[1.5rem] bg-gradient-to-br ${colors[color] || colors.indigo} flex items-center justify-center text-white shadow-2xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-700`}>
          {icon}
        </div>
        <div className="space-y-1">
          <div className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none mb-1">{title}</div>
          <div className="h-0.5 w-8 bg-slate-200 rounded-full group-hover:w-full transition-all duration-700" />
        </div>
      </div>
      <div className="flex items-end justify-between">
        <div className="text-3xl font-black text-slate-900 tracking-tighter tabular-nums leading-none">{value}</div>
        <div className="size-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500 shadow-inner">
          <ArrowUpRight size={18} strokeWidth={2.5} />
        </div>
      </div>
    </div>
  )
}
