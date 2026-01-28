import { apiClient } from './client'
import type { Role } from '../types'

export const fetchRoles = async () => {
    const { data } = await apiClient.get<Role[]>('/roles')
    return data
}
