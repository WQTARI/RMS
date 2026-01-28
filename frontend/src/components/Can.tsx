import React from 'react'
import { useAuth } from '../context/AuthContext'

interface CanProps {
    I: string
    children: React.ReactNode
    fallback?: React.ReactNode
}

/**
 * Declarative component to wrap UI elements that require specific permissions.
 */
export const Can: React.FC<CanProps> = ({ I, children, fallback = null }) => {
    const { hasPermission } = useAuth()

    if (hasPermission(I)) {
        return <>{children}</>
    }

    return <>{fallback}</>
}
