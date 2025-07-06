"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import type { User } from "@supabase/supabase-js"
import { supabase } from "../lib/supabase"

interface AuthUser extends User {
  role?: "admin" | "courier"
  name?: string
}

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    const getInitialSession = async () => {
      try {
        const { data } = await supabase.auth.getSession()
        console.log("Initial Session:", data)
        const session = data?.session

        if (!mounted) return

        if (session?.user) {
          setTimeout(() => fetchUserProfileWithRetry(session.user), 300)
        } else {
          setUser(null)
          setLoading(false)
        }
      } catch (err) {
        console.error("Session error:", err)
        if (mounted) {
          setLoading(false)
        }
      }
    }

    getInitialSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return

      if (session?.user) {
        setTimeout(() => fetchUserProfileWithRetry(session.user), 300)
      } else {
        setUser(null)
        setLoading(false)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const fetchUserProfile = async (authUser: User) => {
    try {
      console.log("Fetching profile for user:", authUser.id)

      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Profile fetch timeout")), 15000),
      )

      const queryPromise = supabase.from("users").select("role, name").eq("id", authUser.id).single()

      const { data, error } = (await Promise.race([queryPromise, timeoutPromise])) as any

      if (error) {
        console.warn("Error loading profile:", error)
        // If user doesn't exist in users table, create a basic user object
        if (error.code === "PGRST116") {
          console.log("User not found in users table, using basic auth user")
          setUser({
            ...authUser,
            role: undefined,
            name: authUser.email?.split("@")[0],
          })
        } else {
          // For other errors, still set the user but without profile data
          setUser({
            ...authUser,
            role: undefined,
            name: authUser.email?.split("@")[0],
          })
        }
      } else {
        console.log("Profile data:", data)
        setUser({
          ...authUser,
          role: data?.role,
          name: data?.name,
        })
      }
    } catch (err) {
      console.error("Profile fetch error:", err)
      // Even if profile fetch fails, set the user with basic auth data
      setUser({
        ...authUser,
        role: undefined,
        name: authUser.email?.split("@")[0],
      })
    } finally {
      setLoading(false)
    }
  }

  // Retry wrapper for fetchUserProfile
  const fetchUserProfileWithRetry = async (authUser: User, retries = 2) => {
    try {
      await fetchUserProfile(authUser)
    } catch (err: any) {
      if (retries > 0 && err?.message === "Profile fetch timeout") {
        // Wait 300ms and retry
        setTimeout(() => fetchUserProfileWithRetry(authUser, retries - 1), 300)
      } else {
        // If out of retries or different error, set user with basic info
        setUser({
          ...authUser,
          role: undefined,
          name: authUser.email?.split("@")[0],
        })
        setLoading(false)
      }
    }
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    setUser(null)
  }

  const contextValue: AuthContextType = {
    user,
    loading,
    signIn,
    signOut,
  }

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
}
