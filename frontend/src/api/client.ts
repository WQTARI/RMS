import axios from 'axios'

const baseURL =
  import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api'

export const apiClient = axios.create({
  baseURL,
  headers: {
    Accept: 'application/json',
  },
})

const buildRequestId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `rms-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('rms_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  if (!config.headers['X-Request-Id']) {
    config.headers['X-Request-Id'] = buildRequestId()
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('rms_token')
      localStorage.removeItem('rms_user')
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login?expired=1'
      }
    }
    return Promise.reject(error)
  }
)
