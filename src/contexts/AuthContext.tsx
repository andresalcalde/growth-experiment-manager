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

    // Helper: check if error is an abort (safe to ignore)
    const isAbortError = (err: any) =>
        err?.name === 'AbortError' || err?.message?.includes('abort')

    // Fetch profile from profiles table
    const fetchProfile = async (userId: string): Promise<Profile | null> => {
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
        } catch (err: any) {
            if (isAbortError(err)) return null
            console.error('Error fetching profile:', err)
            return null
        }
    }

    // Check for demo onboarding (disabled – clone_demo_project RPC not deployed)
    const checkOnboarding = async (_userId: string) => {
        // NOTE: clone_demo_project RPC was removed. New users start with an empty portfolio.
        // If you want to re-enable demo project cloning, create the RPC function in Supabase first.
        console.log('ℹ️ New user onboarding: starting with empty portfolio')
    }

    // Prevent duplicate onboarding calls
    const onboardingDone = useRef(false)

    useEffect(() => {
        let cancelled = false

        // Safety timeout: force loading=false after 10s no matter what
        const safetyTimer = setTimeout(() => {
            if (!cancelled) {
                console.warn('⏱️ Auth init safety timeout – forcing load complete')
                setLoading(false)
            }
        }, 10_000)

        const finishLoading = () => {
            if (!cancelled) {
                setLoading(false)
                clearTimeout(safetyTimer)
            }
        }

        // Get initial session
        supabase.auth.getSession().then(async ({ data: { session: existingSession } }) => {
            if (cancelled) return
            setSession(existingSession)
            if (existingSession?.user) {
                try {
                    const p = await fetchProfile(existingSession.user.id)
                    if (cancelled) return
                    setProfile(p)
                } catch (err: any) {
                    if (isAbortError(err)) return
                    console.error('Profile fetch failed:', err)
                }
                // Fire onboarding in background – don't block loading
                if (!onboardingDone.current) {
                    onboardingDone.current = true
                    checkOnboarding(existingSession.user.id).catch(() => { })
                }
            }
            finishLoading()
        }).catch((err) => {
            if (isAbortError(err)) {
                console.log('Auth init aborted (StrictMode remount)')
                return
            }
            console.error('Error getting session:', err)
            finishLoading()
        })

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, newSession) => {
                if (cancelled) return
                console.log('🔐 Auth event:', event)
                setSession(newSession)

                if (newSession?.user) {
                    try {
                        const p = await fetchProfile(newSession.user.id)
                        if (cancelled) return
                        setProfile(p)
                    } catch (err: any) {
                        if (isAbortError(err)) return
                        console.error('Profile fetch failed on auth change:', err)
                    }

                    // Fire onboarding in background – don't block loading
                    if (event === 'SIGNED_IN' && !onboardingDone.current) {
                        onboardingDone.current = true
                        checkOnboarding(newSession.user.id).catch(() => { })
                    }
                } else {
                    setProfile(null)
                    onboardingDone.current = false
                }

                finishLoading()
            }
        )

        return () => {
            cancelled = true
            clearTimeout(safetyTimer)
            subscription.unsubscribe()
        }
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
