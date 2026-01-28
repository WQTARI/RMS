import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTranslation } from 'react-i18next'
import { Utensils } from 'lucide-react'

export const LoginPage = () => {
  const { t } = useTranslation()
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

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
    <div className="flex min-h-screen items-center justify-center bg-mesh px-6 relative overflow-hidden">
      {/* Decorative Orbs - Lighter for cheerful theme */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/10 rounded-full blur-[120px] animate-pulse"></div>

      <div className="w-full max-w-md glass rounded-[40px] p-10 md:p-12 relative z-10 shadow-2xl shadow-slate-200">
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 animate-float mb-6">
            <Utensils className="text-white w-8 h-8" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight text-center">{t('auth.sign_in_title')}</h1>
          <p className="text-slate-500 font-bold mt-2 text-center">{t('auth.sign_in_subtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] ml-2">
              {t('auth.email')}
            </label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full glass-input rounded-2xl px-5 py-4 text-slate-900 placeholder-slate-400 transition-all outline-none"
              placeholder="admin@example.com"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] ml-2">
              {t('auth.password')}
            </label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full glass-input rounded-2xl px-5 py-4 text-slate-900 placeholder-slate-400 transition-all outline-none"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 animate-shake">
              <p className="text-sm font-bold text-rose-600 text-center">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-2xl bg-gradient-to-r from-primary to-accent py-4 text-sm font-black text-white hover:opacity-95 transition-all shadow-xl shadow-primary/20 active:scale-[0.98] disabled:opacity-50 mt-4 group"
          >
            <span className="flex items-center justify-center gap-2">
              {isLoading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
              ) : (
                <>
                  {t('auth.sign_in_button')}
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </>
              )}
            </span>
          </button>
        </form>

        <div className="mt-10 pt-6 border-t border-slate-100 text-center">
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">metafortech-RMS © 2026</p>
        </div>
      </div>
    </div>
  )
}
