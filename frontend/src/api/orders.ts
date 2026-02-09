import { apiClient } from './client'
import type { Order, OrderItem, OrderItemStatus } from '../types'

export const fetchOrders = async (params: any = {}) => {
  const { data } = await apiClient.get<Order[] | { data: Order[] }>('/orders', {
    params: { paginate: false, ...params }
  })

  if (Array.isArray(data)) {
    return data
  } else if (data && typeof data === 'object' && 'data' in data && Array.isArray(data.data)) {
    return data.data
  }
  return [] as Order[]
}

export type CreateOrderPayload = {
  table_id?: number | null
  invoice_id?: number | null
  customer_name?: string
  items: { menu_item_id: number; quantity: number; notes?: string }[]
}

export const createOrder = async (payload: CreateOrderPayload) => {
  const { data } = await apiClient.post<Order>('/orders', payload)
  return data
}

export type AddItemsPayload = { menu_item_id: number; quantity: number; notes?: string }[]

export const addItemsToOrder = async (orderId: number, items: AddItemsPayload) => {
  const { data } = await apiClient.put<Order>(`/orders/${orderId}`, { items })
  return data
}

export const updateOrderItemStatus = async (id: number, status: OrderItemStatus) => {
  const { data } = await apiClient.patch<OrderItem>(`/order-items/${id}/status`, { status })
  return data
}

export const confirmOrder = async (orderId: number) => {
  const { data } = await apiClient.post<Order>(`/orders/${orderId}/confirm`)
  return data
}

export const cancelOrder = async (orderId: number) => {
  const { data } = await apiClient.post<Order>(`/orders/${orderId}/cancel`)
  return data
}
