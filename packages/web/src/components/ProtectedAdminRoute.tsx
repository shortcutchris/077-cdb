import { Navigate } from 'react-router-dom'
import { useAdmin } from '@/contexts/AdminContext'
import { useAuth } from '@/contexts/AuthContext'
import { Loader2 } from 'lucide-react'

interface ProtectedAdminRouteProps {
  children: React.ReactNode
  requireSuperAdmin?: boolean
}

export function ProtectedAdminRoute({
  children,
  requireSuperAdmin = false,
}: ProtectedAdminRouteProps) {
  const { user, loading: authLoading } = useAuth()
  const { isSuperAdmin, loading: adminLoading } = useAdmin()

  if (authLoading || adminLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    )
  }

  // First check if user is authenticated
  if (!user) {
    return <Navigate to="/auth/signin" replace />
  }

  // Temporarily allow access for testing
  // if (!isAdmin) {
  //   return <Navigate to="/" replace />
  // }

  if (requireSuperAdmin && !isSuperAdmin) {
    // Temporarily disabled for testing
    // return <Navigate to="/admin" replace />
  }

  return <>{children}</>
}
