import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useEffect, useState } from 'react'
import { fetchTables } from '../api/tables'
import { fetchReservations } from '../api/reservations'
import { PageHeader } from '../components/PageHeader'
import { StatusPill } from '../components/StatusPill'
import type { RestaurantTable, Reservation } from '../types'
import { Users, Clock, Calendar } from 'lucide-react'
import { formatLiteralTime, parseLiteralDate } from '../utils/format'
import { Can } from '../components/Can'

import { useRealtime } from '../realtime/RealtimeProvider'

export const FloorPlanPage = () => {
  const { t } = useTranslation()
  const { isEnabled: isRealtimeEnabled } = useRealtime()

  const { data: tables = [], isLoading: tablesLoading } = useQuery({
    queryKey: ['tables'],
    queryFn: fetchTables,
    refetchInterval: isRealtimeEnabled ? false : 5000,
  })

  const { data: reservations = [] } = useQuery({
    queryKey: ['reservations', 'today'],
    queryFn: () => fetchReservations({ date: new Date().toISOString().split('T')[0] }),
    refetchInterval: isRealtimeEnabled ? false : 30000, // Faster updates for tables, slower for reservations
  })

  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 10000)
    return () => clearInterval(timer)
  }, [])

  const getReservedSoon = (tableId: number): Reservation | undefined => {
    const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000)
    return reservations.find(res =>
      res.table_id === tableId &&
      res.status !== 'CANCELLED' &&
      res.status !== 'SEATED' &&
      parseLiteralDate(res.date_time) > now &&
      parseLiteralDate(res.date_time) < twoHoursLater
    )
  }

  const getOccupiedTime = (table: RestaurantTable) => {
    const activeOrder = table.orders?.find(o => o.status !== 'CLOSED')
    if (!activeOrder || !activeOrder.started_at) return null

    const start = new Date(activeOrder.started_at)
    const diff = Math.floor((now.getTime() - start.getTime()) / (1000 * 60))
    return diff >= 0 ? diff : 0
  }

  const groupedTables = tables.reduce((acc, table) => {
    const sectionName = table.section?.name || 'Unassigned'
    if (!acc[sectionName]) acc[sectionName] = []
    acc[sectionName].push(table)
    return acc
  }, {} as Record<string, RestaurantTable[]>)

  return (
    <div className="pb-16 space-y-12">
      {/* 1. Ultra-Premium Header: Glassmorphism & Fluid Layout */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-10 bg-slate-50/40 backdrop-blur-2xl p-10 lg:p-14 rounded-[3rem] mb-16 animate-in fade-in slide-in-from-top duration-1000 border border-white/50 shadow-2xl shadow-indigo-500/5 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 group-hover:bg-primary/10 transition-colors duration-700" />

        <PageHeader
          title={t('nav.floor_plan')}
          subtitle={t('common.operational_center')}
        />

        <div className="flex items-center gap-12 sm:gap-16 rtl:flex-row-reverse transform transition-all">
          <div className="text-center md:text-right rtl:md:text-left group/stat">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] leading-none mb-4 opacity-70 group-hover/stat:text-emerald-500 transition-colors">
              {t('common.live_status')}
            </p>
            <p className="text-4xl md:text-5xl font-black text-slate-900 flex items-center gap-4">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              {tables.length} <span className="text-xl text-slate-400 font-bold tracking-tight">{t('admin.tables')}</span>
            </p>
          </div>

          <div className="h-20 w-[1px] bg-slate-200/50 hidden sm:block rotate-12" />

          <div className="text-center md:text-right rtl:md:text-left group/stat">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] leading-none mb-4 opacity-70 group-hover/stat:text-primary transition-colors">
              {t('common.today')}
            </p>
            <p className="text-4xl md:text-5xl font-black text-primary flex items-center gap-3">
              {reservations.length} <span className="text-xl text-primary/40 font-bold tracking-tight">{t('nav.bookings')}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-20">
        {tablesLoading ? (
          <div className="flex flex-col items-center justify-center py-32 text-slate-400">
            <div className="h-16 w-16 animate-spin rounded-[2rem] border-4 border-slate-100 border-t-primary mb-8" />
            <p className="text-xs font-black uppercase tracking-[0.5em] animate-pulse">{t('common.mapping')}</p>
          </div>
        ) : Object.entries(groupedTables).map(([sectionName, sectionTables], sectionIdx) => (
          <div
            key={sectionName}
            className="space-y-12 animate-in fade-in slide-in-from-bottom duration-1000"
            style={{ animationDelay: `${sectionIdx * 200} ms`, animationFillMode: 'both' }}
          >
            {/* 2. Sleek Section Header with Advanced Border */}
            <div className="flex items-center gap-8 px-4">
              <div className="flex flex-col gap-1">
                <h2 className="text-3xl font-black text-slate-900 tracking-tighter leading-none">{sectionName}</h2>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                  <span className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">{sectionTables.length} {t('admin.tables')}</span>
                </div>
              </div>
              <div className="h-[1px] flex-1 bg-gradient-to-r from-slate-200 via-slate-100 to-transparent" />
            </div>

            {/* 3. Optimized Grid: Fluid Column Response */}
            <div className="grid gap-10 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 px-2">
              {sectionTables.map((table) => {
                const reservationSoon = getReservedSoon(table.id)
                const occupiedMinutes = getOccupiedTime(table)

                const statusStyles = {
                  AVAILABLE: 'hover:border-emerald-200 hover:shadow-emerald-500/10',
                  OCCUPIED: 'hover:border-accent/40 hover:shadow-accent/10',
                  RESERVED: 'hover:border-amber-200 hover:shadow-amber-500/10'
                }

                return (
                  <div
                    key={table.id}
                    className={`group relative flex flex-col rounded-[3rem] bg-white/40 backdrop-blur-xl p-8 transition-all duration-700 hover:-translate-y-4 border border-white/60 shadow-2xl shadow-slate-300/20 active:scale-95 cursor-default overflow-hidden ${statusStyles[table.status] || 'border-white/40'}`}
                  >
                    {/* Interior Glow Effect */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                    <div className="flex items-start justify-between mb-10 relative z-10">
                      <div className="space-y-2">
                        <h3 className="text-4xl font-black text-slate-900 leading-none tracking-tighter">{table.name}</h3>
                        <div className="flex items-center gap-2 text-slate-500 bg-slate-100/50 backdrop-blur-sm px-3 py-1.5 rounded-xl w-fit">
                          <Users className="size-4 md:size-5 transition-transform group-hover:scale-110" />
                          <span className="text-[11px] font-black uppercase tracking-widest opacity-80">
                            {table.capacity} <span className="hidden sm:inline">{t('common.guests')}</span>
                          </span>
                        </div>
                      </div>
                      <StatusPill status={table.status} />
                    </div>

                    <div className="flex-1 flex flex-col justify-center mb-10 min-h-[120px] relative z-10">
                      {table.status === 'OCCUPIED' && occupiedMinutes !== null ? (
                        <div className="flex items-center gap-6 rounded-[2rem] bg-accent/10 p-6 border border-accent/10 transition-all group-hover:bg-accent/20">
                          <div className="relative shrink-0">
                            <div className="absolute inset-0 bg-accent rounded-full animate-ping opacity-20"></div>
                            <div className="relative size-14 md:size-16 rounded-[1.5rem] bg-accent flex items-center justify-center text-white shadow-2xl shadow-accent/40 transform group-hover:rotate-12 transition-transform duration-500">
                              <Clock className="size-7 md:size-8" />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="text-[10px] font-black text-accent-dark uppercase tracking-widest leading-none">{t('common.occupied_for')}</div>
                            <div className="text-3xl font-black text-slate-900 tracking-tight">{occupiedMinutes} <span className="text-sm opacity-50">{t('common.minutes')}</span></div>
                          </div>
                        </div>
                      ) : reservationSoon ? (
                        <div className="flex flex-col gap-4 rounded-[2rem] bg-amber-500/10 p-6 border border-amber-500/10 transition-all group-hover:bg-amber-500/20">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5 text-amber-600">
                              <Calendar className="size-5 md:size-6" />
                              <span className="text-[10px] font-black uppercase tracking-widest leading-none">{t('common.upcoming_res')}</span>
                            </div>
                            <span className="text-[11px] font-black text-amber-900 bg-white/50 backdrop-blur-md px-3 py-1 rounded-xl border border-amber-200/50">{formatLiteralTime(reservationSoon.date_time)}</span>
                          </div>
                          <div className="text-lg font-black text-amber-950 truncate flex items-center gap-3">
                            <div className="size-2 rounded-full bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.6)]" />
                            {reservationSoon.customer_name}
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-700 translate-y-4 group-hover:translate-y-0 text-slate-300">
                          <div className="size-12 rounded-full border-2 border-slate-100 flex items-center justify-center mb-3">
                            <div className="size-2 rounded-full bg-emerald-400" />
                          </div>
                          <span className="text-[11px] font-black uppercase tracking-[0.4em]">{t('status.available')}</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 relative z-10">
                      <Can I="manage_reservations">
                        <Link
                          to={`/reservations?tableId=${table.id}`}
                          className="w-full flex items-center justify-center gap-3 rounded-2xl bg-white/60 border border-slate-200/50 py-5 text-center text-xs font-black text-slate-600 uppercase tracking-widest transition-all hover:bg-primary hover:border-primary hover:text-white active:scale-95 shadow-xl shadow-indigo-500/5 hover:shadow-primary/30 group-hover:translate-y-[-2px]"
                        >
                          {t('common.book_table')}
                        </Link>
                      </Can>
                    </div>

                    {/* Dynamic Ambient Background Glow */}
                    <div className={`absolute -bottom-10 -right-10 h-64 w-64 rounded-full blur-[100px] opacity-0 group-hover:opacity-30 transition-all duration-1000 ${table.status === 'OCCUPIED' ? 'bg-accent/40' : 'bg-primary/40'
                      }`} />
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
