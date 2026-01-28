import { apiClient } from './client'
import type { PrepSection, TableSection } from '../types'

export const fetchTableSections = async () => {
  const { data } = await apiClient.get<TableSection[]>('/table-sections')
  return data
}

export const createTableSection = async (payload: Partial<TableSection>) => {
  const { data } = await apiClient.post<TableSection>('/table-sections', payload)
  return data
}

export const updateTableSection = async (id: number, payload: Partial<TableSection>) => {
  const { data } = await apiClient.put<TableSection>(`/table-sections/${id}`, payload)
  return data
}

export const deleteTableSection = async (id: number) => {
  const { data } = await apiClient.delete(`/table-sections/${id}`)
  return data
}

export const fetchPrepSections = async () => {
  const { data } = await apiClient.get<PrepSection[]>('/prep-sections')
  return data
}

export const createPrepSection = async (payload: Partial<PrepSection>) => {
  const { data } = await apiClient.post<PrepSection>('/prep-sections', payload)
  return data
}

export const updatePrepSection = async (id: number, payload: Partial<PrepSection>) => {
  const { data } = await apiClient.put<PrepSection>(`/prep-sections/${id}`, payload)
  return data
}

export const deletePrepSection = async (id: number) => {
  const { data } = await apiClient.delete(`/prep-sections/${id}`)
  return data
}
