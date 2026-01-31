import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X, AlertTriangle, AlertCircle, HelpCircle, CheckCircle } from 'lucide-react'

interface DialogProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: (value?: string) => void
    title: string
    description?: string
    confirmText?: string
    cancelText?: string
    type?: 'info' | 'danger' | 'warning' | 'prompt' | 'success'
    placeholder?: string
    defaultValue?: string
}

export const Dialog: React.FC<DialogProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    confirmText,
    cancelText,
    type = 'info',
    placeholder,
    defaultValue = ''
}) => {
    const { t } = useTranslation()
    const [inputValue, setInputValue] = useState(defaultValue)

    React.useEffect(() => {
        if (isOpen) {
            setInputValue(defaultValue)
        }
    }, [isOpen, defaultValue])

    if (!isOpen) return null

    const handleConfirm = () => {
        onConfirm(type === 'prompt' ? inputValue : undefined)
        onClose()
    }

    const Icons = {
        info: <HelpCircle className="w-6 h-6 text-indigo-600" />,
        danger: <AlertCircle className="w-6 h-6 text-rose-600" />,
        warning: <AlertTriangle className="w-6 h-6 text-amber-600" />,
        prompt: <HelpCircle className="w-6 h-6 text-indigo-600" />,
        success: <CheckCircle className="w-6 h-6 text-emerald-600" />
    }

    const buttonColors = {
        info: 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200',
        danger: 'bg-rose-600 hover:bg-rose-700 shadow-rose-200',
        warning: 'bg-amber-600 hover:bg-amber-700 shadow-amber-200',
        prompt: 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200',
        success: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="relative w-full max-w-md bg-white rounded-[32px] p-8 shadow-2xl animate-in fade-in zoom-in duration-200">
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 p-2 rounded-full text-slate-400 hover:bg-slate-100 transition-colors"
                >
                    <X size={20} />
                </button>

                <div className="flex flex-col items-center text-center">
                    <div className={`p-4 rounded-3xl mb-6 ${type === 'danger' ? 'bg-rose-50' : type === 'warning' ? 'bg-amber-50' : type === 'success' ? 'bg-emerald-50' : 'bg-indigo-50'}`}>
                        {Icons[type]}
                    </div>

                    <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-2">
                        {title}
                    </h3>

                    {description && (
                        <p className="text-sm font-bold text-slate-500 mb-6">
                            {description}
                        </p>
                    )}

                    {type === 'prompt' && (
                        <div className="w-full mb-8">
                            <input
                                autoFocus
                                type="text"
                                className="w-full px-5 py-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 font-bold placeholder:text-slate-400 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                                placeholder={placeholder || t('common.search')}
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
                            />
                        </div>
                    )}

                    <div className="flex w-full gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 py-4 px-6 rounded-2xl bg-slate-100 text-slate-500 font-black text-sm uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95"
                        >
                            {cancelText || t('common.cancel')}
                        </button>
                        <button
                            onClick={handleConfirm}
                            className={`flex-1 py-4 px-6 rounded-2xl text-white font-black text-sm uppercase tracking-widest shadow-lg transition-all active:scale-95 ${buttonColors[type]}`}
                        >
                            {confirmText || (type === 'prompt' ? t('common.save') : t('common.confirm'))}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
