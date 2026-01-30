import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchTables } from '../api/tables'
import { fetchOrders, createOrder, addItemsToOrder, confirmOrder, cancelOrder } from '../api/orders'
import { fetchMenuItems } from '../api/menuItems'
import { closeInvoice, fetchInvoices, fetchOpenInvoiceForTable, openInvoice } from '../api/invoices'
import { PageHeader } from '../components/PageHeader'
import { formatCurrency } from '../utils/format'
import { Can } from '../components/Can'
import type { MenuItem, Order } from '../types'
import { useTranslation } from 'react-i18next'
import { Dialog } from '../components/Dialog'
import { useRealtime } from '../realtime/RealtimeProvider'
import axios from 'axios'
import { Printer } from 'lucide-react'

export const PosPage = () => {
  const { t, i18n } = useTranslation()
  const queryClient = useQueryClient()
  const { isEnabled: isRealtimeEnabled } = useRealtime()
  const [restaurantSettings, setRestaurantSettings] = useState({
    restaurant_name: '',
    restaurant_logo: '',
  })

  useEffect(() => {
    fetchRestaurantSettings()
  }, [])

  const fetchRestaurantSettings = async () => {
    try {
      const response = await axios.get('/api/settings')
      setRestaurantSettings(response.data)
    } catch (error) {
      console.error('Failed to fetch restaurant settings:', error)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const {
    data: tables = [],
    isLoading: isLoadingTables,
  } = useQuery({
    queryKey: ['tables'],
    queryFn: fetchTables,
    refetchInterval: isRealtimeEnabled ? false : 5000,
  })

  const [selectedTableId, setSelectedTableId] = useState<number | null>(null)
  const [invoiceId, setInvoiceId] = useState<number | null>(null)
  const [tax, setTax] = useState(0)
  const [discount, setDiscount] = useState(0)

  const { data: menuItems = [], isLoading: isLoadingMenu } = useQuery({
    queryKey: ['menu-items', 'active'],
    queryFn: () => fetchMenuItems({ active: true }),
  })

  const { data: openTakeaways = [], isLoading: isLoadingTakeaways } = useQuery({
    queryKey: ['invoices', 'open', 'takeaway'],
    queryFn: () => fetchInvoices({ status: 'OPEN', table_id: null }),
    refetchInterval: isRealtimeEnabled ? false : 10000,
  })

  const {
    data: orders = [],
    isLoading: ordersLoading,
    isError: ordersError,
  } = useQuery({
    queryKey: ['orders', selectedTableId, invoiceId],
    queryFn: () => {
      const params: Record<string, unknown> = { status: 'ACTIVE' }
      // Prioritize table_id for dine-in orders
      if (selectedTableId) {
        params.table_id = selectedTableId
      } else if (invoiceId) {
        // Only use invoice_id for takeaway orders (no table)
        params.invoice_id = invoiceId
      }
      return fetchOrders(params)
    },
    enabled: selectedTableId !== null || invoiceId !== null,
    refetchInterval: isRealtimeEnabled ? false : 5000,
  })

  const {
    data: openInvoiceForTable,
    isLoading: invoiceLoading,
  } = useQuery({
    queryKey: ['invoices', 'open', selectedTableId],
    queryFn: () => fetchOpenInvoiceForTable(selectedTableId ?? 0),
    enabled: selectedTableId !== null,
    refetchInterval: isRealtimeEnabled ? false : 10000,
  })

  const [actionError, setActionError] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const categories = ['ALL', 'FOOD', 'DESSERT', 'DRINK']
  useEffect(() => {
    if (!selectedCategory && menuItems.length > 0) {
      setSelectedCategory('ALL')
    }
  }, [menuItems, selectedCategory])

  const [dialog, setDialog] = useState<{
    isOpen: boolean;
    title: string;
    description?: string;
    type: 'info' | 'danger' | 'warning' | 'prompt';
    onConfirm: (val?: string) => void;
  }>({ isOpen: false, title: '', type: 'info', onConfirm: () => { } })
  const [modifierItem, setModifierItem] = useState<MenuItem | null>(null)
  const [modQty, setModQty] = useState(1)
  const [modNotes, setModNotes] = useState('')

  const confirmMutation = useMutation({
    mutationFn: (orderId: number) => {
      console.log('Confirming order:', orderId)
      return confirmOrder(orderId)
    },
    onSuccess: (data) => {
      console.log('Order confirmed successfully:', data)
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['tables'] })
    },
    onError: (e) => {
      console.error('Confirmation failed:', e)
      setDialog({
        isOpen: true,
        title: t('pos.confirm_failed'),
        description: e instanceof Error ? e.message : t('common.error'),
        type: 'danger',
        onConfirm: () => { }
      })
    },
  })

  const cancelMutation = useMutation({
    mutationFn: (orderId: number) => cancelOrder(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['tables'] })
    },
    onError: (e) => {
      setDialog({
        isOpen: true,
        title: t('common.error'),
        description: e instanceof Error ? e.message : t('common.error'),
        type: 'danger',
        onConfirm: () => { }
      })
    }
  })

  useEffect(() => {
    if (!selectedCategory && categories.length > 0) {
      setSelectedCategory(categories[0])
    }
  }, [categories, selectedCategory])

  const openMutation = useMutation({
    mutationFn: (payload: { tableId: number | null; customerName?: string }) =>
      openInvoice(payload.tableId, payload.customerName),
    onSuccess: (invoice) => {
      setInvoiceId(invoice.id)
      setActionError(null)
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
    },
    onError: () => setActionError('Failed to open invoice.'),
  })

  // Auto-Open Invoice Logic
  useEffect(() => {
    if (selectedTableId !== null && !invoiceId && !openMutation.isPending && !invoiceLoading) {
      const table = tables.find(t => t.id === selectedTableId)
      if (table) {
        openMutation.mutate({ tableId: selectedTableId })
      }
    }
  }, [selectedTableId, invoiceId, tables, invoiceLoading, openMutation])

  const [paymentLines, setPaymentLines] = useState<{ method: string; amount: number }[]>([
    { method: 'CASH', amount: 0 }
  ])

  const addPaymentLine = () => setPaymentLines([...paymentLines, { method: 'ELECTRONIC', amount: 0 }])
  const removePaymentLine = (index: number) => setPaymentLines(paymentLines.filter((_, i) => i !== index))
  const updatePaymentLine = (index: number, field: string, value: any) => {
    const next = [...paymentLines]
    const finalValue = field === 'amount' ? Math.max(0, value) : value
    next[index] = { ...next[index], [field]: finalValue }
    setPaymentLines(next)
  }

  const handleQuickCash = () => {
    setPaymentLines([{ method: 'CASH', amount: total }])
  }

  const closeMutation = useMutation({
    mutationFn: (payload: { id: number; tax: number; discount: number; payments: { method: string; amount: number }[] }) =>
      closeInvoice(payload.id, {
        tax: payload.tax,
        discount: payload.discount,
        payments: payload.payments,
      }),
    onSuccess: () => {
      setInvoiceId(null)
      setSelectedTableId(null)
      setTax(0)
      setDiscount(0)
      setPaymentLines([{ method: 'CASH', amount: 0 }])
      setActionError(null)
      queryClient.invalidateQueries({ queryKey: ['tables'] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
    },
    onError: (e) => {
      console.error('Closing failed:', e)
      const apiError = (e as any)?.response?.data?.message
      setDialog({
        isOpen: true,
        title: t('common.error'),
        description: apiError || t('pos.close_failed'),
        type: 'danger',
        onConfirm: () => { }
      })
    },
  })

  const handleCloseInvoice = () => {
    if (!invoiceId) return
    setDialog({
      isOpen: true,
      title: t('pos.close_pay'),
      description: t('pos.confirm_payment_desc'), // Add translation key or use string
      type: 'warning',
      onConfirm: () => closeMutation.mutate({ id: invoiceId, tax, discount, payments: paymentLines })
    })
  }

  const addToTableMutation = useMutation({
    mutationFn: async ({
      tableId,
      items,
      invoiceId: explicitInvoiceId,
      customerName,
    }: {
      tableId: number | null
      items: { menu_item_id: number; quantity: number; notes?: string }[]
      invoiceId?: number | null
      customerName?: string
    }) => {
      const valid = items.filter((i) => i.menu_item_id > 0 && i.quantity >= 1)
      if (valid.length === 0) throw new Error('Add at least one item.')

      // Auto-determine target: use first existing order or create new one
      const targetOrder = orders.find(o => o.status === 'OPEN' || o.status === 'IN_PROGRESS');

      if (!targetOrder) {
        return createOrder({
          table_id: tableId,
          items: valid,
          invoice_id: explicitInvoiceId,
          customer_name: customerName
        })
      }
      return addItemsToOrder(targetOrder.id, valid)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['tables'] })
    },
    onError: (e) => {
      console.error('Add item error:', e)
      const errorMsg = e instanceof Error ? e.message : 'Action failed.'
      const apiError = (e as any)?.response?.data?.message
      setDialog({
        isOpen: true,
        title: t('common.error'),
        description: apiError || errorMsg,
        type: 'danger',
        onConfirm: () => { }
      })
    },
  })

  useEffect(() => {
    if (openInvoiceForTable?.id) {
      setInvoiceId(openInvoiceForTable.id)
      return
    }
    if (!invoiceLoading && selectedTableId !== null) {
      setInvoiceId(null)
    }
  }, [openInvoiceForTable, invoiceLoading, selectedTableId])


  const subtotal = useMemo(() => {
    const list = Array.isArray(orders) ? orders : ((orders as unknown) as { data: Order[] })?.data || []
    return list.flatMap((order) => order.items || []).reduce((sum, item) => sum + (item.price * item.quantity), 0)
  }, [orders])
  const total = Math.max(0, subtotal + Number(tax || 0) - Number(discount || 0))

  // Auto-fill payment amount
  useEffect(() => {
    if (total > 0 && paymentLines.length === 1 && paymentLines[0].amount === 0) {
      setPaymentLines([{ ...paymentLines[0], amount: total }])
    }
  }, [total, invoiceId])

  return (
    <div className="pb-20 space-y-12 animate-in fade-in duration-700">
      <PageHeader title={t('nav.pos')} subtitle={t('pos.aggregate_subtitle')} />

      <div className="grid gap-10 xl:grid-cols-[1fr,450px] items-start">
        <div className="space-y-10">
          {/* 1. Session Selector (Takeaway & Tables) */}
          <div className="glass rounded-[3rem] p-8 lg:p-12 space-y-10 shadow-2xl shadow-indigo-500/5 border-white/40">
            {/* Takeaway Section */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1">
                  <h2 className="text-sm font-black text-slate-400 uppercase tracking-[0.3em] leading-none mb-1">{t('pos.take_away')}</h2>
                  <div className="h-1 w-12 bg-gradient-to-r from-primary to-transparent rounded-full" />
                </div>
                {isLoadingTakeaways ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-primary" />
                ) : (
                  <span className="text-[10px] font-black bg-primary/10 text-primary px-3 py-1 rounded-full uppercase tracking-tighter shadow-sm border border-primary/10">
                    {openTakeaways.length} {t('common.active')}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                <button
                  type="button"
                  disabled={openMutation.isPending}
                  onClick={() => setDialog({
                    isOpen: true,
                    title: t('pos.take_away'),
                    description: t('pos.customer_name_prompt') || 'Enter customer name:',
                    type: 'prompt',
                    onConfirm: (val) => openMutation.mutate({ tableId: null, customerName: val })
                  })}
                  className={`group relative flex flex-col items-center justify-center rounded-[2rem] border-2 aspect-square transition-all duration-500 hover:-translate-y-2 ${selectedTableId === null && !invoiceId
                    ? 'border-primary bg-primary/10 text-primary shadow-xl shadow-primary/20'
                    : 'border-dashed border-slate-200 bg-white/20 text-slate-400 hover:border-primary/40 hover:bg-white/60 hover:text-primary'
                    } ${openMutation.isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="absolute inset-0 bg-primary/5 rounded-[2rem] opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative z-10 size-12 rounded-[1.25rem] bg-white shadow-xl shadow-slate-200/50 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                    {openMutation.isPending ? <div className="size-6 animate-spin rounded-full border-2 border-slate-200 border-t-primary" /> : '➕'}
                  </div>
                  <div className="relative z-10 mt-4 text-[10px] font-black uppercase tracking-widest">{t('pos.new_session')}</div>
                </button>

                {!isLoadingTakeaways && openTakeaways.map((takeaway: any) => (
                  <button
                    key={takeaway.id}
                    type="button"
                    onClick={() => { setSelectedTableId(null); setInvoiceId(takeaway.id) }}
                    className={`group relative flex flex-col items-center justify-center rounded-[2rem] border-2 aspect-square transition-all duration-500 hover:-translate-y-2 ${invoiceId === takeaway.id && selectedTableId === null
                      ? 'border-primary bg-primary text-white shadow-2xl shadow-primary/30 scale-105'
                      : 'border-white/60 bg-white/40 text-slate-600 hover:border-primary/40 hover:bg-white/80'
                      }`}
                  >
                    <div className={`size-12 rounded-[1.25rem] flex items-center justify-center text-2xl mb-3 shadow-xl ${invoiceId === takeaway.id && selectedTableId === null ? 'bg-white/20' : 'bg-white shadow-slate-200/50'}`}>
                      🥡
                    </div>
                    <div className="text-[11px] font-black uppercase tracking-tighter truncate max-w-[80%] px-1">{takeaway.customer_name || `${t('pos.take_away')} #${takeaway.id}`}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="h-[1px] bg-gradient-to-r from-transparent via-white/50 to-transparent" />

            {/* Tables Section */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1">
                  <h2 className="text-sm font-black text-slate-400 uppercase tracking-[0.3em] leading-none mb-1">{t('pos.active_tables')}</h2>
                  <div className="h-1 w-12 bg-gradient-to-r from-slate-900 to-transparent rounded-full" />
                </div>
                {isLoadingTables ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />
                ) : (
                  <span className="text-[10px] font-black bg-slate-900/5 text-slate-600 px-3 py-1 rounded-full uppercase tracking-tighter border border-slate-200/50">
                    {tables.length} {t('admin.tables')}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {isLoadingTables ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="aspect-square animate-pulse rounded-[2rem] bg-white/20" />
                  ))
                ) : tables.map((table) => {
                  const hasReady = (table.orders ?? []).some(o => o.items.some(i => i.status === 'READY'))
                  const occupantName = table.reservations?.find(r => r.status === 'ARRIVED' || r.status === 'CREATED' || r.status === 'SEATED')?.customer_name
                  const isActive = selectedTableId === table.id

                  return (
                    <button
                      key={table.id}
                      type="button"
                      onClick={() => { setSelectedTableId(table.id); setInvoiceId(null) }}
                      className={`group relative flex flex-col items-center justify-center rounded-[2rem] border-2 aspect-square transition-all duration-500 hover:-translate-y-2 ${isActive
                        ? 'border-slate-900 bg-slate-900 text-white shadow-2xl shadow-slate-400/30 scale-105'
                        : 'border-white/60 bg-white/40 text-slate-700 hover:border-slate-400/40 hover:bg-white/80'
                        } ${hasReady && !isActive ? 'ring-4 ring-emerald-500/20' : ''}`}
                    >
                      {hasReady && (
                        <div className="absolute -top-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-white border-2 border-white shadow-lg animate-bounce z-20">
                          ✓
                        </div>
                      )}

                      <div className={`size-12 rounded-[1.25rem] flex items-center justify-center text-2xl mb-3 shadow-xl ${isActive ? 'bg-white/10' : 'bg-white shadow-slate-200/50'}`}>
                        🪑
                      </div>
                      <div className="text-base font-black tracking-tighter leading-none">{table.name}</div>
                      <div className={`text-[9px] font-black uppercase tracking-widest mt-2 truncate max-w-[85%] ${isActive ? 'text-white/60' : 'text-slate-400'}`}>
                        {occupantName ? `👤 ${occupantName}` : t(`status.${table.status.toLowerCase()}`)}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* 2. Active Orders List */}
          <div className="glass rounded-[3rem] p-8 lg:p-12 space-y-8 border-white/40 shadow-xl shadow-slate-200/50">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <h2 className="text-sm font-black text-slate-400 uppercase tracking-[0.3em] leading-none mb-1">{t('pos.open_orders')}</h2>
                <div className="h-1 w-12 bg-gradient-to-r from-emerald-500 to-transparent rounded-full" />
              </div>
              {orders.length > 0 && (
                <span className="text-[10px] font-black bg-emerald-500/10 text-emerald-600 px-3 py-1 rounded-full uppercase tracking-tighter border border-emerald-500/10">
                  {orders.length} {t('common.sessions')}
                </span>
              )}
            </div>

            {ordersLoading ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <div className="size-12 animate-spin rounded-[1.5rem] border-4 border-slate-100 border-t-primary mb-4" />
                <p className="text-[10px] font-black uppercase tracking-[0.3em] animate-pulse">{t('common.finding_bookings')}</p>
              </div>
            ) : ordersError ? (
              <div className="p-8 rounded-[2rem] bg-accent/10 border border-accent/20 text-accent-dark text-xs font-black uppercase tracking-widest text-center">
                {t('common.error')}
              </div>
            ) : orders.length === 0 ? (
              <div className="p-16 text-center space-y-4 rounded-[3rem] border-2 border-dashed border-white/60 bg-white/10">
                <div className="size-20 bg-white shadow-xl shadow-slate-200/50 rounded-[2rem] flex items-center justify-center text-4xl mx-auto opacity-40">
                  🛒
                </div>
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em]">
                  {selectedTableId === null ? t('pos.start_takeaway_hint') : t('pos.open_orders_hint')}
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {(Array.isArray(orders) ? orders : (orders as any)?.data || []).map((order: any, orderIdx: number) => {
                  const createdTime = new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  const isConfirmed = !!order.confirmed_at

                  return (
                    <div
                      key={order.id}
                      className="group relative glass rounded-[2.5rem] overflow-hidden border-white/60 shadow-lg shadow-slate-200/50 animate-in slide-in-from-bottom duration-500"
                      style={{ animationDelay: `${orderIdx * 100}ms`, animationFillMode: 'both' }}
                    >
                      <div className={`px-8 py-6 flex items-center justify-between border-b ${isConfirmed ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-amber-500/5 border-amber-500/10'}`}>
                        <div className="flex items-center gap-4">
                          <div className={`size-3 rounded-full ${isConfirmed ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.4)] animate-pulse' : 'bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.4)]'}`} />
                          <div className="flex flex-col">
                            <span className="text-xs font-black text-slate-900 uppercase tracking-widest leading-none mb-1">
                              {t('pos.order_num')}#{order.id}
                            </span>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                              {createdTime}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          {!isConfirmed && (
                            <button
                              onClick={() => setDialog({
                                isOpen: true,
                                title: t('common.cancel'),
                                description: t('pos.cancel_order_confirm'),
                                type: 'danger',
                                onConfirm: () => cancelMutation.mutate(order.id)
                              })}
                              disabled={cancelMutation.isPending}
                              className="px-5 py-2.5 rounded-xl text-[10px] font-black text-accent-dark uppercase tracking-widest bg-accent/10 hover:bg-accent/20 transition-all border border-accent/10 disabled:opacity-50"
                            >
                              {t('common.cancel')}
                            </button>
                          )}
                          {isConfirmed ? (
                            <div className="flex gap-4 items-center">
                              <span className="px-5 py-2.5 rounded-xl text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-500/10 border border-emerald-500/10 shadow-sm">
                                ✓ {t('pos.confirmed')}
                              </span>
                              <button
                                onClick={() => setDialog({
                                  isOpen: true,
                                  title: t('common.cancel'),
                                  description: t('pos.cancel_order_confirm'),
                                  type: 'danger',
                                  onConfirm: () => cancelMutation.mutate(order.id)
                                })}
                                disabled={cancelMutation.isPending}
                                className="text-[10px] font-black text-slate-400 hover:text-accent-dark transition-colors uppercase tracking-widest"
                              >
                                {t('common.cancel')}
                              </button>
                            </div>
                          ) : (
                            <Can I="create_order">
                              <button
                                onClick={() => confirmMutation.mutate(order.id)}
                                disabled={confirmMutation.isPending}
                                className="btn-aura px-6 py-3 text-[10px] font-black"
                              >
                                {confirmMutation.isPending && confirmMutation.variables === order.id ? t('pos.confirming') : t('pos.confirm_order')}
                              </button>
                            </Can>
                          )}
                        </div>
                      </div>

                      {order.notes && (
                        <div className="px-8 pb-4">
                          <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 flex items-center gap-3">
                            <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest bg-amber-500/10 px-2 py-0.5 rounded-lg">Note</span>
                            <span className="text-xs font-bold text-slate-700 italic">"{order.notes}"</span>
                          </div>
                        </div>
                      )}

                      <div className="p-8 space-y-6">
                        {order.items.map((item: any) => (
                          <div key={item.id} className="flex items-center justify-between group/item">
                            <div className="flex items-center gap-6">
                              <div className="size-10 rounded-xl bg-slate-900 flex items-center justify-center text-xs font-black text-white shadow-xl shadow-slate-400/20 group-hover/item:scale-110 transition-transform">
                                {item.quantity}
                              </div>
                              <div className="space-y-1">
                                <div className="text-sm font-black text-slate-900 uppercase tracking-tighter">
                                  {item.menu_item?.name ?? t('pos.item_label')}
                                </div>
                                {item.notes && (
                                  <div className="text-[10px] font-black text-amber-600 bg-amber-500/5 px-2 py-0.5 rounded-lg border border-amber-500/10">
                                    {item.notes}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="text-sm font-black text-slate-900 tabular-nums bg-white shadow-sm border border-slate-100 px-4 py-2 rounded-xl">
                              {formatCurrency(item.price * item.quantity)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* 3. Digital Menu */}
          <Can I="create_order">
            <div className="glass rounded-[3rem] p-8 lg:p-12 space-y-10 border-white/40 shadow-2xl shadow-indigo-500/5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="flex flex-col gap-1">
                  <h2 className="text-sm font-black text-slate-400 uppercase tracking-[0.3em] leading-none mb-1">{t('pos.digital_menu')}</h2>
                  <div className="h-1 w-12 bg-gradient-to-r from-primary to-transparent rounded-full" />
                </div>
                <div className="flex gap-4 overflow-x-auto no-scrollbar scroll-smooth">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`whitespace-nowrap px-10 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 ${selectedCategory === cat
                        ? 'bg-primary text-white shadow-2xl shadow-primary/40 scale-105 border-white/20'
                        : 'bg-white/40 text-slate-500 hover:bg-white/80 hover:text-primary border border-white/20 shadow-lg shadow-indigo-500/5'}
                      `}
                    >
                      {t(`common.${cat.toLowerCase()}`)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4">
                {isLoadingMenu ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="aspect-[4/5] animate-pulse rounded-[2.5rem] bg-white/20" />
                  ))
                ) : menuItems.filter((m) => selectedCategory === 'ALL' || m.category === selectedCategory).length === 0 ? (
                  <div className="col-span-full py-20 text-center glass rounded-[3rem] border-dashed border-2">
                    <p className="text-[11px] font-black uppercase text-slate-400 tracking-[0.4em]">
                      {t('pos.no_items_in_category')}
                    </p>
                  </div>
                ) : menuItems.filter((m) => selectedCategory === 'ALL' || m.category === selectedCategory).map((item, idx) => (
                  <button
                    key={item.id}
                    onClick={() => { setModifierItem(item); setModQty(1); setModNotes('') }}
                    className="group flex flex-col items-center glass rounded-[2.5rem] p-5 transition-all duration-500 hover:-translate-y-4 hover:shadow-2xl hover:shadow-indigo-500/10 hover:bg-white/80 border-white/60 animate-in fade-in zoom-in-95"
                    style={{ animationDelay: `${idx * 50}ms`, animationFillMode: 'both' }}
                  >
                    <div className="relative mb-6 h-40 w-full overflow-hidden rounded-[2rem] bg-slate-100 shadow-inner group-hover:scale-105 transition-transform duration-700">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.name} className="h-full w-full object-cover group-hover:rotate-2 group-hover:scale-110 transition-transform duration-1000" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[10px] font-black text-slate-300 uppercase tracking-widest">{t('pos.no_image')}</div>
                      )}
                      <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl text-[10px] font-black text-primary shadow-lg border border-white/50">
                        {formatCurrency(item.price)}
                      </div>
                    </div>
                    <div className="text-center space-y-1 px-2">
                      <div className="text-sm font-black text-slate-900 uppercase tracking-tighter line-clamp-1 group-hover:text-primary transition-colors">{item.name}</div>
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest opacity-60">Digital Item</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </Can>
        </div>

        {/* 4. Checkout Sidebar */}
        <div className="space-y-8 h-fit xl:sticky xl:top-10">
          <div className="glass rounded-[4rem] p-10 lg:p-14 space-y-10 border-white/40 shadow-2xl shadow-indigo-500/10 relative overflow-hidden group">
            <div className="absolute top-0 right-0 size-64 bg-primary/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 group-hover:bg-primary/10 transition-all duration-1000" />

            <div className="relative z-10 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tighter leading-none">{t('pos.invoice_summary')}</h2>
                  <div className="h-1 w-16 bg-gradient-to-r from-primary to-transparent rounded-full mt-2" />
                </div>
                {invoiceId && (
                  <button
                    onClick={handlePrint}
                    className="p-3 rounded-2xl bg-white border border-slate-200 text-slate-400 hover:text-primary transition-all shadow-sm group/print"
                    title={t('pos.print_receipt')}
                  >
                    <Printer size={18} className="group-hover/print:scale-110 transition-transform" />
                  </button>
                )}
              </div>
            </div>

            <div className="relative z-10 space-y-8 flex-1 overflow-y-auto pr-2 custom-scrollbar">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{t('pos.subtotal')}</span>
                  <span className="text-lg font-black text-slate-900 tabular-nums">{formatCurrency(subtotal)}</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="field-label">{t('pos.tax')}</label>
                    <input type="number" step="any" value={tax} onChange={(e) => setTax(Number(e.target.value))} className="glass-input h-14 bg-white/50 text-right px-6" />
                  </div>
                  <div className="space-y-2">
                    <label className="field-label">{t('pos.discount')}</label>
                    <input type="number" step="any" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} className="glass-input h-14 bg-white/50 text-right px-6 text-accent-dark" />
                  </div>
                </div>
              </div>

              <div className="p-10 rounded-[3rem] bg-slate-900 text-white shadow-2xl shadow-slate-900/40 space-y-2 relative overflow-hidden group/total">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-transparent opacity-0 group-hover/total:opacity-100 transition-opacity duration-1000" />
                <span className="relative z-10 text-[10px] font-black uppercase tracking-[0.4em] opacity-60">{t('common.total')}</span>
                <div className="relative z-10 text-5xl font-black tracking-tighter tabular-nums leading-none">
                  {formatCurrency(total)}
                </div>
                <div className="absolute bottom-4 right-8 text-4xl opacity-10 group-hover/total:scale-125 transition-transform duration-700">🧾</div>
              </div>

              {/* Payment Methods */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('pos.payment_methods')}</label>
                  <div className="flex gap-2">
                    <button onClick={handleQuickCash} className="px-5 py-2.5 rounded-xl text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-500/10 border border-emerald-500/10 hover:bg-emerald-500 hover:text-white transition-all duration-500">
                      100% {t('pos.cash')}
                    </button>
                    <button onClick={addPaymentLine} className="px-5 py-2.5 rounded-xl text-[10px] font-black text-slate-600 uppercase tracking-widest bg-white/40 border border-white/60 hover:bg-white transition-all duration-500">
                      +
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {paymentLines.map((line, idx) => (
                    <div key={idx} className="flex gap-4 p-4 glass rounded-3xl border-white/60 bg-white/40 hover:bg-white/60 transition-all">
                      <select
                        className="flex-1 bg-transparent text-xs font-black text-slate-900 uppercase tracking-widest outline-none pr-4 border-r border-white/40"
                        value={line.method}
                        onChange={(e) => updatePaymentLine(idx, 'method', e.target.value)}
                      >
                        <option value="CASH">{t('pos.cash')}</option>
                        <option value="ELECTRONIC">{t('pos.electronic')}</option>
                      </select>
                      <input
                        type="number"
                        step="any"
                        className="w-28 bg-transparent text-right text-xs font-black text-slate-900 tabular-nums outline-none"
                        value={line.amount || ''}
                        onChange={(e) => updatePaymentLine(idx, 'amount', Number(e.target.value))}
                      />
                      {paymentLines.length > 1 && (
                        <button onClick={() => removePaymentLine(idx)} className="size-8 rounded-xl text-accent hover:bg-accent/10 flex items-center justify-center font-black text-xl">×</button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-4 p-6 rounded-[2rem] bg-white/20 border border-white/40">
                  <div className="space-y-1">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t('pos.applied_total') || 'Applied'}</span>
                    <div className={`text-sm font-black tabular-nums ${Math.abs(paymentLines.reduce((sum, l) => sum + l.amount, 0) - total) < 0.01 ? 'text-emerald-600' : 'text-accent-dark'}`}>
                      {formatCurrency(paymentLines.reduce((sum, l) => sum + l.amount, 0))}
                    </div>
                  </div>
                  <div className="space-y-1 text-right">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t('pos.difference') || 'Diff'}</span>
                    <div className={`text-sm font-black tabular-nums ${Math.abs(paymentLines.reduce((sum, l) => sum + l.amount, 0) - total) < 0.01 ? 'text-slate-400' : 'text-amber-600'}`}>
                      {formatCurrency(total - paymentLines.reduce((sum, l) => sum + l.amount, 0))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                {invoiceId && (
                  <button
                    onClick={handlePrint}
                    className="flex items-center justify-center gap-3 w-full py-5 rounded-3xl bg-white border-2 border-slate-100 text-slate-600 font-black text-xs uppercase tracking-widest hover:bg-slate-50 hover:border-slate-200 transition-all shadow-sm"
                  >
                    <Printer size={18} />
                    {t('pos.print_receipt') || 'Print Receipt'}
                  </button>
                )}
                {!invoiceId && selectedTableId && (
                  <button onClick={() => openMutation.mutate({ tableId: selectedTableId })} className="btn-aura border-2 border-slate-900 bg-transparent text-slate-900 py-6">{openMutation.isPending ? t('pos.opening') : t('nav.pos')}</button>
                )}
                <Can I="close_invoice">
                  <button
                    disabled={!invoiceId || subtotal === 0 || closeMutation.isPending || Math.abs(paymentLines.reduce((sum, l) => sum + l.amount, 0) - total) > 0.01}
                    onClick={handleCloseInvoice}
                    className="btn-aura py-8 text-lg font-black tracking-[0.2em] shadow-emerald-500/40 bg-emerald-500 hover:bg-emerald-600"
                  >
                    {closeMutation.isPending ? t('pos.closing') : t('pos.close_pay')}
                  </button>
                </Can>
              </div>

              {actionError && (
                <div className="p-4 rounded-2xl bg-accent/10 border border-accent/20 text-accent-dark text-[10px] font-black uppercase tracking-widest text-center animate-pulse">
                  {actionError}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 5. Aura Modifier Modal */}
      {modifierItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-4 backdrop-blur-3xl bg-slate-900/60 animate-in fade-in duration-500">
          <div className="w-full max-w-2xl glass rounded-[4rem] p-12 sm:p-14 shadow-[0_40px_100px_-20px_rgba(108,93,211,0.3)] animate-in zoom-in-95 duration-500 border-white/60 relative overflow-hidden">
            <div className="absolute top-0 right-0 size-64 bg-primary/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />

            <div className="relative z-10 space-y-10">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-4xl font-black text-slate-900 tracking-tighter mb-2">{modifierItem.name}</h3>
                  <span className="text-xs font-black text-primary uppercase tracking-widest bg-primary/10 px-4 py-1.5 rounded-xl border border-primary/20">
                    {formatCurrency(modifierItem.price)}
                  </span>
                </div>
                <div className="size-20 rounded-[2rem] bg-slate-50 overflow-hidden shadow-xl border-4 border-white/40">
                  {modifierItem.image_url && <img src={modifierItem.image_url} className="size-full object-cover" />}
                </div>
              </div>

              <div className="space-y-8">
                <div className="flex items-center justify-between p-8 glass rounded-[2.5rem] border-white/80 bg-slate-50/40 shadow-xl shadow-indigo-500/10 transition-colors hover:bg-slate-50/60">
                  <div className="space-y-1">
                    <span className="text-xs font-black text-slate-900 uppercase tracking-widest">{t('common.capacity')}</span>
                    <p className="text-[10px] text-slate-500 font-extrabold uppercase tracking-tighter">Set quantity for this item</p>
                  </div>
                  <div className="flex items-center gap-6">
                    <button onClick={() => setModQty(q => Math.max(1, q - 1))} className="size-14 rounded-[1.5rem] glass border-white/60 flex items-center justify-center text-2xl font-black text-slate-600 hover:bg-slate-50 transition-all shadow-lg active:scale-90">-</button>
                    <span className="text-3xl font-black text-slate-900 tabular-nums w-12 text-center">{modQty}</span>
                    <button onClick={() => setModQty(q => q + 1)} className="size-14 rounded-[1.5rem] bg-primary flex items-center justify-center text-2xl font-black text-white hover:bg-primary-dark transition-all shadow-xl shadow-primary/30 active:scale-90">+</button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="field-label text-slate-900">{t('common.notes')}</label>
                  <textarea
                    placeholder="e.g. No onions, Extra spicy..."
                    value={modNotes}
                    onChange={(e) => setModNotes(e.target.value)}
                    className="glass-input h-32 py-6 resize-none bg-slate-50/20 shadow-inner text-slate-900 font-bold placeholder:text-slate-300"
                  />
                </div>
              </div>

              <div className="flex gap-6 pt-6">
                <button onClick={() => setModifierItem(null)} className="flex-1 py-6 rounded-3xl glass border-slate-200 bg-slate-50/60 text-xs font-black text-slate-900 uppercase tracking-widest hover:bg-slate-50 transition-all shadow-md">{t('common.prev')}</button>
                <button
                  onClick={async () => {
                    try {
                      let targetInvId = invoiceId;
                      if (!targetInvId && !openMutation.isPending) {
                        const inv = await openMutation.mutateAsync({ tableId: selectedTableId });
                        targetInvId = inv.id;
                        setInvoiceId(inv.id);
                      }
                      if (!targetInvId) throw new Error('Failed to create or find invoice');

                      await addToTableMutation.mutateAsync({
                        tableId: selectedTableId,
                        items: [{ menu_item_id: modifierItem.id, quantity: modQty, notes: modNotes }],
                        invoiceId: targetInvId
                      });
                      setModifierItem(null);
                      setModQty(1);
                      setModNotes('');
                    } catch (error) {
                      console.error('Failed to add item:', error);
                    }
                  }}
                  className="btn-aura flex-1 py-6"
                >
                  {t('pos.add_to_order')}
                </button>
              </div>
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

      {/* 6. Printable Receipt Template (Hidden from screen) */}
      <div className="hidden print:block fixed inset-0 bg-white z-[9999] p-8 text-slate-900 font-sans" dir={i18n.dir()}>
        <div className="max-w-[80mm] mx-auto space-y-6">
          {/* Header */}
          <div className="text-center space-y-3">
            {restaurantSettings.restaurant_logo && (
              <img
                src={restaurantSettings.restaurant_logo}
                alt="Logo"
                className="w-24 h-24 mx-auto object-contain mb-2"
              />
            )}
            <h1 className="text-xl font-black uppercase tracking-tight">
              {restaurantSettings.restaurant_name || 'RMS RESTAURANT'}
            </h1>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              {new Date().toLocaleString()}
            </div>
            {selectedTableId && (
              <div className="text-sm font-black border-y border-slate-100 py-2">
                {t('common.table_name')}: {tables.find(t => t.id === selectedTableId)?.name}
              </div>
            )}
          </div>

          {/* Items */}
          <div className="space-y-4">
            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest border-b border-slate-100 pb-2">
              <span>{t('common.item')}</span>
              <span>{t('common.total')}</span>
            </div>
            {(Array.isArray(orders) ? orders : (orders as any)?.data || []).flatMap((o: any) => o.items).map((item: any, idx: number) => (
              <div key={idx} className="flex justify-between items-start gap-4">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold leading-tight uppercase">
                    {item.quantity}x {item.menu_item?.name}
                  </div>
                  {item.notes && <div className="text-[9px] text-slate-500 italic">- {item.notes}</div>}
                </div>
                <div className="text-xs font-bold tabular-nums">
                  {formatCurrency(item.price * item.quantity)}
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="border-t border-slate-100 pt-4 space-y-2">
            <div className="flex justify-between text-xs font-bold">
              <span>{t('pos.subtotal')}</span>
              <span className="tabular-nums">{formatCurrency(subtotal)}</span>
            </div>
            {tax > 0 && (
              <div className="flex justify-between text-xs font-bold">
                <span>{t('pos.tax')}</span>
                <span className="tabular-nums">+{formatCurrency(tax)}</span>
              </div>
            )}
            {discount > 0 && (
              <div className="flex justify-between text-xs font-bold">
                <span>{t('pos.discount')}</span>
                <span className="tabular-nums">-{formatCurrency(discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-black border-t-2 border-slate-900 pt-2 uppercase">
              <span>{t('common.total')}</span>
              <span className="tabular-nums">{formatCurrency(total)}</span>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center pt-8 border-t border-dashed border-slate-200">
            <p className="text-[10px] font-black uppercase tracking-widest mb-1">Thank You / شكراً لكم</p>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">Visit us again</p>
          </div>
        </div>
      </div>
    </div>
  )
}
