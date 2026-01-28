import Echo from 'laravel-echo'
import Pusher from 'pusher-js'

let echoInstance: Echo<any> | null = null
let lastToken: string | null = null
let authFailureCount = 0
let isCircuitBroken = false

const getEnv = (key: string, fallback = ''): string =>
  (import.meta.env[key] as string | undefined) ?? fallback

const buildEcho = (token?: string | null) => {
  if (isCircuitBroken) return null

  const scheme = getEnv('VITE_REVERB_SCHEME', 'http')
  const host = getEnv('VITE_REVERB_HOST', '127.0.0.1')
  const port = Number(getEnv('VITE_REVERB_PORT', scheme === 'https' ? '443' : '80'))
  const key = getEnv('VITE_REVERB_APP_KEY', '')
  const apiBase = getEnv('VITE_API_BASE_URL', 'http://127.0.0.1:8000/api')
  const authEndpoint = apiBase.replace(/\/api\/?$/, '') + '/broadcasting/auth'

  window.Pusher = Pusher

  const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}

  const echo = new Echo({
    broadcaster: 'reverb',
    key,
    wsHost: host,
    wsPort: port,
    wssPort: port,
    forceTLS: scheme === 'https',
    enabledTransports: ['ws', 'wss'],
    authEndpoint,
    auth: {
      headers: authHeaders,
    },
  })

  // Auth Circuit Breaker Logic
  echo.connector.pusher.connection.bind('state_change', (states: any) => {
    if (states.current === 'unavailable' || states.current === 'failed') {
      console.warn(`[RMS] Connection state: ${states.current}`)
    }
  })

  // Track auth failures
  echo.connector.pusher.connection.bind('error', (err: any) => {
    // Check for auth-related failures in the error payload
    const isAuthError = err?.error?.data?.code === 403 || err?.type === 'AuthError' ||
      (err?.error?.message && err.error.message.toLowerCase().includes('auth'));

    if (isAuthError) {
      authFailureCount++
      if (authFailureCount >= 3) {
        console.error('[RMS] Real-time Auth Circuit Breaker triggered. Disconnecting.')
        isCircuitBroken = true
        resetEcho(null)
      }
    }
  })

  return echo
}

export const getEcho = (token?: string | null) => {
  if (!echoInstance && !isCircuitBroken) {
    lastToken = token ?? null
    echoInstance = buildEcho(lastToken)
  }
  return echoInstance
}

export const resetEcho = (token?: string | null) => {
  if (echoInstance) {
    echoInstance.disconnect()
    echoInstance = null
  }
  lastToken = token ?? null
}

export const getRealtimeStatus = () => {
  if (isCircuitBroken) return 'disabled'
  if (!echoInstance) return 'initializing'
  return echoInstance.connector.pusher.connection.state
}

export const isRealtimeEnabled = () => {
  const status = getRealtimeStatus()
  return status === 'connected'
}
