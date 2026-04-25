import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Inventory from './pages/Inventory'
import Allocate from './pages/Allocate'
import Donors from './pages/Donors'
import Predictions from './pages/Predictions'
import Alerts from './pages/Alerts'
import Upload from './pages/Upload'
import ManualEntry from './pages/ManualEntry'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <Layout>{children}</Layout> : <Navigate to="/login" replace />
}

function AppRoutes() {
  const { isAuthenticated } = useAuth()
  return (
    <Routes>
      <Route path="/"            element={<Landing />} />
      <Route path="/login"       element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/dashboard"   element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/inventory"   element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
      <Route path="/manual-entry" element={<ProtectedRoute><ManualEntry /></ProtectedRoute>} />
      <Route path="/allocate"    element={<ProtectedRoute><Allocate /></ProtectedRoute>} />
      <Route path="/donors"      element={<ProtectedRoute><Donors /></ProtectedRoute>} />
      <Route path="/predictions" element={<ProtectedRoute><Predictions /></ProtectedRoute>} />
      <Route path="/alerts"      element={<ProtectedRoute><Alerts /></ProtectedRoute>} />
      <Route path="/upload"      element={<ProtectedRoute><Upload /></ProtectedRoute>} />
      <Route path="*"            element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}
