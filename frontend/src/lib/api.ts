import axios from 'axios'

const apiRoot = import.meta.env.VITE_API_URL?.replace(/\/+$/, '')

const api = axios.create({
  baseURL: apiRoot ? `${apiRoot}/api` : '/api',
})

// Attach token from sessionStorage
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('auth_token')
  if (token) config.headers['Authorization'] = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      sessionStorage.removeItem('auth_token')
      if (window.location.pathname !== '/login') {
        window.location.assign('/login')
      }
    }
    return Promise.reject(error)
  },
)

export default api
