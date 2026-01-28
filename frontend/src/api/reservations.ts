import { apiClient } from './client'
import type { Reservation } from '../types'

export interface ReservationPayload {
  customer_name: string
  phone: string
  date_time: string
  duration_minutes?: number
  number_of_guests: number
  table_id: number
  notes?: string
}

export const fetchReservations = async (params?: { status?: string; date?: string }) => {
  const { data } = await apiClient.get<Reservation[]>('/reservations', { params })
  return data
}

export const createReservation = async (payload: ReservationPayload) => {
  const { data } = await apiClient.post<Reservation>('/reservations', payload)
  return data
}

export const updateReservation = async (id: number, payload: Partial<ReservationPayload> & { status?: string }) => {
  const { data } = await apiClient.put<Reservation>(`/reservations/${id}`, payload)
  return data
}

export const deleteReservation = async (id: number) => {
  await apiClient.delete(`/reservations/${id}`)
}

export const convertReservation = async (
  id: number,
  items: { menu_item_id: number; quantity: number; notes?: string }[]
) => {
  const { data } = await apiClient.post(`/reservations/${id}/convert`, { items })
  return data
}
