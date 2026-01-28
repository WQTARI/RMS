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

export const PosPage = () => {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { isEnabled: isRealtimeEnabled } = useRealtime()
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
  const [addTarget, setAddTarget] = useState<'new' | number>('new')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const categories = useMemo(() => {
    const set = new Set(menuItems.map((m) => m.category).filter(Boolean))
    return Array.from(set)
  }, [menuItems])

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
      target,
      items,
      invoiceId: explicitInvoiceId,
      customerName,
    }: {
      tableId: number | null
      target: 'new' | number
      items: { menu_item_id: number; quantity: number; notes?: string }[]
      invoiceId?: number | null
      customerName?: string
    }) => {
      const valid = items.filter((i) => i.menu_item_id > 0 && i.quantity >= 1)
      if (valid.length === 0) throw new Error('Add at least one item.')
      if (target === 'new') {
        return createOrder({
          table_id: tableId,
          items: valid,
          invoice_id: explicitInvoiceId,
          customer_name: customerName
        })
      }
      return addItemsToOrder(target, valid)
    },
    onSuccess: () => {
      setAddTarget('new')
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

  useEffect(() => {
    setAddTarget('new')
  }, [selectedTableId, invoiceId])

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
    <div className="min-h-screen bg-slate-50/50 pb-12">
      <PageHeader title={t('nav.pos')} subtitle={t('pos.aggregate_subtitle')} />

      <div className="grid gap-6 px-4 lg:grid-cols-[2fr,1fr]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            {/* Takeaway Section */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest leading-none">{t('pos.take_away')}</h2>
                {isLoadingTakeaways ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-600" />
                ) : (
                  <span className="text-xs font-bold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">{openTakeaways.length} {t('common.active')}</span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
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
                  className={`group relative flex flex-col items-center justify-center rounded-2xl border-2 p-4 text-center transition-all ${selectedTableId === null && !invoiceId
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-900 shadow-md ring-4 ring-indigo-500/10'
                    : 'border-dashed border-slate-200 bg-slate-50 text-slate-400 hover:border-indigo-300 hover:bg-white hover:text-indigo-600'
                    } ${openMutation.isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {openMutation.isPending ? (
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600 mb-1" />
                  ) : (
                    <div className="text-xl font-bold mb-1">➕</div>
                  )}
                  <div className="text-xs font-black uppercase tracking-widest">{t('pos.new_session')}</div>
                </button>

                {!isLoadingTakeaways && openTakeaways.map((takeaway: any) => (
                  <button
                    key={takeaway.id}
                    type="button"
                    onClick={() => { setSelectedTableId(null); setInvoiceId(takeaway.id) }}
                    className={`relative rounded-2xl border-2 p-4 text-center transition-all ${invoiceId === takeaway.id && selectedTableId === null
                      ? 'border-indigo-600 bg-indigo-600 text-white shadow-lg shadow-indigo-100'
                      : 'border-indigo-100 bg-indigo-50/50 text-indigo-700 hover:border-indigo-200 hover:bg-indigo-50'
                      }`}
                  >
                    <div className="text-xl font-bold mb-1">🥡</div>
                    <div className="text-sm font-black truncate max-w-full">{takeaway.customer_name || `${t('pos.take_away')} #${takeaway.id}`}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="my-8 border-t border-slate-100" />

            {/* Tables Section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest leading-none">{t('pos.active_tables')}</h2>
                {isLoadingTables ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />
                ) : (
                  <span className="text-xs font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{tables.length} {t('admin.tables')}</span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {isLoadingTables ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-100" />
                  ))
                ) : tables.map((table) => {
                  const hasReady = (table.orders ?? []).some(o => o.items.some(i => i.status === 'READY'))
                  const occupantName = table.reservations?.find(r => r.status === 'ARRIVED' || r.status === 'CREATED')?.customer_name
                  return (
                    <button
                      key={table.id}
                      type="button"
                      onClick={() => { setSelectedTableId(table.id); setInvoiceId(null) }}
                      className={`relative rounded-2xl border-2 p-4 text-center transition-all ${selectedTableId === table.id
                        ? 'border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-200'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                        } ${hasReady && selectedTableId !== table.id ? 'animate-pulse-urgency border-emerald-500' : ''}`}
                    >
                      <div className="text-xl font-bold mb-1">🪑</div>
                      <div className="text-base font-black truncate leading-none">{table.name}</div>
                      <div className="text-xs font-extrabold opacity-70 uppercase truncate mt-1">{occupantName ? `👤 ${occupantName}` : t(`status.${table.status.toLowerCase()}`)}</div>
                      {hasReady && <div className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-xs text-white border-2 border-white shadow-sm ring-4 ring-emerald-500/10">✓</div>}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>


          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest leading-none">{t('pos.open_orders')}</h2>
              {orders.length > 0 && (
                <span className="text-[10px] font-black bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full uppercase tracking-tighter">
                  {orders.length} {t('common.sessions')}
                </span>
              )}
            </div>

            {ordersLoading ? (
              <div className="flex justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-600" />
              </div>
            ) : ordersError ? (
              <p className="p-4 glass text-rose-600 text-xs font-bold">{t('common.error')}</p>
            ) : orders.length === 0 ? (
              <div className="p-12 text-center rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200">
                <div className="text-2xl mb-2 opacity-20">🛒</div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  {selectedTableId === null ? t('pos.start_takeaway_hint') : t('pos.open_orders_hint')}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {(Array.isArray(orders) ? orders : (orders as any)?.data || []).map((order: any) => {
                  const createdTime = new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  const isConfirmed = !!order.confirmed_at

                  return (
                    <div
                      key={order.id}
                      className={`rounded-2xl border-2 transition-all overflow-hidden ${isConfirmed
                        ? 'border-emerald-100 bg-white shadow-sm'
                        : 'border-amber-200 bg-amber-50/20 shadow-none'
                        }`}
                    >
                      <div className={`px-4 py-3 flex items-center justify-between border-b ${isConfirmed ? 'border-emerald-50 bg-emerald-50/30' : 'border-amber-100 bg-amber-100/30'}`}>
                        <div className="flex items-center gap-3">
                          <div className={`h-2 w-2 rounded-full ${isConfirmed ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
                          <span className="text-xs font-black text-slate-700 uppercase tracking-wider">
                            {t('pos.order_num')}{order.id}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400">
                            {createdTime}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
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
                              className="text-[10px] font-black text-rose-500 uppercase tracking-widest bg-rose-50 px-3 py-1 rounded-lg hover:bg-rose-100 transition-all border border-rose-100 disabled:opacity-50"
                            >
                              {t('common.cancel')}
                            </button>
                          )}
                          {isConfirmed ? (
                            <div className="flex gap-2 items-center">
                              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-tighter bg-white px-2 py-0.5 rounded-lg border border-emerald-100 shadow-sm">
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
                                className="text-[10px] font-black text-rose-400 opacity-50 hover:opacity-100 uppercase tracking-tighter transition-all"
                              >
                                {t('common.cancel')}
                              </button>
                            </div>
                          ) : (
                            <Can I="create_order">
                              <button
                                onClick={() => confirmMutation.mutate(order.id)}
                                disabled={confirmMutation.isPending}
                                className="text-[10px] font-black text-white uppercase tracking-widest bg-amber-500 px-3 py-1 rounded-lg hover:bg-amber-600 transition-all shadow-md active:scale-95 disabled:opacity-50"
                              >
                                {confirmMutation.isPending && confirmMutation.variables === order.id ? t('pos.confirming') : t('pos.confirm_order')}
                              </button>
                            </Can>
                          )}
                        </div>
                      </div>

                      <div className="p-4 bg-white/50">
                        <ul className="space-y-3">
                          {order.items.map((item: any) => (
                            <li key={item.id} className="flex items-start justify-between group">
                              <div className="flex items-start gap-3">
                                <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-lg bg-slate-900 text-[10px] font-black text-white shadow-sm">
                                  {item.quantity}
                                </span>
                                <div>
                                  <div className="text-sm font-black text-slate-800 uppercase tracking-tight leading-tight">
                                    {item.menu_item?.name ?? t('pos.item_label')}
                                  </div>
                                  {item.notes && (
                                    <div className="mt-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100 inline-block">
                                      {item.notes}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="text-sm font-black text-slate-900 tabular-nums">
                                {formatCurrency(item.price * item.quantity)}
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <Can I="create_order">
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">{t('pos.digital_menu')}</h2>
                <div className="flex gap-1 overflow-x-auto pb-1 no-scrollbar">
                  {categories.length > 0 ? categories.map((cat) => (
                    <button key={cat} onClick={() => setSelectedCategory(cat)} className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition-colors ${selectedCategory === cat ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}>{cat}</button>
                  )) : <p className="text-xs text-slate-400">{t('pos.no_categories')}</p>}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {isLoadingMenu ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-50" />
                  ))
                ) : menuItems.filter((m) => m.category === selectedCategory).length === 0 ? (
                  <div className="col-span-3 py-10 text-center text-[10px] font-black uppercase text-slate-300 tracking-widest">
                    {t('pos.no_items_in_category')}
                  </div>
                ) : menuItems.filter((m) => m.category === selectedCategory).map((item) => (
                  <button key={item.id} onClick={() => { setModifierItem(item); setModQty(1); setModNotes('') }} className="group flex flex-col items-center justify-center rounded-xl border border-slate-100 bg-slate-50 p-3 transition-all hover:bg-white hover:shadow-md h-full">
                    <div className="mb-3 h-20 w-full overflow-hidden rounded-lg bg-slate-200">
                      {item.image_url ? <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-xs text-slate-400 uppercase">{t('pos.no_image')}</div>}
                    </div>
                    <div className="text-base font-bold text-slate-800 line-clamp-1">{item.name}</div>
                    <div className="text-sm font-black text-emerald-600 mt-1">{formatCurrency(item.price)}</div>
                  </button>
                ))}
              </div>

              <div className="mt-6 border-t border-slate-100 pt-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">{t('pos.add_to_order')}:</label>
                  <select className="rounded border border-slate-200 px-2 py-1 text-xs" value={addTarget} onChange={(e) => setAddTarget(e.target.value === 'new' ? 'new' : Number(e.target.value))}>
                    <option value="new">{t('pos.new_order')}</option>
                    {orders.map((o: any) => <option key={o.id} value={o.id}>{t('pos.order_num')}{o.id}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </Can>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">{t('pos.invoice_summary')}</h2>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between"><span className="text-slate-500">{t('pos.subtotal')}</span><span className="font-medium">{formatCurrency(subtotal)}</span></div>
              <div className="flex items-center justify-between"><span className="text-slate-500">{t('pos.tax')}</span><input type="number" step="any" value={tax} onChange={(e) => setTax(Number(e.target.value))} className="w-24 rounded border px-2 py-1 text-right" /></div>
              <div className="flex items-center justify-between"><span className="text-slate-500">{t('pos.discount')}</span><input type="number" step="any" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} className="w-24 rounded border px-2 py-1 text-right" /></div>
              <div className="border-t border-slate-100 my-2 pt-2">
                <div className="flex items-center justify-between text-base font-semibold"><span>{t('common.total')}</span><span>{formatCurrency(total)}</span></div>
              </div>

              <div className="space-y-2 mt-4">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-400">{t('pos.payment_methods')}</label>
                  <div className="flex gap-2">
                    <button onClick={handleQuickCash} className="text-[10px] font-black uppercase tracking-tighter bg-emerald-50 text-emerald-600 px-2 py-1 rounded-lg border border-emerald-100 hover:bg-emerald-100 transition-colors">
                      {t('pos.cash')} (100%)
                    </button>
                    <button onClick={addPaymentLine} className="text-[10px] font-black uppercase tracking-tighter bg-slate-100 text-slate-600 px-2 py-1 rounded-lg border border-slate-200 hover:bg-slate-200 transition-colors">
                      + {t('common.add_new')}
                    </button>
                  </div>
                </div>
                {paymentLines.map((line, idx) => (
                  <div key={idx} className="flex gap-2 items-center bg-slate-50/50 p-2 rounded-xl border border-slate-100 transition-all focus-within:border-indigo-300">
                    <select
                      className="flex-1 rounded-lg border-none bg-transparent px-2 py-1 text-xs font-bold text-slate-700 outline-none"
                      value={line.method}
                      onChange={(e) => updatePaymentLine(idx, 'method', e.target.value)}
                    >
                      <option value="CASH">{t('pos.cash')}</option>
                      <option value="ELECTRONIC">{t('pos.electronic')}</option>
                    </select>
                    <div className="relative">
                      <input
                        type="number"
                        step="any"
                        placeholder="0.00"
                        className="w-28 rounded-lg border-none bg-white px-3 py-1.5 text-right text-xs font-black text-slate-900 shadow-sm outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-indigo-500"
                        value={line.amount || ''}
                        onChange={(e) => updatePaymentLine(idx, 'amount', Number(e.target.value))}
                      />
                    </div>
                    {paymentLines.length > 1 && (
                      <button onClick={() => removePaymentLine(idx)} className="h-8 w-8 rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-colors flex items-center justify-center font-bold">
                        ×
                      </button>
                    )}
                  </div>
                ))}
                <div className="flex flex-col gap-1 mt-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider">
                    <span className="text-slate-400">{t('pos.applied_total') || 'Applied Total'}</span>
                    <span className={Math.abs(paymentLines.reduce((sum, l) => sum + l.amount, 0) - total) < 0.01 ? 'text-emerald-600' : 'text-rose-600'}>
                      {formatCurrency(paymentLines.reduce((sum, l) => sum + l.amount, 0))}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider">
                    <span className="text-slate-400">{t('pos.difference') || 'Difference'}</span>
                    <span className={Math.abs(paymentLines.reduce((sum, l) => sum + l.amount, 0) - total) < 0.01 ? 'text-slate-400' : 'text-amber-600'}>
                      {formatCurrency(total - paymentLines.reduce((sum, l) => sum + l.amount, 0))}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {actionError && <p className="mt-3 text-sm text-rose-600">{actionError}</p>}

            <div className="mt-4 flex flex-col gap-3">
              {!invoiceId && selectedTableId && (
                <button onClick={() => openMutation.mutate({ tableId: selectedTableId })} className="rounded-xl border-2 border-slate-900 py-4 text-base font-black uppercase tracking-widest">{openMutation.isPending ? t('pos.opening') : t('nav.pos')}</button>
              )}
              <Can I="close_invoice">
                <button
                  disabled={!invoiceId || subtotal === 0 || closeMutation.isPending || Math.abs(paymentLines.reduce((sum, l) => sum + l.amount, 0) - total) > 0.01}
                  onClick={handleCloseInvoice}
                  className="rounded-xl bg-emerald-600 py-4 text-base font-black text-white uppercase tracking-widest shadow-lg shadow-emerald-100 disabled:opacity-50 transition-all hover:bg-emerald-700 active:scale-95"
                >
                  {closeMutation.isPending ? t('pos.closing') : t('pos.close_pay')}
                </button>
              </Can>
            </div>
          </div>
        </div>
      </div>

      {modifierItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-xl font-bold">{modifierItem.name}</h3>
            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between"><span className="font-semibold">{t('common.capacity')}</span><div className="flex items-center gap-4"><button onClick={() => setModQty(q => Math.max(1, q - 1))} className="h-10 w-10 rounded-full border">-</button><span className="text-lg font-bold">{modQty}</span><button onClick={() => setModQty(q => q + 1)} className="h-10 w-10 rounded-full border">+</button></div></div>
              <textarea placeholder={t('common.notes')} value={modNotes} onChange={(e) => setModNotes(e.target.value)} className="w-full rounded-xl border p-3" rows={3} />
            </div>
            <div className="mt-8 flex gap-3">
              <button onClick={() => setModifierItem(null)} className="flex-1 py-3 text-sm font-bold text-slate-500">{t('common.prev')}</button>
              <button onClick={async () => {
                try {
                  let targetInvId = invoiceId;
                  // Ensure invoice exists before adding items
                  if (!targetInvId && !openMutation.isPending) {
                    const inv = await openMutation.mutateAsync({ tableId: selectedTableId });
                    targetInvId = inv.id;
                    setInvoiceId(inv.id);
                  }

                  if (!targetInvId) throw new Error('Failed to create or find invoice');

                  await addToTableMutation.mutateAsync({
                    tableId: selectedTableId,
                    target: addTarget,
                    items: [{ menu_item_id: modifierItem.id, quantity: modQty, notes: modNotes }],
                    invoiceId: targetInvId
                  });

                  setModifierItem(null);
                  setModQty(1);
                  setModNotes('');
                } catch (error) {
                  console.error('Failed to add item:', error);
                }
              }} className="flex-1 rounded-xl bg-slate-900 py-3 text-white font-bold">{t('pos.add_to_order')}</button>
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
