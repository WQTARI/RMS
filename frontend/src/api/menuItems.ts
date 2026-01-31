import { apiClient } from './client'
import type { MenuItem } from '../types'

export const fetchMenuItems = async (params?: { active?: boolean }) => {
  const { data } = await apiClient.get<MenuItem[]>('/menu-items', { params })
  return data
}

export const createMenuItem = async (payload: Partial<MenuItem> | FormData) => {
  const { data } = await apiClient.post<MenuItem>('/menu-items', payload)
  return data
}

export const updateMenuItem = async ({ id, data: payload }: { id: number; data: Partial<MenuItem> | FormData }) => {
  const { data } = await apiClient.post<MenuItem>(`/menu-items/${id}?_method=PUT`, payload)
  return data
}

export const deleteMenuItem = async (id: number) => {
  await apiClient.delete(`/menu-items/${id}`)
}
