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
    <div className="min-h-screen bg-slate-50/50 pb-12">
      <PageHeader title={t('nav.bookings')} subtitle={t('common.operational_center')} />

      <div className="grid gap-6 px-4 lg:grid-cols-[1fr,3fr]">
        <div className="space-y-6">
          {canManageReservations && (
            <form
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
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
              <h2 className="text-xl font-bold text-slate-900 mb-4">{t('common.new_res')}</h2>
              {actionError && <p className="mb-4 text-sm font-bold text-rose-500 bg-rose-50 p-3 rounded-xl">{actionError}</p>}
              <div className="grid gap-4">
                <input className="w-full rounded-xl border border-slate-200 p-4 text-base focus:ring-2 focus:ring-indigo-500 font-bold" placeholder={t('common.customer_name')} value={formState.customer_name} onChange={e => setFormState(p => ({ ...p, customer_name: e.target.value }))} required />
                <input className="w-full rounded-xl border border-slate-200 p-4 text-base font-bold" placeholder={t('common.phone')} value={formState.phone} onChange={e => setFormState(p => ({ ...p, phone: e.target.value }))} required />
                <div className="space-y-1.5">
                  <label className="text-sm font-black text-slate-400 uppercase tracking-widest leading-none">{t('common.date_time')}</label>
                  <input type="datetime-local" className="w-full rounded-xl border border-slate-200 p-4 text-base font-bold" value={formState.date_time} onChange={e => setFormState(p => ({ ...p, date_time: e.target.value }))} required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input type="number" placeholder={t('common.guests')} className="rounded-xl border border-slate-200 p-4 text-base font-bold" value={formState.number_of_guests} onChange={e => setFormState(p => ({ ...p, number_of_guests: Number(e.target.value) }))} required />
                  <input type="number" placeholder={t('common.minutes')} className="rounded-xl border border-slate-200 p-4 text-base font-bold" value={formState.duration_minutes} onChange={e => setFormState(p => ({ ...p, duration_minutes: Number(e.target.value) }))} />
                </div>
                <select className="w-full rounded-xl border border-slate-200 p-4 text-base font-bold bg-white" value={formState.table_id} onChange={e => setFormState(p => ({ ...p, table_id: e.target.value }))} required>
                  <option value="">{t('common.select_table')}</option>
                  {tables.map(t_item => <option key={t_item.id} value={t_item.id}>{t_item.name} ({t_item.section?.name})</option>)}
                </select>
                <textarea className="w-full rounded-xl border border-slate-200 p-4 text-base font-bold" placeholder={t('common.notes')} value={formState.notes} onChange={e => setFormState(p => ({ ...p, notes: e.target.value }))} rows={2} />
                <button type="submit" disabled={createMutation.isPending} className="w-full rounded-xl bg-slate-900 py-4 font-black uppercase tracking-widest text-white hover:bg-slate-800 disabled:opacity-50 shadow-xl shadow-slate-200 transition-all active:scale-[0.98]">
                  {createMutation.isPending ? t('common.loading') : t('common.create_res')}
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex gap-1 overflow-x-auto no-scrollbar max-w-[70%]">
              {(['TODAY', 'UPCOMING', 'COMPLETED', 'CANCELLED', 'ALL'] as FilterStatus[]).map(f => (
                <button key={f} onClick={() => setFilter(f)} className={`whitespace-nowrap px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${filter === f ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>{t(`common.${f.toLowerCase()}`)}</button>
              ))}
            </div>
            <div className="px-4 text-sm font-bold text-slate-400">{filteredReservations.length} {t('common.bookings')}</div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-bottom border-slate-100 italic">
                    <th className="px-6 py-5 text-sm font-black uppercase tracking-wider text-slate-400">{t('common.time_customer')}</th>
                    <th className="px-6 py-5 text-sm font-black uppercase tracking-wider text-slate-400">{t('common.guests_table')}</th>
                    <th className="px-6 py-5 text-sm font-black uppercase tracking-wider text-slate-400">{t('common.status')}</th>
                    <th className="px-6 py-5 text-sm font-black uppercase tracking-wider text-slate-400 text-right">{t('common.actions_header')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reservationsLoading ? (
                    <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic">{t('common.finding_bookings')}</td></tr>
                  ) : filteredReservations.length === 0 ? (
                    <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic">{t('common.no_bookings_found')}</td></tr>
                  ) : (
                    filteredReservations.map((res) => (
                      <tr key={res.id} className="group hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-5">
                          <div className="text-base font-black text-slate-900">{formatLiteralTime(res.date_time)}</div>
                          <div className="text-base font-bold text-slate-600">{res.customer_name}</div>
                          <div className="text-xs font-bold text-slate-400 mt-1">{res.phone}</div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-black text-slate-600">{res.number_of_guests}</span>
                            <span className="text-base font-black text-slate-700">{res.table?.name}</span>
                          </div>
                          <div className="text-xs font-bold text-slate-400 mt-1">{res.table?.section?.name}</div>
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge status={res.status} />
                        </td>
                        <td className="px-6 py-5 text-right">
                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            {res.status === 'CREATED' && (
                              <button onClick={() => statusMutation.mutate({ id: res.id, status: 'ARRIVED' })} className="rounded-xl bg-indigo-50 px-4 py-2 text-sm font-black text-indigo-600 hover:bg-indigo-100 uppercase tracking-widest transition-all">{t('common.arrived')}</button>
                            )}
                            {res.status === 'ARRIVED' && (
                              <button onClick={() => setConvertItem(res)} className="rounded-xl bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-600 hover:bg-emerald-100 uppercase tracking-widest transition-all">{t('common.seat_guest')}</button>
                            )}
                            {res.status === 'SEATED' && (
                              <button onClick={() => statusMutation.mutate({ id: res.id, status: 'COMPLETED' })} className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-black text-slate-800 hover:bg-slate-200 uppercase tracking-widest transition-all">{t('common.end_session')}</button>
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
                              className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-black text-slate-600 hover:bg-rose-50 hover:text-rose-600 uppercase tracking-widest transition-all"
                            >
                              {t('common.delete')}
                            </button>
                            {res.status !== 'CANCELLED' && (
                              <button onClick={() => statusMutation.mutate({ id: res.id, status: 'CANCELLED' })} className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-black text-slate-600 hover:bg-rose-50 hover:text-rose-600 uppercase tracking-widest transition-all">{t('common.cancel')}</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {convertItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-white p-8 shadow-2xl animate-in zoom-in-95">
            <h3 className="text-2xl font-bold text-slate-900">{t('common.seat_title', { name: convertItem.customer_name })}</h3>
            <p className="text-slate-500 text-sm mt-1">{t('common.seat_hint', { table: convertItem.table?.name })}</p>

            <div className="mt-6 space-y-3 max-h-[40vh] overflow-y-auto pr-2">
              {convertLines.map((line, idx) => (
                <div key={idx} className="flex gap-2">
                  <select className="flex-1 rounded-xl border border-slate-200 p-4 text-base font-bold bg-white" value={line.menu_item_id} onChange={e => {
                    const n = [...convertLines]; n[idx].menu_item_id = Number(e.target.value); setConvertLines(n);
                  }}>
                    <option value={0}>{t('common.select_area')}</option>
                    {menuItems.map(m => <option key={m.id} value={m.id}>{m.name} ({formatCurrency(m.price)})</option>)}
                  </select>
                  <input type="number" min={1} className="w-20 rounded-xl border border-slate-200 p-4 text-base font-bold" value={line.quantity} onChange={e => {
                    const n = [...convertLines]; n[idx].quantity = Number(e.target.value); setConvertLines(n);
                  }} />
                  <button onClick={() => setConvertLines(convertLines.filter((_, i) => i !== idx))} className="px-3 text-2xl text-rose-500 font-black">×</button>
                </div>
              ))}
              <button onClick={() => setConvertLines([...convertLines, { menu_item_id: 0, quantity: 1 }])} className="text-xs font-bold text-indigo-600 hover:underline">+ {t('common.add_item_btn')}</button>
            </div>

            <div className="mt-8 flex gap-3">
              <button onClick={() => setConvertItem(null)} className="flex-1 rounded-2xl border border-slate-200 py-4 font-bold text-slate-600">{t('common.cancel')}</button>
              <button
                onClick={() => {
                  const valid = convertLines.filter(l => l.menu_item_id > 0);
                  convertMutation.mutate({ id: convertItem.id, items: valid })
                }}
                className="flex-1 rounded-2xl bg-indigo-600 py-4 font-bold text-white shadow-lg shadow-indigo-100"
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

const StatusBadge = ({ status }: { status: string | undefined }) => {
  const { t } = useTranslation()
  const styles: Record<string, string> = {
    CREATED: 'bg-indigo-50 text-indigo-600',
    ARRIVED: 'bg-amber-50 text-amber-600',
    SEATED: 'bg-emerald-50 text-emerald-600',
    CANCELLED: 'bg-rose-50 text-rose-600',
    COMPLETED: 'bg-slate-100 text-slate-600',
  }
  const s = status || 'CREATED'
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black uppercase tracking-widest ${styles[s] || styles.CREATED}`}>
      {t(`status.${s.toLowerCase()}`)}
    </span>
  )
}
