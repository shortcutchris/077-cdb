import { createContext, useContext, useEffect, useState } from 'react'
import { useAuth } from './AuthContext'
import { supabase } from '@/lib/supabase'

interface AdminUser {
  user_id: string
  role: 'super_admin' | 'repo_admin'
  granted_by: string
  granted_at: string
  is_active: boolean
}

interface AdminContextType {
  isAdmin: boolean
  isSuperAdmin: boolean
  adminRole: AdminUser | null
  loading: boolean
  checkAdminStatus: () => Promise<void>
}

const AdminContext = createContext<AdminContextType | undefined>(undefined)

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [adminRole, setAdminRole] = useState<AdminUser | null>(null)
  const [loading, setLoading] = useState(true)

  const checkAdminStatus = async () => {
    if (!user) {
      setAdminRole(null)
      setLoading(false)
      return
    }

    try {
      // Try to check admin status
      const { data, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle()

      if (error && error.code !== 'PGRST116') {
        // Only log real errors, not "no rows" errors
        console.error('Error checking admin status:', error)
      }

      // Always set adminRole based on data - be explicit
      if (data) {
        setAdminRole(data)
      } else {
        setAdminRole(null)
      }
    } catch (error) {
      console.error('Error checking admin status:', error)
      setAdminRole(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkAdminStatus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const value: AdminContextType = {
    isAdmin: adminRole !== null && adminRole !== undefined,
    isSuperAdmin: adminRole?.role === 'super_admin' || false,
    adminRole,
    loading,
    checkAdminStatus,
  }

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>
}

export function useAdmin() {
  const context = useContext(AdminContext)
  if (context === undefined) {
    throw new Error('useAdmin must be used within an AdminProvider')
  }
  return context
}
