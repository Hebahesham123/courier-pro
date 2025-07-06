import React, { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { LanguageProvider, useLanguage } from './contexts/LanguageContext'
import LoginForm from './components/Auth/LoginForm'
import Header from './components/Layout/Header'
import Sidebar from './components/Layout/Sidebar'
import Summary from './components/Dashboard/Summary'
import UploadOrders from './components/Admin/UploadOrders'
import OrdersManagement from './components/Admin/OrdersManagement'
import OrdersList from './components/Courier/OrdersList'
import CouriersManagement from './components/Admin/CouriersManagement'
import Reports from './components/Admin/reports'

const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles?: string[] }> = ({
  children,
  allowedRoles,
}) => {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600 text-lg">Loading...</div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  if (allowedRoles && !allowedRoles.includes(user.role || '')) {
    const redirectPath = user.role === 'admin' ? '/admin' : '/courier'
    return <Navigate to={redirectPath} replace />
  }
  return <>{children}</>
}

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex min-h-screen bg-gray-50">
    <Sidebar />
    <div className="flex-1 flex flex-col">
      <Header />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  </div>
)

const AppRoutes: React.FC = () => {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600 text-lg">Loading session...</div>
      </div>
    )
  }

  return (
    <Routes>
      {!user ? (
        <>
          <Route path="/login" element={<LoginForm />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </>
      ) : (
        <>
          <Route path="/" element={<Navigate to={user.role === 'admin' ? '/admin' : '/courier'} replace />} />
          <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><Summary /></AppLayout></ProtectedRoute>} />
          <Route path="/admin/orders" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><OrdersManagement /></AppLayout></ProtectedRoute>} />
          <Route path="/admin/upload" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><UploadOrders /></AppLayout></ProtectedRoute>} />
          <Route path="/admin/couriers" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><CouriersManagement /></AppLayout></ProtectedRoute>} />
          <Route path="/admin/reports" element={<ProtectedRoute allowedRoles={['admin']}><AppLayout><Reports /></AppLayout></ProtectedRoute>} />
          <Route path="/courier" element={<ProtectedRoute allowedRoles={['courier']}><AppLayout><Summary /></AppLayout></ProtectedRoute>} />
          <Route path="/courier/orders" element={<ProtectedRoute allowedRoles={['courier']}><AppLayout><OrdersList /></AppLayout></ProtectedRoute>} />
          <Route path="*" element={<Navigate to={user.role === 'admin' ? '/admin' : '/courier'} replace />} />
        </>
      )}
    </Routes>
  )
}

function App() {
  const { language } = useLanguage()

  useEffect(() => {
    document.documentElement.setAttribute('dir', language === 'ar' ? 'rtl' : 'ltr')
  }, [language])

  return (
    <LanguageProvider>
      <AuthProvider>
        <Router>
          <AppRoutes />
        </Router>
      </AuthProvider>
    </LanguageProvider>
  )
}

export default App
