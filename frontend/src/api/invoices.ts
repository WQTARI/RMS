import { apiClient } from './client'
import type { Invoice } from '../types'

export const fetchInvoices = async (params?: { status?: string; table_id?: number | null }) => {
  const { data } = await apiClient.get<Invoice[]>('/invoices', { params })
  return data
}

export const fetchOpenInvoiceForTable = async (tableId: number) => {
  const { data } = await apiClient.get<Invoice[]>('/invoices', {
    params: { status: 'OPEN', table_id: tableId },
  })
  return data[0] ?? null
}

export const fetchInvoice = async (id: number) => {
  const { data } = await apiClient.get<Invoice>(`/invoices/${id}`)
  return data
}

export const openInvoice = async (tableId: number | null, customerName?: string) => {
  const { data } = await apiClient.post<Invoice>('/invoices', {
    table_id: tableId,
    customer_name: customerName
  })
  return data
}

export const closeInvoice = async (
  id: number,
  payload: { tax?: number; discount?: number; payments: { method: string; amount: number }[] }
) => {
  const { data } = await apiClient.put<Invoice>(`/invoices/${id}`, payload)
  return data
}

export const fetchInvoiceTickets = async (id: number) => {
  const { data } = await apiClient.get<any[]>(`/invoices/${id}/tickets`)
  return data
}
