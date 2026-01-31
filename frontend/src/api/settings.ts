import { apiClient } from './client'

export interface RestaurantSettings {
  restaurant_name: string
  restaurant_logo: string
}

export const fetchSettings = async () => {
  const { data } = await apiClient.get<Record<string, string>>('/settings')
  return data
}

export const updateSettings = async (settings: Partial<RestaurantSettings>) => {
  const { data } = await apiClient.put('/settings', { settings })
  return data
}

export const uploadLogo = async (file: File) => {
  const formData = new FormData()
  formData.append('logo', file)
  const { data } = await apiClient.post<{ url: string; message: string }>('/settings/upload-logo', formData)
  return data
}
