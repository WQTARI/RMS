import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchTables } from '../api/tables'
import { fetchMenuItems } from '../api/menuItems'
import {
  addItemsToOrder,
  confirmOrder,
  fetchOrders,
  createOrder,
} from '../api/orders'
import {
  closeInvoice,
  openInvoice,
  fetchInvoices,
  fetchInvoiceTickets
} from '../api/invoices'
import { useTranslation } from 'react-i18next'
import { formatCurrency, formatLiteralTime } from '../utils/format'
import { PageHeader } from '../components/PageHeader'
import type { Invoice, MenuItem, RestaurantTable } from '../types'
import { Dialog } from '../components/Dialog'
import { useRealtime } from '../realtime/RealtimeProvider'
import { Plus, Minus, ShoppingCart, Tag, ChevronRight, Zap, LayoutGrid, UtensilsCrossed, QrCode, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useSettings } from '../context/SettingsContext'
import { Can } from '../components/Can'

export const PosPage = () => {
  const { t, i18n } = useTranslation()
  const { settings } = useSettings()
  const queryClient = useQueryClient()
  const { isEnabled: isRealtimeEnabled } = useRealtime()

  const [selectedTableId, setSelectedTableId] = useState<number | null>(null)
  const [invoiceId, setInvoiceId] = useState<number | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL')
  const [modifierItem, setModifierItem] = useState<MenuItem | null>(null)
  const [modQty, setModQty] = useState(1)
  const [modNotes, setModNotes] = useState('')
  const [tickets, setTickets] = useState<any[]>([])

  const [tax, setTax] = useState<number>(0)
  const [discount, setDiscount] = useState<number>(0)
  const [paymentLines, setPaymentLines] = useState<{ method: string; amount: number }[]>([
    { method: 'CASH', amount: 0 },
  ])
  const [lastClosedInvoice, setLastClosedInvoice] = useState<Invoice | null>(null)

  const [dialog, setDialog] = useState<{
    isOpen: boolean
    title: string
    description: string
    type: 'info' | 'danger' | 'success' | 'prompt'
    onConfirm: (val?: string) => void
  }>({
    isOpen: false,
    title: '',
    description: '',
    type: 'info',
    onConfirm: () => { },
  })

  // Data Fetching
  const { data: tables = [] } = useQuery({
    queryKey: ['tables'],
    queryFn: fetchTables,
  })

  const { data: openTakeaways = [] } = useQuery({
    queryKey: ['takeaways', 'open'],
    queryFn: () => fetchInvoices({ status: 'OPEN', table_id: null }),
    refetchInterval: isRealtimeEnabled ? false : 10000,
  })

  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['orders', selectedTableId, invoiceId],
    queryFn: () => fetchOrders({ table_id: selectedTableId, invoice_id: invoiceId }),
    enabled: selectedTableId !== null || invoiceId !== null,
    refetchInterval: isRealtimeEnabled ? false : 5000,
  })

  const { data: menuItems = [], isLoading: isLoadingMenu } = useQuery({
    queryKey: ['menu', 'active'],
    queryFn: () => fetchMenuItems({ active: true }),
  })

  const categories = useMemo(() => {
    const cats = Array.from(new Set(menuItems.map((m) => m.category)))
    return ['ALL', ...cats.sort()]
  }, [menuItems])

  // Group tables by section
  const tablesBySection = useMemo(() => {
    const grouped: Record<string, { section: { id: number; name: string }; tables: RestaurantTable[] }> = {}

    tables.forEach(table => {
      const sectionKey = table.section ? `${table.section.id}` : 'no-section'
      const sectionName = table.section?.name || t('common.no_section')

      if (!grouped[sectionKey]) {
        grouped[sectionKey] = {
          section: { id: table.section?.id || 0, name: sectionName },
          tables: []
        }
      }
      grouped[sectionKey].tables.push(table)
    })

    return Object.values(grouped).sort((a, b) => a.section.name.localeCompare(b.section.name))
  }, [tables, t])

  // Mutations
  const openMutation = useMutation({
    mutationFn: (payload: { tableId: number | null; customerName?: string }) =>
      openInvoice(payload.tableId, payload.customerName),
    onSuccess: (invoice) => {
      setInvoiceId(invoice.id)
      queryClient.invalidateQueries({ queryKey: ['takeaways'] })
      queryClient.invalidateQueries({ queryKey: ['tables'] })
    },
  })

  const confirmMutation = useMutation({
    mutationFn: (orderId: number) => confirmOrder(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['tables'] })
    },
  })

  const addToTableMutation = useMutation({
    mutationFn: async ({
      tableId,
      items,
      invoiceId: targetInvoiceId,
      targetOrderId
    }: {
      tableId: number | null
      items: { menu_item_id: number; quantity: number; notes?: string }[]
      invoiceId?: number | null
      targetOrderId?: number
    }) => {
      // If we have a specific order ID AND it's not a temporary/optimistic one, use it
      const currentOrders = Array.isArray(orders) ? orders : (orders as any)?.data || []
      const targetOrder = currentOrders.find((o: any) => o.id === targetOrderId)

      if (targetOrderId && targetOrder && !targetOrder.isOptimistic) {
        return addItemsToOrder(targetOrderId, items)
      }

      // Otherwise find an open order or create new (skipping optimistic ones)
      const openOrder = currentOrders.find((o: any) => (o.status === 'DRAFT' || o.status === 'OPEN') && !o.isOptimistic)

      if (openOrder) {
        return addItemsToOrder(openOrder.id, items)
      } else {
        return createOrder({
          table_id: tableId,
          invoice_id: targetInvoiceId || invoiceId,
          items
        })
      }
    },
    onMutate: async ({ items, tableId, invoiceId: _targetInvoiceId, targetOrderId }) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ['orders', selectedTableId, invoiceId] });

      // Snapshot the previous value
      const previousOrders = queryClient.getQueryData(['orders', selectedTableId, invoiceId]);

      // Optimistically update to the new value
      queryClient.setQueryData(['orders', selectedTableId, invoiceId], (old: any) => {
        const currentOrders = Array.isArray(old) ? old : (old as any)?.data || [];

        let openOrderIndex = -1;
        if (targetOrderId) {
          openOrderIndex = currentOrders.findIndex((o: any) => o.id === targetOrderId);
        } else {
          openOrderIndex = currentOrders.findIndex((o: any) => (o.status === 'DRAFT' || o.status === 'OPEN') && !o.isOptimistic);
        }

        const newOrders = [...currentOrders];
        const itemToAdd = items[0]; // We usually add one type of item at a time here

        // Use the menu item details for the optimistic UI
        const menuItem = menuItems.find((m: any) => m.id === itemToAdd.menu_item_id);

        if (openOrderIndex > -1) {
          // Update existing order
          const order = { ...newOrders[openOrderIndex] };
          const existingItemIndex = order.items.findIndex((i: any) =>
            i.menu_item_id === itemToAdd.menu_item_id && (i.notes || '') === (itemToAdd.notes || '')
          );

          if (existingItemIndex > -1) {
            // Update existing item
            const updatedItems = [...order.items];
            const existingItem = { ...updatedItems[existingItemIndex] };

            const newQty = existingItem.quantity + itemToAdd.quantity;

            if (newQty <= 0) {
              // Remove item if quantity <= 0
              updatedItems.splice(existingItemIndex, 1);
            } else {
              existingItem.quantity = newQty;
              updatedItems[existingItemIndex] = existingItem;
            }
            order.items = updatedItems;
          } else if (itemToAdd.quantity > 0) {
            // Add new item
            order.items = [...order.items, {
              id: Date.now(), // Temporary ID
              menu_item_id: itemToAdd.menu_item_id,
              quantity: itemToAdd.quantity,
              price: menuItem?.price || 0,
              notes: itemToAdd.notes,
              menu_item: menuItem,
              status: 'PENDING',
              isOptimistic: true
            }];
          }
          newOrders[openOrderIndex] = { ...order, isOptimistic: true };
        } else if (itemToAdd.quantity > 0) {
          // Create new optimistic order
          newOrders.unshift({
            id: Date.now(), // Temporary ID
            table_id: tableId,
            status: 'OPEN',
            created_at: new Date().toISOString(),
            items: [{
              id: Date.now(),
              menu_item_id: itemToAdd.menu_item_id,
              quantity: itemToAdd.quantity,
              price: menuItem?.price || 0,
              notes: itemToAdd.notes,
              menu_item: menuItem,
              status: 'PENDING',
              isOptimistic: true
            }],
            isOptimistic: true
          });
        }

        return newOrders;
      });

      // Return a context object with the snapshotted value
      return { previousOrders };
    },
    onError: (_err, _newTodo, context) => {
      queryClient.setQueryData(['orders', selectedTableId, invoiceId], context?.previousOrders);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['tables'] });
    },
  })

  const closeMutation = useMutation({
    mutationFn: (payload: { id: number; tax: number; discount: number; payments: { method: string; amount: number }[] }) =>
      closeInvoice(payload.id, { tax: payload.tax, discount: payload.discount, payments: payload.payments }),
    onSuccess: (data) => {
      setLastClosedInvoice(data)
      setInvoiceId(null)
      setSelectedTableId(null)
      setTax(0)
      setDiscount(0)
      setPaymentLines([{ method: 'CASH', amount: 0 }])
      queryClient.invalidateQueries({ queryKey: ['tables'] })


      setDialog({
        isOpen: true,
        title: t('pos.payment_success'),
        description: t('pos.invoice_closed_msg'),
        type: 'success',
        onConfirm: () => { }
      })

      // Auto-print receipt
      setTimeout(() => {
        window.print()
      }, 500)
    },
  })

  // UI Handlers


  const handleCloseInvoice = () => {
    if (!invoiceId) return
    setDialog({
      isOpen: true,
      title: t('pos.close_invoice'),
      description: t('pos.close_invoice_confirm'),
      type: 'info',
      onConfirm: () => {
        closeMutation.mutate({
          id: invoiceId,
          tax,
          discount,
          payments: paymentLines
        })
      }
    })
  }

  const handleTurboAdd = async (item: MenuItem) => {
    try {
      let targetInvId = invoiceId
      if (!targetInvId && !openMutation.isPending) {
        const inv = await openMutation.mutateAsync({ tableId: selectedTableId })
        targetInvId = inv.id
        setInvoiceId(inv.id)
      }
      if (!targetInvId) return

      await addToTableMutation.mutateAsync({
        tableId: selectedTableId,
        items: [{ menu_item_id: item.id, quantity: 1 }],
        invoiceId: targetInvId
      })
    } catch (error) {
      console.error('Turbo add failed:', error)
    }
  }

  const subtotal = useMemo(() => {
    const orderList = Array.isArray(orders) ? orders : (orders as any)?.data || []
    return orderList.reduce((sum: number, order: any) => {
      const items = Array.isArray(order.items) ? order.items : []
      return sum + items.reduce((itemSum: number, item: any) => itemSum + (item.price * item.quantity), 0)
    }, 0)
  }, [orders])

  const total = Math.max(0, subtotal + Number(tax || 0) - Number(discount || 0))

  useEffect(() => {
    if (total > 0 && paymentLines.length === 1 && paymentLines[0].amount === 0) {
      setPaymentLines([{ ...paymentLines[0], amount: total }])
    }
  }, [total, invoiceId])

  return (
    <div className="pb-20 space-y-12 animate-in fade-in duration-700">
      <PageHeader title={t('nav.pos')} subtitle={t('pos.aggregate_subtitle')} />

      <div className="grid gap-10 xl:grid-cols-[1fr,480px] items-start relative">
        <div className="space-y-10 min-w-0">
          {/* 1. Session Selector */}
          <div className="glass rounded-[3rem] p-8 lg:p-12 space-y-10 shadow-2xl shadow-indigo-500/5 border-white/40 overflow-hidden">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1">
                  <h2 className="text-sm font-black text-slate-400 uppercase tracking-[0.3em] leading-none mb-1">{t('pos.take_away')}</h2>
                  <div className="h-1 w-12 bg-gradient-to-r from-primary to-transparent rounded-full" />
                </div>
                <span className="text-[10px] font-black bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full uppercase tracking-tighter">
                  {openTakeaways.length} {t('common.active')}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                <button
                  type="button"
                  disabled={openMutation.isPending}
                  onClick={() => setDialog({
                    isOpen: true,
                    title: t('pos.take_away'),
                    description: t('pos.customer_name_prompt'),
                    type: 'prompt',
                    onConfirm: (val) => {
                      openMutation.mutate({ tableId: null, customerName: val || `Takeaway ${new Date().toLocaleTimeString()}` });
                    }
                  })}
                  className={`group relative flex flex-col items-center justify-center rounded-[2rem] border-2 aspect-square transition-all duration-500 hover:-translate-y-2 ${selectedTableId === null && !invoiceId
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-600 shadow-xl shadow-indigo-500/20'
                    : 'border-dashed border-slate-200 bg-white/20 text-slate-400 hover:border-indigo-600/40'
                    }`}
                >
                  <Plus className="size-8 scale-75 group-hover:scale-100 transition-transform" />
                  <div className="mt-2 text-[10px] font-black uppercase tracking-widest">{t('pos.new_session')}</div>
                </button>

                {openTakeaways.map((takeaway: any) => (
                  <button
                    key={takeaway.id}
                    onClick={() => { setSelectedTableId(null); setInvoiceId(takeaway.id) }}
                    className={`group relative rounded-[2rem] border-2 aspect-square transition-all duration-500 flex flex-col items-center justify-center ${invoiceId === takeaway.id && selectedTableId === null
                      ? 'border-indigo-600 bg-indigo-600 text-white shadow-2xl shadow-indigo-500/30 scale-105'
                      : 'border-white/60 bg-white/40 text-slate-600 hover:border-indigo-600/40'
                      }`}
                  >
                    <span className="text-2xl mb-2">🥡</span>
                    <div className="text-[10px] font-black uppercase tracking-tighter truncate max-w-[80%]">{takeaway.customer_name || `#${takeaway.id}`}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="h-[1px] bg-slate-100" />

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1">
                  <h2 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center justify-between">
                    <span>{t('pos.active_tables')}</span>
                    <Link to="/floor-plan" className="flex items-center gap-2 text-indigo-500 hover:text-indigo-600 transition-colors cursor-pointer text-xs">
                      <LayoutGrid size={14} />
                      <span>تخطيط الصالة</span>
                    </Link>
                  </h2>
                </div>
              </div>

              <div className="space-y-8">
                {tablesBySection.map(({ section, tables: sectionTables }) => (
                  <div key={section.id} className="space-y-3">
                    <div className="flex items-center gap-2 px-2">
                      <div className="h-4 w-1 bg-slate-300 rounded-full" />
                      <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider">{section.name}</h3>
                      <span className="text-[10px] font-bold bg-slate-100 text-slate-400 px-2 py-0.5 rounded-full">{sectionTables.length}</span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
                      {sectionTables.map((table) => {
                        const isActive = selectedTableId === table.id
                        const isOccupied = table.status === 'OCCUPIED'
                        const isBrowsing = table.status === 'BROWSING'

                        return (
                          <button
                            key={table.id}
                            onClick={() => { setSelectedTableId(table.id); setInvoiceId(null) }}
                            className={`
                                  relative group p-4 rounded-[1.5rem] transition-all duration-300 outline-none
                                  ${isActive
                                ? 'bg-slate-900 text-white shadow-2xl shadow-slate-900/20 scale-105 ring-4 ring-slate-900/10'
                                : 'bg-white hover:bg-slate-50 hover:shadow-lg hover:-translate-y-1'
                              }
                                `}
                          >
                            {isOccupied && (
                              <div className={`absolute top-3 right-3 w-2 h-2 rounded-full ${isActive ? 'bg-rose-500' : 'bg-rose-500'} animate-pulse`} />
                            )}
                            {isBrowsing && !isOccupied && (
                              <div className={`absolute top-3 right-3 w-2 h-2 rounded-full ${isActive ? 'bg-amber-400' : 'bg-amber-500'} animate-pulse`} />
                            )}

                            <div className="space-y-2">
                              <div className={`
                                    w-8 h-8 rounded-xl flex items-center justify-center text-sm font-black transition-colors mb-2 mx-auto
                                    ${isActive
                                  ? 'bg-white/10 text-white'
                                  : 'bg-slate-100 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600'
                                }
                                  `}>
                                {isOccupied ? <UtensilsCrossed size={14} /> : isBrowsing ? <QrCode size={14} /> : <Zap size={14} />}
                              </div>

                              <div className="text-center">
                                <div className={`text-sm font-black ${isActive ? 'text-white' : 'text-slate-900'}`}>
                                  {table.name}
                                </div>
                                <div className={`text-[10px] font-bold uppercase tracking-wider mt-0.5 ${isActive ? 'text-slate-400' : 'text-slate-400'}`}>
                                  {isOccupied
                                    ? t('status.occupied')
                                    : isBrowsing
                                      ? 'BROWSING'
                                      : t('status.available')
                                  }
                                </div>
                              </div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 2. Digital Menu */}
        <Can I="create_order">
          <div className="glass rounded-[3rem] p-8 lg:p-12 space-y-10 border-white/40 shadow-2xl relative">
            <div className="sticky top-4 z-40 space-y-6 bg-white/80 backdrop-blur-3xl p-6 -mx-6 -mt-6 border-b border-slate-100/50 rounded-t-[3rem]">
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1">
                  <h2 className="text-sm font-black text-slate-900 uppercase tracking-[0.3em] leading-none mb-1 flex items-center gap-3">
                    <Zap className="size-4 text-indigo-600 fill-indigo-600" />
                    {t('pos.digital_menu')}
                  </h2>
                </div>
              </div>

              <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2 mask-linear-right">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`whitespace-nowrap px-8 py-3.5 rounded-[1.25rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 ${selectedCategory === cat
                      ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/30 scale-105'
                      : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200/50'}
                      `}
                  >
                    {cat === 'ALL' ? t('common.total') : cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
              {isLoadingMenu ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="aspect-[4/5] animate-pulse rounded-[2.5rem] bg-white/20 border border-slate-100" />
                ))
              ) : (
                menuItems
                  .filter((m) => selectedCategory === 'ALL' || m.category === selectedCategory)
                  .map((item, idx) => (
                    <div
                      key={item.id}
                      className="group relative flex flex-col glass rounded-[2.5rem] p-4 transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl hover:bg-white border-white/60 animate-in fade-in"
                      style={{ animationDelay: `${idx * 40}ms`, animationFillMode: 'both' }}
                    >
                      <div
                        className="relative h-40 w-full overflow-hidden rounded-[1.75rem] bg-slate-50 cursor-pointer"
                        onClick={() => { setModifierItem(item); setModQty(1); setModNotes('') }}
                      >
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.name} className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[9px] font-black text-slate-300 uppercase italic">Digital</div>
                        )}
                        <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-md px-3 py-1 rounded-xl text-[10px] font-black text-indigo-600 border border-white/50">
                          {formatCurrency(item.price)}
                        </div>
                      </div>

                      <div className="mt-5 px-1 space-y-3">
                        <div className="text-sm font-black text-slate-900 tracking-tighter line-clamp-1">{item.name}</div>
                        <button
                          onClick={() => handleTurboAdd(item)}
                          disabled={addToTableMutation.isPending}
                          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-slate-100 text-slate-600 font-black text-[10px] uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all active:scale-95 disabled:opacity-50"
                        >
                          <Plus className="size-3.5" />
                          {t('common.add')}
                        </button>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </Can>
      </div>

      {/* 4. Unified Checkout & Cart Sidebar */}
      <div className="xl:sticky xl:top-10 space-y-8 min-w-0">
        <div className="glass rounded-[4rem] flex flex-col h-[calc(100vh-120px)] border-white/40 shadow-2xl relative overflow-hidden">
          <div className="p-10 pb-0 shrink-0">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="size-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <ShoppingCart size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tighter leading-none">{t('pos.invoice_summary')}</h2>
                  <div className="text-[10px] font-black text-primary uppercase tracking-widest mt-1">
                    {selectedTableId ? `Table ${tables.find((t: any) => t.id === selectedTableId)?.name}` : 'Direct Order'}
                  </div>
                </div>
              </div>
              {invoiceId && (
                <div className="flex gap-2">

                  <button
                    onClick={async () => {
                      if (!invoiceId) return;
                      try {
                        // Fetch split tickets and trigger print
                        const tickets = await fetchInvoiceTickets(invoiceId);
                        setTickets(tickets);
                        // Wait for render then print
                        setTimeout(() => window.print(), 100);
                      } catch (e) {
                        console.error("Print failed", e);
                      }
                    }}
                    className="p-3.5 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 hover:bg-rose-100 hover:scale-105 transition-all flex items-center gap-2"
                    title="Print Tickets"
                  >
                    <UtensilsCrossed size={18} />
                    <span className="text-[10px] font-black uppercase hidden sm:inline">Ticket</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-10 space-y-8 custom-scrollbar pb-10">
            {ordersLoading ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <div className="size-10 animate-spin rounded-xl border-4 border-slate-100 border-t-indigo-600" />
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-20 space-y-4">
                <div className="text-5xl opacity-20">🛒</div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('pos.open_orders_hint')}</p>
              </div>
            ) : (
              <div className="space-y-10">
                {(Array.isArray(orders) ? orders : (orders as any)?.data || []).map((order: any) => (
                  <div key={order.id} className="space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">
                          {order.customer_name ? `${order.customer_name}` : `Order #${order.id}`}
                        </span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase">{formatLiteralTime(order.created_at)}</span>
                      </div>
                      {!order.confirmed_at && (
                        <button
                          disabled={order.isOptimistic || confirmMutation.isPending}
                          onClick={() => confirmMutation.mutate(order.id)}
                          className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-lg ${order.isOptimistic
                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                            : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-500/20'
                            }`}
                        >
                          {order.isOptimistic ? t('common.loading') : t('pos.confirm_order')}
                        </button>
                      )}
                    </div>

                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-100">
                          <th className="pb-2 pl-1 text-right w-1/2">{t('common.item')}</th>
                          <th className="pb-2 text-center w-1/4">{t('common.quantity')}</th>
                          <th className="pb-2 pr-1 text-left w-1/4">{t('common.total')}</th>
                          <th className="pb-2 w-8"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {order.items
                          .filter((item: any) => item.quantity > 0 && item.status !== 'CANCELLED')
                          .map((item: any) => (
                            <tr key={item.id} className="group hover:bg-slate-50 transition-colors">
                              <td className="py-3 pl-1 text-right align-middle">
                                <div className="flex flex-col">
                                  <span className="text-xs font-black text-slate-900 uppercase tracking-tight line-clamp-1">{item.menu_item?.name}</span>
                                  <span className="text-[9px] font-bold text-slate-400 tabular-nums">{formatCurrency(item.price)}</span>
                                </div>
                              </td>
                              <td className="py-3 align-middle">
                                <div className="flex items-center justify-center gap-2 bg-white border border-slate-100 rounded-lg px-1 py-1 w-fit mx-auto shadow-sm">
                                  <button
                                    disabled={item.isOptimistic}
                                    onClick={() => addToTableMutation.mutate({ tableId: selectedTableId, items: [{ menu_item_id: item.menu_item_id, quantity: -1 }], invoiceId, targetOrderId: order.id })}
                                    className={`size-6 flex items-center justify-center rounded-md transition-colors ${item.isOptimistic ? 'opacity-30 cursor-not-allowed' : 'hover:bg-rose-50 text-slate-400 hover:text-rose-600'}`}
                                  >
                                    <Minus size={12} />
                                  </button>
                                  <span className="text-xs font-black text-slate-900 w-4 text-center">{item.quantity}</span>
                                  <button
                                    disabled={item.isOptimistic}
                                    onClick={() => addToTableMutation.mutate({ tableId: selectedTableId, items: [{ menu_item_id: item.menu_item_id, quantity: 1 }], invoiceId, targetOrderId: order.id })}
                                    className={`size-6 flex items-center justify-center rounded-md transition-colors ${item.isOptimistic ? 'opacity-30 cursor-not-allowed' : 'hover:bg-indigo-50 text-slate-400 hover:text-indigo-600'}`}
                                  >
                                    <Plus size={12} />
                                  </button>
                                </div>
                              </td>
                              <td className="py-3 pr-1 text-left align-middle">
                                <span className="text-xs font-black text-slate-900 tabular-nums">
                                  {formatCurrency(item.price * item.quantity)}
                                </span>
                              </td>
                              <td className="py-3 align-middle">
                                <button
                                  disabled={item.isOptimistic}
                                  onClick={() => addToTableMutation.mutate({ tableId: selectedTableId, items: [{ menu_item_id: item.menu_item_id, quantity: -item.quantity }], invoiceId, targetOrderId: order.id })}
                                  className={`size-6 flex items-center justify-center rounded-md transition-colors ${item.isOptimistic ? 'opacity-30 cursor-not-allowed' : 'text-slate-300 hover:text-rose-500 hover:bg-rose-50'}`}
                                  title={t('common.delete')}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-10 bg-slate-50/50 backdrop-blur-xl border-t border-white/60 space-y-8">
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs font-black text-slate-400 uppercase tracking-widest">
                <span>{t('pos.subtotal')}</span>
                <span className="text-slate-900 tabular-nums">{formatCurrency(subtotal)}</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t('pos.tax')}</label>
                  <input type="number" value={tax || ''} onChange={(e) => setTax(Number(e.target.value))} className="w-full bg-white/60 border border-slate-200/50 rounded-2xl px-5 h-12 text-sm font-black tabular-nums transition-all outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t('pos.discount')}</label>
                  <input type="number" value={discount || ''} onChange={(e) => setDiscount(Number(e.target.value))} className="w-full bg-white/60 border border-slate-200/50 rounded-2xl px-5 h-12 text-sm font-black tabular-nums text-accent-dark outline-none" />
                </div>
              </div>
            </div>

            <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden group/pay">
              <div className="relative z-10 flex items-end justify-between">
                <div className="space-y-1">
                  <div className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">{t('common.total')}</div>
                  <div className="text-4xl font-black tracking-tighter tabular-nums leading-none">{formatCurrency(total)}</div>
                </div>
                <Tag className="size-10 opacity-10 group-hover:scale-110 transition-transform" />
              </div>
            </div>

            <div className="flex flex-col gap-4">
              {!invoiceId && selectedTableId && (
                <button onClick={() => openMutation.mutate({ tableId: selectedTableId })} className="w-full py-6 rounded-[2rem] bg-slate-900 text-white font-black text-xs uppercase tracking-[0.2em] shadow-2xl hover:-translate-y-1 transition-all">
                  {openMutation.isPending ? t('pos.opening') : t('nav.pos')}
                </button>
              )}
              <Can I="close_invoice">
                <button
                  disabled={!invoiceId || subtotal === 0 || closeMutation.isPending || Math.abs(paymentLines.reduce((sum, l) => sum + l.amount, 0) - total) > 0.01}
                  onClick={handleCloseInvoice}
                  className="w-full py-7 rounded-[2.5rem] bg-emerald-500 text-white font-black text-base uppercase tracking-[0.1em] shadow-xl shadow-emerald-500/30 hover:bg-emerald-600 flex items-center justify-center gap-4 transition-all active:scale-95 disabled:opacity-50"
                >
                  <span>{closeMutation.isPending ? t('pos.closing') : t('pos.close_pay')}</span>
                  <ChevronRight className="size-6" />
                </button>
              </Can>
            </div>
          </div>
        </div>
      </div>

      {modifierItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-3xl bg-slate-900/40 animate-in fade-in duration-500">
          <div className="w-full max-w-xl glass-card overflow-hidden shadow-2xl animate-in zoom-in-95 duration-500 flex flex-col relative border-white/40">
            {/* Ambient Background Glow */}
            <div className="absolute top-0 right-0 size-64 bg-indigo-500/10 blur-[100px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 size-64 bg-rose-500/5 blur-[100px] pointer-events-none" />

            {/* Header: Centered & Floating for WOW factor */}
            <div className="p-10 bg-slate-900/5 border-b border-slate-950/5 relative overflow-hidden text-center">
              <div className="absolute inset-0 bg-mesh opacity-30 pointer-events-none" />
              <div className="relative z-10 space-y-6">
                <div className="size-40 rounded-[2.5rem] bg-white shadow-2xl border-8 border-white mx-auto overflow-hidden animate-float group relative">
                  <div className="absolute inset-0 ring-1 ring-inset ring-black/5 rounded-[2.5rem]" />
                  {modifierItem.image_url ? (
                    <img src={modifierItem.image_url} alt={modifierItem.name} className="size-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                  ) : (
                    <div className="size-full flex items-center justify-center text-[10px] font-black text-slate-300 uppercase bg-slate-100/50">No Image</div>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-600 rounded-full shadow-lg shadow-indigo-600/20 border border-indigo-400/30">
                    <span className="size-2 rounded-full bg-white animate-pulse" />
                    <span className="text-[10px] font-black text-white uppercase tracking-widest leading-none">{modifierItem.category || 'Specialty'}</span>
                  </div>
                  <h3 className="text-5xl font-black text-slate-950 tracking-tighter leading-none">{modifierItem.name}</h3>
                  <div className="text-3xl font-black text-indigo-600 tabular-nums">
                    {formatCurrency(modifierItem.price)}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-10 space-y-10 relative z-10">
              {/* Quantity Selector: Premium & Centered */}
              <div className="p-8 bg-slate-100/30 backdrop-blur-md rounded-[2.5rem] border border-white/50 shadow-inner group/qty">
                <div className="flex flex-col items-center gap-6">
                  <div className="space-y-1 text-center">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">{t('common.quantity')}</label>
                    <p className="text-xs font-bold text-slate-500 px-4">{t('common.set_quantity', 'تحديد الكمية للصنف')}</p>
                  </div>
                  <div className="flex items-center gap-12" dir="ltr">
                    <button
                      onClick={() => setModQty(Math.max(1, modQty - 1))}
                      className="size-16 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-400 hover:text-rose-600 hover:border-rose-200 hover:shadow-lg hover:shadow-rose-500/10 transition-all active:scale-90"
                    >
                      <Minus size={24} className="stroke-[3px]" />
                    </button>
                    <span className="text-6xl font-black text-slate-900 tabular-nums w-20 text-center tracking-tighter">{modQty}</span>
                    <button
                      onClick={() => setModQty(modQty + 1)}
                      className="size-16 rounded-2xl bg-slate-950 shadow-xl shadow-slate-900/20 flex items-center justify-center text-white hover:bg-indigo-600 hover:shadow-indigo-500/30 transition-all active:scale-90"
                    >
                      <Plus size={24} className="stroke-[3px]" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Notes: Stylized & Clear */}
              <div className="space-y-4 text-right">
                <div className="flex justify-between items-end px-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{t('common.notes')}</label>
                  <span className="text-[10px] font-black text-indigo-400 tracking-tighter bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">{modNotes.length}/200</span>
                </div>
                <div className="relative group">
                  <textarea
                    placeholder={t('common.notes_placeholder', 'مثال: بدون بصل، زيادة شطة...')}
                    value={modNotes}
                    onChange={(e) => setModNotes(e.target.value.slice(0, 200))}
                    className="w-full h-36 bg-white/70 backdrop-blur-sm border-2 border-slate-200/50 rounded-[2rem] p-8 text-slate-900 placeholder-slate-300 focus:bg-white focus:border-indigo-500 focus:ring-[15px] focus:ring-indigo-500/5 outline-none transition-all resize-none text-base font-bold leading-relaxed shadow-sm px-6"
                  />
                  <div className="absolute inset-0 rounded-[2rem] ring-1 ring-inset ring-black/5 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Actions: High-End Shine Buttons */}
            <div className="p-10 pt-0 flex gap-6">
              <button
                onClick={() => setModifierItem(null)}
                className="flex-1 py-7 rounded-[2.25rem] bg-slate-100 text-slate-500 font-black text-xs uppercase tracking-widest border border-slate-200 hover:bg-white hover:text-slate-900 hover:shadow-lg transition-all active:scale-95"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={async () => {
                  try {
                    let targetInvId = invoiceId;
                    if (!targetInvId && !openMutation.isPending) {
                      const inv = await openMutation.mutateAsync({ tableId: selectedTableId });
                      targetInvId = inv.id;
                      setInvoiceId(inv.id);
                    }
                    if (!targetInvId) throw new Error('No invoice context');

                    await addToTableMutation.mutateAsync({
                      tableId: selectedTableId,
                      items: [{ menu_item_id: modifierItem.id, quantity: modQty, notes: modNotes }],
                      invoiceId: targetInvId
                    });
                    setModifierItem(null);
                    setModQty(1);
                    setModNotes('');
                  } catch (error) {
                    console.error('Action failed:', error);
                  }
                }}
                className="btn-indigo flex-[2] py-7 rounded-[2.25rem] text-sm uppercase tracking-[0.25em] group shadow-2xl shadow-indigo-600/30"
              >
                <Plus size={20} className="stroke-[4px] group-hover:rotate-180 transition-transform duration-700" />
                <span>{t('pos.add_to_order')}</span>
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
        onConfirm={(val) => {
          dialog.onConfirm(val);
          setDialog(p => ({ ...p, isOpen: false }));
        }}
        confirmText={lastClosedInvoice ? t('pos.print_receipt', 'Print Receipt') : undefined}
        cancelText={lastClosedInvoice ? t('common.close', 'Close') : undefined}
      />

      <div className="hidden print:block fixed inset-0 bg-white z-[9999] p-8 text-slate-900 font-sans" dir={i18n.dir()}>
        <div className="max-w-[80mm] mx-auto space-y-6 text-center">
          {settings.restaurant_logo && (
            <img src={settings.restaurant_logo} alt="Logo" className="w-24 h-24 mx-auto object-contain mb-2" />
          )}
          <h1 className="text-xl font-black uppercase tracking-tight">{settings.restaurant_name || 'RMS System'}</h1>
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{new Date().toLocaleString()}</div>
          {selectedTableId && <div className="text-sm font-black border-y border-slate-100 py-2">{t('common.table_name')}: {tables.find((t: any) => t.id === selectedTableId)?.name}</div>}

          <div className="text-left space-y-4 pt-6">
            {(lastClosedInvoice?.orders || (Array.isArray(orders) ? orders : (orders as any)?.data || [])).flatMap((o: any) => o.items).map((item: any, idx: number) => (
              <div key={idx} className="flex justify-between items-start gap-4 text-xs font-bold uppercase">
                <span>{item.quantity}x {item.menu_item?.name || item.name}</span>
                <span className="tabular-nums">{formatCurrency(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-100 pt-4 space-y-2 mt-6">
            <div className="flex justify-between text-xs font-bold">
              <span>{t('pos.subtotal')}</span>
              <span className="tabular-nums">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-base font-black border-t-2 border-slate-900 pt-2 uppercase">
              <span>{t('common.total')}</span>
              <span className="tabular-nums">{formatCurrency(lastClosedInvoice ? lastClosedInvoice.total : total)}</span>
            </div>
          </div>

          <div className="text-center pt-8 border-t border-dashed border-slate-200 mt-10">
            <p className="text-[10px] font-black uppercase tracking-widest">Thank You / شكراً لكم</p>
          </div>
        </div>

        {/* Departmental Tickets */}
        {tickets.map((ticket, tIdx) => (
          <div key={tIdx} className="max-w-[80mm] mx-auto space-y-6 mt-20 pt-20 border-t-2 border-dotted border-slate-300 print-break-before">
            <div className="text-center space-y-3">
              <h2 className="text-xl font-black uppercase tracking-widest bg-slate-100 py-2">
                KITCHEN TICKET: {ticket.section_name}
              </h2>
              <div className="text-[10px] font-bold text-slate-500 uppercase">
                {new Date().toLocaleString()}
              </div>
              <div className="text-sm font-black border-y border-slate-100 py-2">
                {selectedTableId ? `TABLE: ${tables.find((t: any) => t.id === selectedTableId)?.name}` : 'TAKEAWAY'}
              </div>
            </div>

            <div className="space-y-4">
              {ticket.items.map((item: any, iIdx: number) => (
                <div key={iIdx} className="flex justify-between items-start gap-4 text-sm font-black uppercase">
                  <div className="space-y-1 text-left">
                    <div>{item.quantity}x {item.name}</div>
                    {item.notes && <div className="text-[10px] text-slate-500 italic lowercase">- {item.notes}</div>}
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center pt-8 border-t border-dashed border-slate-200">
              <p className="text-[10px] font-black uppercase tracking-widest">{ticket.section_name} Station</p>
            </div>
          </div>
        ))}
      </div>
    </div >
  )
}
