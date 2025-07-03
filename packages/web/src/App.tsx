import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { ProtectedAdminRoute } from '@/components/ProtectedAdminRoute'

// Layouts
import { MainLayout } from '@/layouts/MainLayout'
import { AdminLayout } from '@/layouts/AdminLayout'

// Pages
import { HomePage } from '@/pages/HomePage'
import { LoginPage } from '@/pages/LoginPage'

// Admin Pages
import { AdminDashboard } from '@/pages/admin/Dashboard'
import { AdminTokens } from '@/pages/admin/Tokens'
import { AdminRepositories } from '@/pages/admin/Repositories'
import { AdminUsers } from '@/pages/admin/Users'
import { AdminPermissions } from '@/pages/admin/Permissions'
import { AdminAuditLog } from '@/pages/admin/AuditLog'

function App() {
  const { loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<HomePage />} />
      </Route>

      {/* Admin routes */}
      <Route
        path="/admin"
        element={
          <ProtectedAdminRoute>
            <AdminLayout />
          </ProtectedAdminRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="tokens" element={<AdminTokens />} />
        <Route path="repositories" element={<AdminRepositories />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="permissions" element={<AdminPermissions />} />
        <Route path="audit" element={<AdminAuditLog />} />
      </Route>

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
