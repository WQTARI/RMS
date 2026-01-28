import { apiClient } from './client'
import type { MenuItem } from '../types'

export const fetchMenuItems = async (params?: { active?: boolean }) => {
  const { data } = await apiClient.get<MenuItem[]>('/menu-items', { params })
  return data
}

export const createMenuItem = async (payload: Partial<MenuItem>) => {
  const { data } = await apiClient.post<MenuItem>('/menu-items', payload)
  return data
}

export const updateMenuItem = async (id: number, payload: Partial<MenuItem>) => {
  const { data } = await apiClient.put<MenuItem>(`/menu-items/${id}`, payload)
  return data
}

export const deleteMenuItem = async (id: number) => {
  const { data } = await apiClient.delete(`/menu-items/${id}`)
  return data
}
