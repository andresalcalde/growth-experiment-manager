import React, { createContext, useContext, useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import type { Session, User } from '@supabase/supabase-js'

// ============================================================================
// Types
// ============================================================================

export type GlobalRole = 'superadmin' | 'user'

export interface Profile {
    id: string
    email: string
    full_name: string | null
    avatar_url: string | null
    global_role: GlobalRole
}

interface AuthContextValue {
    session: Session | null
    user: User | null
    profile: Profile | null
    loading: boolean
    isSuperAdmin: boolean
    signIn: (email: string, password: string) => Promise<{ error: any }>
    signUp: (email: string, password: string, fullName?: string) => Promise<{ error: any }>
    signOut: () => Promise<void>
}

// ============================================================================
// Context
// ============================================================================

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
    return ctx
}

// ============================================================================
// Provider
// ============================================================================

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [session, setSession] = useState<Session | null>(null)
    const [profile, setProfile] = useState<Profile | null>(null)
    const [loading, setLoading] = useState(true)

    // Fetch profile from profiles table
    const fetchProfile = async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single()

            if (error) {
                console.error('Error fetching profile:', error)
                return null
            }
            return data as Profile
        } catch (err) {
            console.error('Error fetching profile:', err)
            return null
        }
    }

    // Check for demo onboarding
    const checkOnboarding = async (userId: string) => {
        try {
            const { count, error } = await supabase
                .from('project_members')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId)

            if (error) {
                console.error('Error checking onboarding:', error)
                return
            }

            if (count === 0) {
                console.log('🎯 New user detected – cloning demo project...')
                const { data, error: rpcError } = await supabase
                    .rpc('clone_demo_project', { p_user_id: userId })

                if (rpcError) {
                    console.error('Error cloning demo project:', rpcError)
                } else {
                    console.log('✅ Demo project cloned:', data)
                }
            }
        } catch (err) {
            console.error('Error in onboarding:', err)
        }
    }

    // Prevent duplicate onboarding calls
    const onboardingDone = useRef(false)

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(async ({ data: { session: existingSession } }) => {
            setSession(existingSession)
            if (existingSession?.user) {
                const p = await fetchProfile(existingSession.user.id)
                setProfile(p)
                if (!onboardingDone.current) {
                    onboardingDone.current = true
                    await checkOnboarding(existingSession.user.id)
                }
            }
            setLoading(false)
        })

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, newSession) => {
                console.log('🔐 Auth event:', event)
                setSession(newSession)

                if (newSession?.user) {
                    const p = await fetchProfile(newSession.user.id)
                    setProfile(p)

                    if (event === 'SIGNED_IN' && !onboardingDone.current) {
                        onboardingDone.current = true
                        await checkOnboarding(newSession.user.id)
                    }
                } else {
                    setProfile(null)
                    onboardingDone.current = false
                }
            }
        )

        return () => subscription.unsubscribe()
    }, [])

    const signIn = async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        return { error }
    }

    const signUp = async (email: string, password: string, fullName?: string) => {
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { full_name: fullName || email.split('@')[0] },
            },
        })
        return { error }
    }

    const signOut = async () => {
        await supabase.auth.signOut()
        setSession(null)
        setProfile(null)
        localStorage.removeItem('lastActiveProjectId')
    }

    const value: AuthContextValue = {
        session,
        user: session?.user || null,
        profile,
        loading,
        isSuperAdmin: profile?.global_role === 'superadmin',
        signIn,
        signUp,
        signOut,
    }

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
