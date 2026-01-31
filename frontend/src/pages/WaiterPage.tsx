import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { CheckCircle2 } from 'lucide-react'
import { apiClient } from '../api/client'

interface OrderItem {
    id: number
    menu_item: {
        id: number
        name: string
    }
    quantity: number
    status: string
    prep_section: {
        id: number
        name: string
    }
    order: {
        id: number
        table?: {
            id: number
            name: string
        }
        customer_name?: string
    }
}

export default function WaiterPage() {
    const { t } = useTranslation()
    const queryClient = useQueryClient()

    // Fetch all orders and filter for READY items
    const { data: orders } = useQuery({
        queryKey: ['orders', 'waiter'],
        queryFn: async () => {
            const response = await apiClient.get('/orders', {
                params: {
                    paginate: false,
                    ready_only: true
                }
            })
            return response.data
        },
        refetchInterval: 3000, // Auto-refresh every 3 seconds
    })

    // Extract READY items from all orders
    const readyItems: OrderItem[] = (orders || [])
        .flatMap((order: any) =>
            (order.items || [])
                .filter((item: any) => item.status === 'READY')
                .map((item: any) => ({
                    ...item,
                    order: {
                        id: order.id,
                        table: order.table,
                        customer_name: order.customer_name
                    }
                }))
        )

    const serveMutation = useMutation({
        mutationFn: (itemId: number) => apiClient.post(`/order-items/${itemId}/serve`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['orders'] })
        },
    })

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-slate-100 p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-12 text-center">
                    <h1 className="text-6xl font-black text-slate-900 uppercase tracking-tighter mb-4">
                        {t('nav.waiter', 'Waiter Station')}
                    </h1>
                    <p className="text-lg font-bold text-slate-500 uppercase tracking-widest">
                        {t('waiter.ready_items', 'Ready to Serve')}
                    </p>
                </div>

                {/* Ready Items Grid */}
                {readyItems.length === 0 ? (
                    <div className="text-center py-32">
                        <div className="inline-block p-12 rounded-[4rem] bg-white/60 backdrop-blur-xl border-2 border-white/80 shadow-2xl">
                            <CheckCircle2 size={80} className="mx-auto mb-6 text-emerald-500" />
                            <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight mb-2">
                                {t('waiter.no_items', 'All Clear!')}
                            </h2>
                            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">
                                {t('waiter.no_items_desc', 'No items ready for pickup')}
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {readyItems.map((item) => (
                            <div
                                key={item.id}
                                className="group relative p-8 rounded-[3rem] bg-white/80 backdrop-blur-xl border-2 border-white shadow-2xl hover:shadow-emerald-500/20 transition-all duration-500 hover:scale-105"
                            >
                                {/* Prep Section Badge */}
                                <div className="absolute top-6 right-6 px-4 py-2 rounded-2xl bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest shadow-lg">
                                    {item.prep_section?.name || 'Kitchen'}
                                </div>

                                {/* Item Info */}
                                <div className="space-y-6 mb-8">
                                    <div>
                                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                                            {t('common.table_name', 'Table')}
                                        </div>
                                        <div className="text-3xl font-black text-slate-900 uppercase tracking-tighter">
                                            {item.order.table?.name
                                                ? `${item.order.table.name}${item.order.customer_name ? ` (${item.order.customer_name})` : ''}`
                                                : (item.order.customer_name || `${t('common.order', 'Order')} #${item.order.id}`)
                                            }
                                        </div>
                                    </div>

                                    <div>
                                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                                            {t('common.item', 'Item')}
                                        </div>
                                        <div className="text-xl font-black text-slate-700 leading-tight">
                                            {item.quantity}x {item.menu_item?.name}
                                        </div>
                                    </div>
                                </div>

                                {/* Pickup Button */}
                                <button
                                    onClick={() => serveMutation.mutate(item.id)}
                                    disabled={serveMutation.isPending}
                                    className="w-full py-6 rounded-3xl bg-emerald-500 text-white font-black text-lg uppercase tracking-widest shadow-xl shadow-emerald-500/30 hover:bg-emerald-600 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {serveMutation.isPending ? t('common.loading', 'Loading...') : t('waiter.pickup', 'Pickup')}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
