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
import { SignupPage } from '@/pages/SignupPage'
import { DebugPage } from '@/pages/DebugPage'
import { SetupGuidePage } from '@/pages/SetupGuidePage'
import { TestPage } from '@/pages/TestPage'
import { IssueDetailPage } from '@/pages/IssueDetailPage'

// Admin Pages
import { AdminDashboard } from '@/pages/admin/Dashboard'
import { AdminTokens } from '@/pages/admin/Tokens'
import { AdminRepositories } from '@/pages/admin/Repositories'
import { AdminUsers } from '@/pages/admin/Users'
import { AdminPermissionsSplitView } from '@/pages/admin/PermissionsSplitView'
import { AdminAuditLog } from '@/pages/admin/AuditLog'

function App() {
  const { loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-gray-100"></div>
      </div>
    )
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/debug" element={<DebugPage />} />
      <Route path="/setup" element={<SetupGuidePage />} />
      <Route path="/test" element={<TestPage />} />

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
        <Route
          path="issue/:repository/:issueNumber"
          element={<IssueDetailPage />}
        />
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
        <Route path="permissions" element={<AdminPermissionsSplitView />} />
        <Route path="audit" element={<AdminAuditLog />} />
      </Route>

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
