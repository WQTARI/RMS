import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useSettings } from '../context/SettingsContext'
import { useTranslation } from 'react-i18next'
import { Utensils, Eye, EyeOff, ArrowRight, ArrowLeft } from 'lucide-react'

export const LoginPage = () => {
  const { t, i18n } = useTranslation()
  const { login } = useAuth()
  const { settings, isLoading: isSettingsLoading } = useSettings()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const isRtl = i18n.dir() === 'rtl'

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setIsLoading(true)
    try {
      await login(email, password)
      navigate('/')
    } catch (err) {
      setError(t('auth.login_failed'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-mesh px-6 relative overflow-hidden font-cairo text-slate-900" dir={i18n.dir()}>
      <div className="absolute top-[-25%] left-[-15%] w-[60rem] h-[60rem] bg-indigo-300/30 rounded-full blur-[120px] animate-morph opacity-80"></div>
      <div className="absolute bottom-[-25%] right-[-15%] w-[55rem] h-[55rem] bg-purple-300/35 rounded-full blur-[120px] animate-morph opacity-70" style={{ animationDelay: '2s', animationDuration: '18s' }}></div>
      <div className="absolute top-1/4 right-1/4 w-[35rem] h-[35rem] bg-[#8E7CF0]/20 rounded-full blur-[100px] animate-pulse"></div>

      <div className="w-full max-w-md bg-slate-50/70 backdrop-blur-3xl rounded-[2rem] p-8 md:p-10 relative z-10 shadow-[0_20px_50px_rgba(108,93,211,0.15)] border border-white/60">
        <div className="flex flex-col items-center mb-10">
          <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center shadow-lg shadow-purple-200/50 animate-float mb-6 overflow-hidden p-3 border border-slate-100">
            {settings.restaurant_logo ? (
              <img src={settings.restaurant_logo} alt="Logo" className="w-full h-full object-contain" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[#6C5DD3] to-[#8E7CF0] flex items-center justify-center rounded-2xl">
                <Utensils className="text-white w-10 h-10" />
              </div>
            )}
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight text-center mb-1.5 Arabic-text-scale uppercase">
            {isSettingsLoading ? '...' : settings.restaurant_name}
          </h1>
          <p className="text-slate-500 font-bold text-center px-4 leading-relaxed text-sm opacity-80 uppercase tracking-widest">
            {t('auth.sign_in_subtitle')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1 block">
              {t('auth.email')}
            </label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full bg-white/60 border border-slate-200 rounded-2xl px-6 py-4.5 text-slate-900 placeholder-slate-400 outline-none transition-all duration-300 focus:border-[#6C5DD3] focus:ring-4 focus:ring-purple-100/50"
              placeholder="admin@example.com"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1 block">
              {t('auth.password')}
            </label>
            <div className="relative group">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full bg-white/60 border border-slate-200 rounded-2xl px-6 py-4.5 text-slate-900 placeholder-slate-400 outline-none transition-all duration-300 focus:border-[#6C5DD3] focus:ring-4 focus:ring-purple-100/50 pr-14 rtl:pr-6 rtl:pl-14"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={`absolute ${isRtl ? 'left-4' : 'right-4'} top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#6C5DD3] transition-colors p-2`}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 animate-shake">
              <p className="text-[13px] font-bold text-rose-600 text-center">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-[#6C5DD3] to-[#8E7CF0] text-white font-black py-5 rounded-2xl shadow-lg transition-all transform hover:shadow-purple-200 hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-50 mt-4 group flex items-center justify-center gap-3"
          >
            {isLoading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
            ) : (
              <>
                <span className="text-sm font-black uppercase tracking-widest">{t('auth.sign_in_button')}</span>
                <span className="group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform">
                  {isRtl ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
                </span>
              </>
            )}
          </button>
        </form>

        <div className="mt-10 pt-6 border-t border-slate-100 text-center">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest opacity-60">metafortech-RMS &copy; 2026</p>
        </div>
      </div>
    </div>
  )
}




