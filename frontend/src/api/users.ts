import { apiClient } from './client'
import type { User } from '../types'

export const fetchUsers = async () => {
  const { data } = await apiClient.get<User[]>('/users')
  return data
}

export const createUser = async (payload: {
  name: string
  email: string
  password: string
  phone?: string
  is_active?: boolean
  role_ids?: number[]
}) => {
  const { data } = await apiClient.post<User>('/users', payload)
  return data
}

export const updateUser = async (id: number, payload: Partial<User> & { role_ids?: number[] }) => {
  const { data } = await apiClient.put<User>(`/users/${id}`, payload)
  return data
}

export const deleteUser = async (id: number) => {
  const { data } = await apiClient.delete(`/users/${id}`)
  return data
}
