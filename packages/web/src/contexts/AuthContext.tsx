import React, { createContext, useContext, useEffect, useState } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { getRedirectUrl } from '@/config/cors'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  error: string | null
  signInWithGitHub: () => Promise<void>
  signOut: () => Promise<void>
  getGitHubToken: () => string | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    const initializeAuth = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession()

        if (mounted) {
          if (error) {
            console.error('Error getting session:', error)
            setError(error.message)
          } else {
            setSession(session)
            setUser(session?.user ?? null)
          }
          setLoading(false)
        }
      } catch (err) {
        if (mounted) {
          console.error('Unexpected error:', err)
          setError('Failed to initialize auth')
          setLoading(false)
        }
      }
    }

    initializeAuth()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signInWithGitHub = async () => {
    try {
      setError(null)
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: getRedirectUrl(),
          scopes: 'read:user user:email repo',
        },
      })
      if (error) throw error
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'An error occurred during sign in'
      )
    }
  }

  const signOut = async () => {
    try {
      setError(null)
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'An error occurred during sign out'
      )
    }
  }

  const getGitHubToken = () => {
    return session?.provider_token || null
  }

  const value = {
    user,
    session,
    loading,
    error,
    signInWithGitHub,
    signOut,
    getGitHubToken,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
