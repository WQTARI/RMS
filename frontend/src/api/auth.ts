import { apiClient } from './client'
import type { User } from '../types'

export interface LoginPayload {
  email: string
  password: string
  device_name?: string
}

export interface LoginResponse {
  token: string
  user: User
}

export const login = async (payload: LoginPayload) => {
  const { data } = await apiClient.post<LoginResponse>('/auth/login', {
    device_name: 'rms-web',
    ...payload,
  })
  return data
}

export const fetchMe = async () => {
  const { data } = await apiClient.get<User>('/auth/me')
  return data
}

export const logout = async () => {
  const { data } = await apiClient.post('/auth/logout')
  return data
}
