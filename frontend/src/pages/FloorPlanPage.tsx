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
      new Date(res.date_time) > now &&
      new Date(res.date_time) < twoHoursLater
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
    <div className="pb-12 space-y-12">
      <div className="flex items-center justify-between gap-4 glass p-8 rounded-3xl mb-12 animate-in fade-in slide-in-from-top duration-700">
        <PageHeader
          title={t('nav.floor_plan')}
          subtitle={t('common.operational_center')}
        />
        <div className="hidden md:flex items-center gap-8">
          <div className="text-right">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">{t('common.live_status')}</p>
            <p className="text-2xl font-black text-slate-900">{tables.length} {t('admin.tables')}</p>
          </div>
          <div className="h-14 w-[1px] bg-slate-200" />
          <div className="text-right">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">{t('common.today')}</p>
            <p className="text-2xl font-black text-primary">{reservations.length} {t('nav.bookings')}</p>
          </div>
        </div>
      </div>

      <div className="space-y-16">
        {tablesLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-primary mb-4" />
            <p className="text-xs font-black uppercase tracking-[0.3em] animate-pulse">{t('common.mapping')}</p>
          </div>
        ) : Object.entries(groupedTables).map(([sectionName, sectionTables], sectionIdx) => (
          <div
            key={sectionName}
            className="space-y-8 animate-in fade-in slide-in-from-bottom duration-700"
            style={{ animationDelay: `${sectionIdx * 150}ms`, animationFillMode: 'both' }}
          >
            <div className="flex items-center gap-6">
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">{sectionName}</h2>
              <div className="h-[1px] flex-1 bg-gradient-to-r from-slate-200 to-transparent" />
              <div className="px-4 py-1.5 rounded-full bg-white border border-slate-200 shadow-sm">
                <span className="text-xs font-black text-slate-500 uppercase tracking-widest">{sectionTables.length} {t('admin.tables')}</span>
              </div>
            </div>

            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {sectionTables.map((table) => {
                const reservationSoon = getReservedSoon(table.id)
                const occupiedMinutes = getOccupiedTime(table)

                const statusStyles = {
                  AVAILABLE: 'shadow-emerald-500/5 border-emerald-500/10',
                  OCCUPIED: 'shadow-rose-500/5 border-rose-500/10',
                  RESERVED: 'shadow-amber-500/5 border-amber-500/10'
                }

                return (
                  <div
                    key={table.id}
                    className={`group relative flex flex-col rounded-[32px] glass p-8 transition-all hover:-translate-y-2 hover:bg-white/90 ${statusStyles[table.status] || 'border-slate-200'}`}
                  >
                    <div className="flex items-start justify-between mb-8">
                      <div className="space-y-2">
                        <h3 className="text-2xl font-black text-slate-900 leading-none tracking-tight">{table.name}</h3>
                        <div className="flex items-center gap-2 text-slate-400">
                          <Users size={14} />
                          <span className="text-xs font-bold uppercase tracking-widest">
                            {table.capacity} {t('common.guests')}
                          </span>
                        </div>
                      </div>
                      <StatusPill status={table.status} />
                    </div>

                    <div className="flex-1 min-h-[80px] mb-8">
                      {table.status === 'OCCUPIED' && occupiedMinutes !== null && (
                        <div className="flex items-center gap-4 rounded-2xl bg-rose-50 p-4 border border-rose-100 transition-colors">
                          <div className="relative">
                            <div className="absolute inset-0 bg-rose-500 rounded-full animate-ping opacity-20"></div>
                            <div className="relative h-9 w-9 rounded-full bg-rose-500 flex items-center justify-center text-white">
                              <Clock size={16} />
                            </div>
                          </div>
                          <div>
                            <div className="text-xs font-black text-rose-600 uppercase tracking-widest leading-none mb-1.5">{t('common.occupied_for')}</div>
                            <div className="text-xl font-black text-rose-900">{occupiedMinutes} min</div>
                          </div>
                        </div>
                      )}

                      {reservationSoon && (
                        <div className="flex flex-col gap-2 rounded-2xl bg-amber-50 p-4 border border-amber-100 transition-colors">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2 text-amber-600">
                              <Calendar size={14} />
                              <span className="text-xs font-black uppercase tracking-widest">{t('common.upcoming_res')}</span>
                            </div>
                            <span className="text-xs font-bold text-amber-600/60">{new Date(reservationSoon.date_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <div className="text-sm font-black text-amber-900 truncate">👤 {reservationSoon.customer_name}</div>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-3">
                      <Can I="manage_reservations">
                        <Link
                          to={`/reservations?tableId=${table.id}`}
                          className="w-full rounded-2xl bg-white border border-slate-200 py-5 text-center text-sm font-black text-slate-500 uppercase tracking-widest transition-all hover:bg-slate-50 active:scale-95 shadow-sm"
                        >
                          {t('common.book_table')}
                        </Link>
                      </Can>
                    </div>

                    {/* Aesthetic Glow Effect */}
                    <div className={`absolute -bottom-4 -right-4 h-32 w-32 rounded-full blur-[80px] opacity-0 group-hover:opacity-30 transition-opacity duration-500 ${table.status === 'OCCUPIED' ? 'bg-rose-200' : 'bg-primary/20'
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
