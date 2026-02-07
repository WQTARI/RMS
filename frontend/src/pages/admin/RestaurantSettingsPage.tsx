import { useState, useEffect } from 'react'
import { Save, Upload, Store, Loader2, CheckCircle2 } from 'lucide-react'
import { toast } from 'react-hot-toast'
import * as settingsApi from '../../api/settings'

export const RestaurantSettingsPage = () => {
    const [settings, setSettings] = useState({
        restaurant_name: '',
        restaurant_logo: '',
    })
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [isUploading, setIsUploading] = useState(false)

    useEffect(() => {
        loadSettings()
    }, [])

    const loadSettings = async () => {
        try {
            const data = await settingsApi.fetchSettings()
            setSettings(prev => ({ ...prev, ...data }))
        } catch (error) {
            console.error('Failed to load settings:', error)
            toast.error('Failed to load settings')
        } finally {
            setIsLoading(false)
        }
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSaving(true)
        try {
            await settingsApi.updateSettings(settings)
            toast.success('Settings saved successfully')
        } catch (error: any) {
            console.error('Failed to save settings:', error)
            const message = error.response?.data?.message || 'Failed to save settings'
            toast.error(message)
        } finally {
            setIsSaving(false)
        }
    }

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setIsUploading(true)
        try {
            const response = await settingsApi.uploadLogo(file)
            setSettings(prev => ({ ...prev, restaurant_logo: response.url }))
            toast.success('Logo uploaded successfully')
        } catch (error: any) {
            console.error('Failed to upload logo:', error)
            const message = error.response?.data?.message || 'Failed to upload logo'
            toast.error(message)
        } finally {
            setIsUploading(false)
        }
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <Loader2 className="w-12 h-12 text-primary animate-spin" />
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tighter mb-2">Restaurant Settings</h1>
                    <p className="text-slate-500 font-medium tracking-tight">Configure Your Brand Identity and Invoicing</p>
                </div>
                <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                    <Store size={32} />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-2 space-y-8">
                    <form onSubmit={handleSave} className="card-aura p-10 space-y-8 bg-white/60">
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="field-label text-slate-900">Restaurant Name</label>
                                <input
                                    type="text"
                                    value={settings.restaurant_name}
                                    onChange={e => setSettings(prev => ({ ...prev, restaurant_name: e.target.value }))}
                                    className="glass-input bg-slate-50/50"
                                    placeholder="Antigravity Kitchen"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isSaving}
                            className="btn-aura w-full py-6 group"
                        >
                            {isSaving ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    <Save className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                    Save Changes
                                </>
                            )}
                        </button>
                    </form>
                </div>

                <div className="space-y-8">
                    <div className="card-aura p-8 space-y-6 bg-white/60 text-center">
                        <label className="field-label text-slate-900 mb-4 block">Brand Logo</label>

                        <div className="relative group mx-auto w-48 h-48 rounded-[2rem] bg-slate-50 border-4 border-white shadow-xl overflow-hidden flex items-center justify-center bg-mesh">
                            {settings.restaurant_logo ? (
                                <img
                                    src={settings.restaurant_logo}
                                    alt="Logo"
                                    className="w-full h-full object-contain"
                                />
                            ) : (
                                <Store size={64} className="text-slate-200" />
                            )}

                            {isUploading && (
                                <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center">
                                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                                </div>
                            )}

                            <label className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all cursor-pointer flex flex-col items-center justify-center text-white gap-2">
                                <Upload size={24} />
                                <span className="text-[10px] font-black uppercase tracking-widest">Change Image</span>
                                <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                            </label>
                        </div>

                        <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100/50">
                            <div className="flex items-center gap-3 text-indigo-700 mb-1">
                                <CheckCircle2 size={16} />
                                <span className="text-[10px] font-black uppercase tracking-widest">Print Ready</span>
                            </div>
                            <p className="text-[11px] text-indigo-600/70 font-medium leading-relaxed">
                                Upload a transparent PNG or high-contrast JPG for best results on thermal receipts.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
