import { useAuth } from '../context/AuthContext'

/**
 * Reusable hook to check if the current user has a specific permission.
 */
export const usePermission = (permission: string): boolean => {
    const { hasPermission } = useAuth()
    return hasPermission(permission)
}
