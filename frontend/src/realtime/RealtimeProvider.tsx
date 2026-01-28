import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { Invoice, Order, OrderItem, RestaurantTable } from '../types'
import { getEcho } from './echo'
import { useAuth } from '../context/AuthContext'
import { toast } from 'react-hot-toast'
import { useTranslation } from 'react-i18next'

const RealtimeContext = createContext<{ isEnabled: boolean }>({ isEnabled: false })

export const useRealtime = () => useContext(RealtimeContext)

export const RealtimeProvider = ({ children }: { children: React.ReactNode }) => {
  const queryClient = useQueryClient()
  const { token, user } = useAuth()
  const { t } = useTranslation()
  const wasConnectedRef = useRef(false)
  const [isEnabled, setIsEnabled] = useState(false)
  const fallbackLoggedRef = useRef(false)

  useEffect(() => {
    const echo = getEcho(token)
    if (!echo) {
      setIsEnabled(false)
      return
    }

    const connection = echo.connector?.pusher?.connection

    const setupListeners = () => {
      setIsEnabled(true)
      const tablesChannel = echo.private('tables')
      const ordersChannel = echo.private('orders')
      const orderItemsChannel = echo.private('order-items')
      const invoicesChannel = echo.private('invoices')
      const reservationsChannel = echo.private('reservations')

      if (user?.prep_section_id) {
        echo.private(`prep-sections.${user.prep_section_id}`).listen('.ProductionTicketDispatched', (event: { order: Order; items: OrderItem[] }) => {
          toast.success(t('pos.order_received', { id: event.order.id }), { icon: '🍳' })
          queryClient.invalidateQueries({ queryKey: ['orders'] })
        })
      }

      reservationsChannel.listen('.ReservationUpdated', () => queryClient.invalidateQueries({ queryKey: ['reservations'] }))

      tablesChannel.listen('.TableStatusUpdated', (event: { table: RestaurantTable }) => {
        queryClient.setQueryData<RestaurantTable[]>(['tables'], (current) => {
          if (!current) return current
          return current.map((table) => (table.id === event.table.id ? event.table : table))
        })
      })

      ordersChannel.listen('.OrderCreated', (event: { order: Order }) => {
        toast.success(t('pos.order_received', { id: event.order.id }), { icon: '🛒' })
        queryClient.setQueriesData<Order[]>(({ queryKey: ['orders'] }), (current) => (current ? [event.order, ...current] : [event.order]))
      })

      ordersChannel.listen('.OrderStatusUpdated', (event: { order: Order }) => {
        queryClient.invalidateQueries({ queryKey: ['tables'] })
        queryClient.setQueriesData<Order[]>(({ queryKey: ['orders'] }), (current) => current ? current.map((o) => (o.id === event.order.id ? event.order : o)) : current)
      })

      orderItemsChannel.listen('.OrderItemUpdated', (event: { orderItem: OrderItem }) => {
        if (event.orderItem.status === 'READY') {
          toast.success(t('pos.order_item_ready', { name: event.orderItem.menu_item?.name }), { icon: '🔔' })
        }
        queryClient.setQueriesData<Order[]>(({ queryKey: ['orders'] }), (current) =>
          current ? current.map((order) => ({
            ...order,
            items: order.items.map((item) => item.id === event.orderItem.id ? event.orderItem : item),
          })) : current
        )
      })

      invoicesChannel.listen('.InvoiceClosed', (event: { invoice: Invoice }) => {
        toast.success(t('pos.invoice_closed_success', { id: event.invoice.id }), { icon: '💰' })
        queryClient.setQueriesData<Invoice[]>(({ queryKey: ['invoices'] }), (current) =>
          current ? current.map((invoice) => invoice.id === event.invoice.id ? event.invoice : invoice) : current
        )
        queryClient.invalidateQueries({ queryKey: ['tables'] })
      })
    }

    const handleStateChange = (states: { current: string }) => {
      const isNowConnected = states.current === 'connected'
      setIsEnabled(isNowConnected)

      if (isNowConnected) {
        setupListeners()
        if (!wasConnectedRef.current) {
          wasConnectedRef.current = true
        } else {
          queryClient.invalidateQueries()
        }
      } else if (states.current === 'unavailable' || states.current === 'failed' || states.current === 'disconnected') {
        if (!fallbackLoggedRef.current && states.current !== 'disconnected') {
          console.log('%c[RMS] Real-time unavailable. Switching to high-stability polling.', 'color: #f59e0b; font-weight: bold;')
          fallbackLoggedRef.current = true
        }
      }
    }

    if (connection) {
      connection.bind('state_change', handleStateChange)
      if (connection.state === 'connected') {
        setupListeners()
      }
    }

    return () => {
      if (connection) {
        connection.unbind('state_change', handleStateChange)
      }
      echo.leave('tables')
      echo.leave('orders')
      echo.leave('order-items')
      echo.leave('invoices')
      echo.leave('reservations')
      if (user?.prep_section_id) {
        echo.leave(`prep-sections.${user.prep_section_id}`)
      }
    }
  }, [queryClient, token, user?.prep_section_id, t])

  return (
    <RealtimeContext.Provider value={{ isEnabled }}>
      {children}
    </RealtimeContext.Provider>
  )
}
