import { apiClient } from './client'
import type { Order } from '../types'

export const fetchDailySales = async (date?: string) => {
  const { data } = await apiClient.get('/reports/daily-sales', { params: { date } })
  return data as { date: string; total: number }
}

export const fetchMonthlySales = async (month?: string) => {
  const { data } = await apiClient.get('/reports/monthly-sales', { params: { month } })
  return data as { month: string; total: number }
}

export const fetchSalesBySection = async () => {
  const { data } = await apiClient.get('/reports/sales-by-section')
  return data as { name: string; total: number }[]
}

export const fetchTopItems = async (limit?: number) => {
  const { data } = await apiClient.get('/reports/top-items', { params: { limit } })
  return data as { menu_item_id: number; qty: number; menu_item?: { name: string } }[]
}


export const fetchTablePerformance = async () => {
  const { data } = await apiClient.get('/reports/table-performance')
  return data as { id: number; name: string; orders_count: number; invoices_sum_total: number; avg_order_value: number }[]
}

export const fetchOrderHistory = async (params: { page?: number; search?: string; start_date?: string; end_date?: string } = {}) => {
  const { data } = await apiClient.get('/orders', {
    params: {
      status: 'CLOSED',
      paginate: true,
      ...params
    }
  })
  return data as { data: Order[]; current_page: number; last_page: number; total: number }
}

export const fetchSalesTrend = async (days = 30) => {
  const { data } = await apiClient.get('/reports/sales-trend', { params: { days } })
  return data as { date: string; total: number }[]
}

