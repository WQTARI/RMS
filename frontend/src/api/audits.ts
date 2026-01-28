import { apiClient } from './client'

export interface AuditLog {
    id: number
    type: 'order' | 'system'
    action: string
    description: string
    user_name: string
    occurred_at: string
    details: any
}

export const fetchAudits = async (page = 1) => {
    const { data } = await apiClient.get<{ data: AuditLog[]; current_page: number; last_page: number }>(`/audits?page=${page}`)
    return data
}
