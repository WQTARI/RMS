import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { createReservation, convertReservation, fetchReservations, updateReservation, deleteReservation } from '../api/reservations'
import { fetchTables } from '../api/tables'
import { fetchMenuItems } from '../api/menuItems'
import { PageHeader } from '../components/PageHeader'
import { Dialog } from '../components/Dialog'
import { formatCurrency, formatLiteralTime } from '../utils/format'
import type { Reservation } from '../types'
import { useAuth } from '../context/AuthContext'
import { Calendar, Clock, Users } from 'lucide-react'
import { StatusPill } from '../components/StatusPill'

type FilterStatus = 'TODAY' | 'UPCOMING' | 'COMPLETED' | 'CANCELLED' | 'ALL'

export const ReservationsPage = () => {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { hasRole, hasAnyRole } = useAuth()
  const canManageReservations = hasRole('admin') || hasAnyRole(['receptionist'])

  const [filter, setFilter] = useState<FilterStatus>('TODAY')
  const [searchParams] = useSearchParams()

  const { data: tables = [] } = useQuery({ queryKey: ['tables'], queryFn: fetchTables })
  const { data: menuItems = [] } = useQuery({
    queryKey: ['menu-items'],
    queryFn: () => fetchMenuItems({ active: true }),
  })

  const {
    data: reservations = [],
    isLoading: reservationsLoading,
  } = useQuery({
    queryKey: ['reservations', filter],
    queryFn: () => {
      const params: any = {}
      if (filter === 'TODAY' || filter === 'COMPLETED' || filter === 'CANCELLED') {
        // We might want to filter by date for COMPLETED too, but let's keep it simple for now
        // OR, if the user wants ALL completed, we omit date.
        if (filter === 'TODAY') {
          const now = new Date()
          const pad = (n: number) => n.toString().padStart(2, '0')
          params.date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
        }
      }
      return fetchReservations(params)
    },
  })

  const [formState, setFormState] = useState({
    customer_name: '',
    phone: '',
    date_time: '',
    duration_minutes: 90,
    number_of_guests: 2,
    table_id: '',
    notes: '',
  })

  const [convertItem, setConvertItem] = useState<Reservation | null>(null)
  const [convertLines, setConvertLines] = useState<{ menu_item_id: number; quantity: number }[]>([
    { menu_item_id: 0, quantity: 1 }
  ])

  useEffect(() => {
    const tableId = searchParams.get('tableId')
    if (tableId) setFormState((prev) => ({ ...prev, table_id: tableId }))
  }, [searchParams])

  const [actionError, setActionError] = useState<string | null>(null)
  const [dialog, setDialog] = useState<{
    isOpen: boolean;
    title: string;
    description?: string;
    type: 'info' | 'danger' | 'warning' | 'prompt';
    onConfirm: (val?: string) => void;
  }>({ isOpen: false, title: '', type: 'info', onConfirm: () => { } })

  const createMutation = useMutation({
    mutationFn: createReservation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] })
      setFormState({ customer_name: '', phone: '', date_time: '', duration_minutes: 90, number_of_guests: 2, table_id: '', notes: '' })
      setActionError(null)
    },
    onError: (err: any) => {
      console.error('Reservation Error:', err)
      const data = err.response?.data
      const msg = data?.message || (data?.errors ? Object.values(data.errors).flat().join(' ') : t('common.create_failed'))
      setDialog({ isOpen: true, title: t('common.create_failed'), description: msg, type: 'danger', onConfirm: () => { } })
    },
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => updateReservation(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reservations'] }),
  })

  const convertMutation = useMutation({
    mutationFn: ({ id, items }: { id: number; items: { menu_item_id: number; quantity: number }[] }) =>
      convertReservation(id, items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['tables'] })
      setConvertItem(null)
      setActionError(null)
    },
    onError: () => setDialog({ isOpen: true, title: t('common.convert_failed'), type: 'danger', onConfirm: () => { } }),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteReservation,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reservations'] }),
  })

  const filteredReservations = useMemo(() => {
    if (filter === 'UPCOMING') {
      const now = new Date()
      return reservations.filter(r => {
        const resDate = new Date(r.date_time)
        // If it's a T...Z string, Date() will shift it. 
        // But for filtering 'upcoming', it's usually fine as long as both are compared in the same reference.
        // However, to be perfectly safe with 'Upcoming' vs 'Today', we should be careful.
        return resDate > now && r.status !== 'COMPLETED' && r.status !== 'CANCELLED'
      })
    }
    if (filter === 'TODAY') {
      return reservations.filter(r => r.status !== 'COMPLETED' && r.status !== 'CANCELLED')
    }
    if (filter === 'COMPLETED') {
      return reservations.filter(r => r.status === 'COMPLETED')
    }
    if (filter === 'CANCELLED') {
      return reservations.filter(r => r.status === 'CANCELLED')
    }
    return reservations
  }, [reservations, filter])

  return (
    <div className="pb-20 space-y-12 animate-in fade-in duration-700">
      <PageHeader title={t('nav.bookings')} subtitle={t('common.operational_center')} />

      <div className="grid gap-12 xl:grid-cols-[400px,1fr] items-start">
        {/* 1. Aura Reservation Form Sidebar */}
        <div className="space-y-8 h-fit">
          {canManageReservations && (
            <form
              className="glass rounded-[3rem] p-10 lg:p-12 space-y-8 relative overflow-hidden group shadow-2xl shadow-indigo-500/5 border-white/40"
              onSubmit={(e) => {
                e.preventDefault()
                createMutation.mutate({
                  ...formState,
                  table_id: Number(formState.table_id),
                  number_of_guests: Number(formState.number_of_guests),
                  duration_minutes: Number(formState.duration_minutes),
                })
              }}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-[60px] -translate-y-1/2 translate-x-1/2" />

              <h2 className="text-2xl font-black text-slate-900 tracking-tighter mb-2">{t('common.new_res')}</h2>

              {actionError && (
                <div className="p-4 rounded-2xl bg-accent/10 border border-accent/20 text-accent-dark text-xs font-black uppercase tracking-widest animate-pulse">
                  {actionError}
                </div>
              )}

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="field-label">{t('common.customer_name')}</label>
                  <input className="glass-input" placeholder="e.g. John Doe" value={formState.customer_name} onChange={e => setFormState(p => ({ ...p, customer_name: e.target.value }))} required />
                </div>

                <div className="space-y-2">
                  <label className="field-label">{t('common.phone')}</label>
                  <input className="glass-input" placeholder="05XXXXXXXX" value={formState.phone} onChange={e => setFormState(p => ({ ...p, phone: e.target.value }))} required />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="field-label">{t('common.guests')}</label>
                    <input type="number" className="glass-input" value={formState.number_of_guests} onChange={e => setFormState(p => ({ ...p, number_of_guests: Number(e.target.value) }))} required />
                  </div>
                  <div className="space-y-2">
                    <label className="field-label">{t('common.minutes')}</label>
                    <input type="number" className="glass-input" value={formState.duration_minutes} onChange={e => setFormState(p => ({ ...p, duration_minutes: Number(e.target.value) }))} />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="field-label">{t('common.date_time')}</label>
                  <input type="datetime-local" className="glass-input" value={formState.date_time} onChange={e => setFormState(p => ({ ...p, date_time: e.target.value }))} required />
                </div>

                <div className="space-y-2">
                  <label className="field-label">{t('common.select_table')}</label>
                  <select className="glass-input appearance-none bg-white/30" value={formState.table_id} onChange={e => setFormState(p => ({ ...p, table_id: e.target.value }))} required>
                    <option value="">{t('common.select_table')}</option>
                    {tables.map(t_item => <option key={t_item.id} value={t_item.id}>{t_item.name} ({t_item.section?.name})</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="field-label">{t('common.notes')}</label>
                  <textarea className="glass-input resize-none py-4" placeholder="..." value={formState.notes} onChange={e => setFormState(p => ({ ...p, notes: e.target.value }))} rows={2} />
                </div>

                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="btn-aura w-full group/btn"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    {createMutation.isPending ? t('common.loading') : t('common.create_res')}
                  </span>
                  <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-500" />
                </button>
              </div>
            </form>
          )}
        </div>

        {/* 2. Aura Reservations List */}
        <div className="space-y-10">
          <div className="flex flex-col sm:flex-row items-center justify-between bg-white/40 backdrop-blur-xl p-3 sm:p-4 rounded-[2.5rem] border border-white/60 shadow-xl shadow-indigo-500/5 group gap-4">
            <div className="flex gap-2 overflow-x-auto no-scrollbar px-2 w-full sm:w-auto">
              {(['TODAY', 'UPCOMING', 'COMPLETED', 'CANCELLED', 'ALL'] as FilterStatus[]).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`whitespace-nowrap px-8 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all duration-500 ${filter === f
                    ? 'bg-primary text-white shadow-lg shadow-primary/30 scale-105'
                    : 'text-slate-500 hover:bg-white/60 hover:text-primary'}
                  `}
                >
                  {t(`common.${f.toLowerCase()}`)}
                </button>
              ))}
            </div>
            <div className="hidden sm:flex items-center gap-3 px-6 py-3 rounded-2xl bg-white/50 border border-white/60">
              <span className="size-2 rounded-full bg-primary animate-pulse" />
              <span className="text-xs font-black text-slate-600 uppercase tracking-widest">{filteredReservations.length} {t('common.bookings')}</span>
            </div>
          </div>

          <div className="grid gap-8 sm:grid-cols-1 xl:grid-cols-2">
            {reservationsLoading ? (
              <div className="col-span-full flex flex-col items-center justify-center py-32 text-slate-400">
                <div className="h-16 w-16 animate-spin rounded-[2rem] border-4 border-slate-100 border-t-primary mb-8" />
                <p className="text-xs font-black uppercase tracking-[0.5em] animate-pulse">{t('common.finding_bookings')}</p>
              </div>
            ) : filteredReservations.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center py-32 glass rounded-[3rem] text-slate-400 border-dashed border-2">
                <Calendar className="size-16 mb-6 opacity-20" />
                <p className="text-xs font-black uppercase tracking-[0.5em]">{t('common.no_bookings_found')}</p>
              </div>
            ) : (
              filteredReservations.map((res, idx) => (
                <div
                  key={res.id}
                  className="group relative glass rounded-[3rem] p-8 transition-all duration-700 hover:-translate-y-3 hover:bg-white/60 hover:shadow-indigo-500/10 animate-in fade-in slide-in-from-bottom border-white/60 shadow-xl shadow-slate-200/50"
                  style={{ animationDelay: `${idx * 100}ms`, animationFillMode: 'both' }}
                >
                  <div className="flex items-start justify-between mb-8">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="bg-primary/10 text-primary px-4 py-2 rounded-xl text-lg font-black tracking-tight flex items-center gap-2">
                          <Clock className="size-4" />
                          {formatLiteralTime(res.date_time)}
                        </div>
                      </div>
                      <h3 className="text-3xl font-black text-slate-900 truncate tracking-tighter">{res.customer_name}</h3>
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{res.phone}</p>
                    </div>
                    <StatusPill status={res.status as any} />
                  </div>

                  {/* Info Grid */}
                  <div className="grid gap-6 mb-8 group/info">
                    <div className="bg-white/30 backdrop-blur-md rounded-[2rem] p-6 border border-white/60 group-hover:bg-white/60 transition-colors flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="size-12 rounded-2xl bg-slate-900/5 flex items-center justify-center text-slate-700 font-black">
                          {res.number_of_guests}
                        </div>
                        <div className="font-black text-slate-900 tracking-tighter text-xl">
                          {res.table?.name}
                          <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest leading-none mt-1">{res.table?.section?.name}</div>
                        </div>
                      </div>
                      <Users className="size-6 text-slate-300" />
                    </div>

                    {res.notes && (
                      <div className="bg-amber-500/5 backdrop-blur-md rounded-[2rem] p-6 border border-amber-500/10 group-hover:bg-amber-500/10 transition-colors">
                        <p className="text-[10px] font-black text-amber-600 uppercase tracking-[0.2em] mb-2">{t('common.notes')}</p>
                        <p className="text-sm font-bold text-slate-700 leading-relaxed italic">
                          "{res.notes}"
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap justify-end gap-3 pt-4 border-t border-white/40">
                    {res.status === 'CREATED' && (
                      <button onClick={() => statusMutation.mutate({ id: res.id, status: 'ARRIVED' })} className="px-6 py-3 rounded-xl bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all duration-500 shadow-lg shadow-primary/5">{t('common.arrived')}</button>
                    )}
                    {res.status === 'ARRIVED' && (
                      <button onClick={() => setConvertItem(res)} className="px-6 py-3 rounded-xl bg-emerald-500/10 text-emerald-600 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all duration-500 shadow-lg shadow-emerald-500/5">{t('common.seat_guest')}</button>
                    )}
                    {res.status === 'SEATED' && (
                      <button onClick={() => statusMutation.mutate({ id: res.id, status: 'COMPLETED' })} className="px-6 py-3 rounded-xl bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all duration-500">{t('common.end_session')}</button>
                    )}

                    <button
                      onClick={() => {
                        setDialog({
                          isOpen: true,
                          title: t('common.delete'),
                          description: t('common.delete_confirm'),
                          type: 'danger',
                          onConfirm: () => deleteMutation.mutate(res.id)
                        })
                      }}
                      className="px-6 py-3 rounded-xl bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest hover:bg-accent/10 hover:text-accent-dark transition-all duration-500"
                    >
                      {t('common.delete')}
                    </button>

                    {res.status !== 'CANCELLED' && (
                      <button onClick={() => statusMutation.mutate({ id: res.id, status: 'CANCELLED' })} className="px-6 py-3 rounded-xl bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest hover:bg-accent/10 hover:text-accent-dark transition-all duration-500">{t('common.cancel')}</button>
                    )}
                  </div>

                  {/* Dynamic Glass Glow */}
                  <div className="absolute -bottom-10 -right-10 size-40 bg-primary/10 rounded-full blur-[80px] opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {convertItem && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 sm:p-4 backdrop-blur-3xl bg-slate-900/60 animate-in fade-in duration-500">
          <div className="w-full max-w-2xl bg-white/95 rounded-[3.5rem] p-10 sm:p-14 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.4)] animate-in zoom-in-95 duration-500 border border-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />

            <h3 className="text-4xl font-black text-slate-900 tracking-tighter mb-4">{t('common.seat_title', { name: convertItem.customer_name })}</h3>
            <p className="text-slate-600 text-sm font-bold uppercase tracking-widest mb-10 pb-6 border-b border-slate-100">{t('common.seat_hint', { table: convertItem.table?.name })}</p>

            <div className="space-y-6 max-h-[50vh] overflow-y-auto no-scrollbar pr-2 mb-12">
              {convertLines.map((line, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row gap-5 p-7 bg-slate-50 rounded-[2.5rem] border border-slate-200/60 group/item hover:bg-white hover:border-emerald-500/30 transition-all shadow-sm">
                  <div className="flex-1 space-y-2">
                    <label className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] ml-2 block">{t('common.item_name')}</label>
                    <select
                      className="w-full h-14 bg-white border border-slate-200 rounded-2xl px-6 font-bold text-slate-900 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none"
                      value={line.menu_item_id}
                      onChange={e => {
                        const n = [...convertLines]; n[idx].menu_item_id = Number(e.target.value); setConvertLines(n);
                      }}
                    >
                      <option value={0}>{t('common.item_name')}</option>
                      {menuItems.map(m => <option key={m.id} value={m.id}>{m.name} ({formatCurrency(m.price)})</option>)}
                    </select>
                  </div>
                  <div className="w-full sm:w-28 space-y-2">
                    <label className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] text-center block">QTY</label>
                    <input
                      type="number"
                      min={1}
                      className="w-full h-14 bg-white border border-slate-200 rounded-2xl text-center font-bold text-slate-900 transition-all outline-none focus:border-emerald-500"
                      value={line.quantity}
                      onChange={e => {
                        const n = [...convertLines]; n[idx].quantity = Number(e.target.value); setConvertLines(n);
                      }}
                    />
                  </div>
                  <button onClick={() => setConvertLines(convertLines.filter((_, i) => i !== idx))} className="sm:self-end h-14 w-14 rounded-2xl bg-slate-200/50 text-slate-500 hover:bg-accent/10 hover:text-accent-dark transition-all font-black text-2xl flex items-center justify-center">×</button>
                </div>
              ))}

              <button
                onClick={() => setConvertLines([...convertLines, { menu_item_id: 0, quantity: 1 }])}
                className="w-full py-6 rounded-[2rem] border-2 border-dashed border-emerald-500/30 text-[11px] font-black text-emerald-600 uppercase tracking-[0.3em] hover:bg-emerald-500 hover:text-white hover:border-emerald-500 transition-all duration-500 bg-emerald-500/5 shadow-sm"
              >
                + {t('common.add_item_btn')}
              </button>
            </div>

            <div className="flex gap-6">
              <button onClick={() => setConvertItem(null)} className="flex-1 py-6 rounded-3xl bg-slate-100 text-xs font-black text-slate-500 uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all shadow-sm">{t('common.cancel')}</button>
              <button
                onClick={() => {
                  const valid = convertLines.filter(l => l.menu_item_id > 0);
                  convertMutation.mutate({ id: convertItem.id, items: valid })
                }}
                className="flex-1 py-6 rounded-3xl bg-emerald-500 text-white shadow-xl shadow-emerald-500/30 text-xs font-black uppercase tracking-widest hover:bg-emerald-600 transition-all active:scale-[0.98] border border-emerald-400"
              >
                {t('common.seat_confirm')}
              </button>
            </div>
          </div>
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
