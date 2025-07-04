import { useEffect, useState } from 'react'
import {
  Users,
  GitBranch,
  Key,
  Shield,
  Activity,
  TrendingUp,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAdmin } from '@/contexts/AdminContext'

interface DashboardStats {
  totalUsers: number
  activePermissions: number
  managedRepositories: number
  activeTokens: number
  recentActivity: number
}

export function AdminDashboard() {
  const { adminRole } = useAdmin()
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activePermissions: 0,
    managedRepositories: 0,
    activeTokens: 0,
    recentActivity: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardStats()
  }, [])

  const loadDashboardStats = async () => {
    try {
      // Get total users from auth system
      let userCount = 0
      try {
        const { data: allUsers } = await supabase.rpc('get_all_users')
        userCount = allUsers?.length || 0
      } catch (error) {
        // If RPC function doesn't exist, count users with permissions
        const { data: uniqueUsers } = await supabase
          .from('repository_permissions')
          .select('user_id')
          .eq('is_active', true)

        const uniqueUserIds = [
          ...new Set(uniqueUsers?.map((u) => u.user_id) || []),
        ]
        userCount = uniqueUserIds.length
      }

      // Get active permissions
      const { count: permissionCount } = await supabase
        .from('repository_permissions')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)

      // Get managed repositories
      const { count: repoCount } = await supabase
        .from('managed_repositories')
        .select('*', { count: 'exact', head: true })

      // Get active tokens
      const { count: tokenCount } = await supabase
        .from('admin_tokens')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)

      // Get recent activity (last 24 hours)
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)

      const { count: activityCount } = await supabase
        .from('admin_audit_log')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', yesterday.toISOString())

      setStats({
        totalUsers: userCount,
        activePermissions: permissionCount || 0,
        managedRepositories: repoCount || 0,
        activeTokens: tokenCount || 0,
        recentActivity: activityCount || 0,
      })
    } catch (error) {
      console.error('Error loading dashboard stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    {
      name: 'Total Users',
      value: stats.totalUsers,
      icon: Users,
      color: 'bg-blue-500',
      href: '/admin/users',
    },
    {
      name: 'Active Permissions',
      value: stats.activePermissions,
      icon: Shield,
      color: 'bg-green-500',
      href: '/admin/permissions',
    },
    {
      name: 'Managed Repositories',
      value: stats.managedRepositories,
      icon: GitBranch,
      color: 'bg-purple-500',
      href: '/admin/repositories',
    },
    {
      name: 'Active Tokens',
      value: stats.activeTokens,
      icon: Key,
      color: 'bg-yellow-500',
      href: '/admin/tokens',
    },
  ]

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Admin Dashboard
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Welcome back,{' '}
          {adminRole?.role === 'super_admin'
            ? 'Super Admin'
            : 'Repository Admin'}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <a
            key={stat.name}
            href={stat.href}
            className="relative overflow-hidden rounded-lg bg-white dark:bg-gray-800 p-6 shadow hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className={cn('rounded-md p-3', stat.color)}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    {stat.name}
                  </dt>
                  <dd className="text-2xl font-semibold text-gray-900 dark:text-white">
                    {loading ? '-' : stat.value}
                  </dd>
                </dl>
              </div>
            </div>
          </a>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="mt-8">
        <div className="rounded-lg bg-white dark:bg-gray-800 shadow">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                Recent Activity
              </h2>
              <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                <Activity className="mr-1 h-4 w-4" />
                <span>{stats.recentActivity} actions in last 24h</span>
              </div>
            </div>

            {/* Activity would go here */}
            <div className="mt-6 text-center text-gray-500 dark:text-gray-400 py-12">
              <TrendingUp className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600" />
              <p className="mt-2">Activity timeline coming soon</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Helper function - should be imported from utils
function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}
