import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
})

// Attach token from sessionStorage
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('auth_token')
  if (token) config.headers['Authorization'] = `Bearer ${token}`
  return config
})

export default api
