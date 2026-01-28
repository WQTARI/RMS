import { apiClient } from './client'
import type { RestaurantTable } from '../types'

export const fetchTables = async () => {
  const { data } = await apiClient.get<RestaurantTable[]>('/tables')
  return data
}

export const createTable = async (payload: Partial<RestaurantTable>) => {
  const { data } = await apiClient.post<RestaurantTable>('/tables', payload)
  return data
}

export const updateTable = async (id: number, payload: Partial<RestaurantTable>) => {
  const { data } = await apiClient.put<RestaurantTable>(`/tables/${id}`, payload)
  return data
}

export const deleteTable = async (id: number) => {
  await apiClient.delete(`/tables/${id}`)
}
