import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { fetchSettings as fetchRestaurantSettingsApi } from '../api/settings'

interface Settings {
    restaurant_name: string
    restaurant_logo: string | null
    [key: string]: any
}

interface SettingsContextType {
    settings: Settings
    isLoading: boolean
    refreshSettings: () => Promise<void>
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

// Helper to ensure URLs are absolute for images
const getAbsoluteUrl = (url: string | null) => {
    if (!url) return null
    // Clean whitespace and potential newlines that might come from DB wrapping
    const sanitized = url.trim().replace(/[\n\r]/g, '')
    if (sanitized.startsWith('http')) return sanitized
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'
    const host = baseUrl.replace('/api', '')
    return `${host}${sanitized.startsWith('/') ? '' : '/'}${sanitized}`
}

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [settings, setSettings] = useState<Settings>({
        restaurant_name: 'RMS System',
        restaurant_logo: null,
    })
    const [isLoading, setIsLoading] = useState(true)

    const fetchSettings = async () => {
        try {
            const data = await fetchRestaurantSettingsApi()
            // Spread data first, then override name and logo with processed versions
            const mappedSettings = {
                ...data,
                restaurant_name: data.restaurant_name || 'RMS System',
                restaurant_logo: getAbsoluteUrl(data.restaurant_logo),
            }
            setSettings(mappedSettings)
        } catch (error) {
            console.error('Failed to fetch settings:', error)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchSettings()
    }, [])

    return (
        <SettingsContext.Provider value={{ settings, isLoading, refreshSettings: fetchSettings }}>
            {children}
        </SettingsContext.Provider>
    )
}

export const useSettings = () => {
    const context = useContext(SettingsContext)
    if (context === undefined) {
        throw new Error('useSettings must be used within a SettingsProvider')
    }
    return context
}
