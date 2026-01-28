import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend
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
  const totalRevenue = trend.reduce((acc, curr) => acc + curr.total, 0)
  const avgDaily = days > 0 ? totalRevenue / days : 0

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      <PageHeader
        title={t('reports.hub_title')}
        subtitle={t('reports.hub_subtitle')}
      />

      <Can I="view_reports" fallback={<div className="p-12 text-center text-slate-400 font-bold italic glass m-4 rounded-3xl">{t('common.access_denied')}</div>}>
        <div className="px-4 mt-8 space-y-8">

          {/* KPI Row */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard title={t('reports.today_revenue')} value={formatCurrency(today.total)} icon={<DollarSign className="w-5 h-5" />} color="indigo" />
            <KpiCard title={t('reports.monthly_sales')} value={formatCurrency(month.total)} icon={<TrendingUp className="w-5 h-5" />} color="emerald" />
            <KpiCard title={t('reports.total_reservations')} value={resStats.total_reservations} icon={<Users className="w-5 h-5" />} color="amber" />
            <KpiCard title={t('reports.avg_daily')} value={formatCurrency(avgDaily)} icon={<Award className="w-5 h-5" />} color="purple" />
          </div>

          {/* ... (Trend/Section charts unchanged) ... */}

          {/* Secondary Grid: Trend & Distribution */}
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2 bg-white rounded-[40px] p-8 border border-slate-200 shadow-sm h-[400px] flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest leading-none">{t('reports.revenue_analytics')}</h3>
                <div className="flex bg-slate-50 p-1 rounded-xl">
                  {[7, 30, 90].map(d => (
                    <button key={d} onClick={() => setDays(d)} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-tighter transition-all ${days === d ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>{t('common.days_filter', { count: d })}</button>
                  ))}
                </div>
              </div>
              <div style={{ height: '300px', width: '100%' }}>
                {trend.length > 0 && (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={trend}>
                      <defs>
                        <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: '#94a3b8' }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: '#94a3b8' }} tickFormatter={(v) => `${v}`} />
                      <Tooltip
                        contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)', padding: '16px' }}
                        labelClassName="text-xs font-black text-slate-800 uppercase tracking-widest mb-2 block"
                      />
                      <Area type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={4} fillOpacity={1} fill="url(#colorTotal)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="bg-white rounded-[40px] p-8 border border-slate-200 shadow-sm flex flex-col h-[400px]">
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest leading-none mb-6">{t('reports.category_spread')}</h3>
              <div style={{ height: '320px', width: '100%' }}>
                {sections.length > 0 && (
                  <ResponsiveContainer width="100%" height={320}>
                    <PieChart>
                      <Pie
                        data={sections}
                        dataKey="total"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={8}
                      >
                        {sections.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} strokeWidth={0} />)}
                      </Pie>
                      <Tooltip />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '20px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {/* Tertiary Grid: Reservations & Performance */}
          <div className="grid gap-8 lg:grid-cols-2">
            {/* Reservations Distribution */}
            <div className="bg-white rounded-[40px] p-8 border border-slate-200 shadow-sm flex flex-col h-[450px]">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest leading-none">{t('reports.reservation_status')}</h3>
                <div className="flex gap-4">
                  <div className="text-right">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('reports.total_guests')}</div>
                    <div className="text-lg font-black text-slate-900 leading-none">{resStats.total_guests}</div>
                  </div>
                </div>
              </div>
              <div style={{ height: '340px', width: '100%' }}>
                {resStats.by_status.length > 0 && (
                  <ResponsiveContainer width="100%" height={340}>
                    <BarChart data={resStats.by_status}>
                      <XAxis dataKey="status" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: '#94a3b8' }} tickFormatter={(s) => t(`status.${s.toLowerCase()}`)} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: '#94a3b8' }} />
                      <Tooltip
                        cursor={{ fill: '#f8fafc' }}
                        contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      />
                      <Bar dataKey="count" radius={[12, 12, 0, 0]}>
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
            <div className="bg-white rounded-[40px] p-8 border border-slate-200 shadow-sm flex flex-col h-[450px]">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest leading-none">{t('reports.top_items')}</h3>
                <Utensils className="text-indigo-600 w-5 h-5" />
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto pr-2 custom-scrollbar">
                <div className="space-y-3">
                  {items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 rounded-3xl bg-slate-50 border border-slate-100 group transition-all hover:bg-white hover:shadow-md">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 flex-shrink-0 rounded-2xl bg-white border border-slate-200 flex items-center justify-center font-black text-slate-400 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 transition-all">
                          {idx + 1}
                        </div>
                        <div>
                          <div className="text-sm font-black text-slate-800 uppercase tracking-tight leading-tight mb-1">{item.menu_item?.name}</div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('common.order')} x{item.qty}</div>
                        </div>
                      </div>
                      <div className="h-2 w-24 rounded-full bg-slate-200 overflow-hidden">
                        <div
                          className="h-full bg-indigo-600 rounded-full"
                          style={{ width: `${(item.qty / (items[0]?.qty || 1)) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Table Yield Analysis */}
          <div className="bg-white rounded-[40px] p-8 border border-slate-200 shadow-sm">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest leading-none">{t('reports.floor_efficiency')}</h3>
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('reports.sorted_yield')}</div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {tables.map(t_item => (
                <div key={t_item.id} className="p-6 rounded-[32px] bg-slate-50 border border-slate-100 hover:border-indigo-200 hover:bg-white transition-all group flex flex-col justify-between h-full">
                  <div className="flex items-center justify-between mb-6">
                    <div className="h-12 w-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center font-black text-lg text-slate-900 shadow-sm group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                      {t_item.name}
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('common.order')}</div>
                      <div className="text-sm font-black text-slate-900 leading-none">{t_item.orders_count}</div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-end border-b border-slate-200/50 pb-2">
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{t('reports.yield_label')}</div>
                      <div className="text-base font-black text-slate-900 leading-none">{formatCurrency(t_item.invoices_sum_total || 0)}</div>
                    </div>
                    <div className="flex justify-between items-end">
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{t('reports.avg_order')}</div>
                      <div className="text-sm font-black text-emerald-600 leading-none">{formatCurrency(t_item.avg_order_value || 0)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Global CTA */}
          <div className="relative overflow-hidden bg-slate-900 rounded-[40px] p-12 text-center text-white shadow-2xl shadow-slate-300">
            <div className="relative z-10">
              <h2 className="text-3xl font-black uppercase tracking-tight mb-4 italic">{t('reports.drill_down_title')}</h2>
              <p className="text-slate-400 font-bold mb-8">{t('reports.drill_down_hint')}</p>
              <button
                onClick={() => navigate('/reports/order-history')}
                className="inline-flex items-center gap-3 px-10 py-5 bg-white text-slate-900 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all"
              >
                {t('reports.go_to_history')} <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            {/* Abstract shapes for premium feel */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[100px] rounded-full" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 blur-[100px] rounded-full" />
          </div>

        </div>
      </Can>
    </div>
  )
}

const KpiCard = ({ title, value, icon, color }: any) => {
  const colors: any = {
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
  }

  return (
    <div className={`rounded-3xl border p-6 bg-white shadow-sm hover:shadow-lg transition-all group`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-2xl ${colors[color] || colors.indigo} border`}>
          {icon}
        </div>
        <ArrowUpRight className="w-4 h-4 text-slate-300" />
      </div>
      <div className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none mb-2">{title}</div>
      <div className="text-2xl font-black text-slate-900 leading-none">{value}</div>
    </div>
  )
}
