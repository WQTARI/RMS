import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import arTranslation from './locales/ar.json'
import enTranslation from './locales/en.json'

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources: {
            ar: { translation: arTranslation },
            en: { translation: enTranslation }
        },
        fallbackLng: 'ar',
        lng: 'ar', // Primary language as requested
        interpolation: {
            escapeValue: false
        }
    })

// Set initial direction
document.documentElement.dir = i18n.language === 'ar' ? 'rtl' : 'ltr'
document.documentElement.lang = i18n.language

i18n.on('languageChanged', (lng) => {
    document.documentElement.dir = lng === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.lang = lng
})

export default i18n
