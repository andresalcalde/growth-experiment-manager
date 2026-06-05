import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { logActivity } from '../lib/activityLog'
import type { Session, User } from '@supabase/supabase-js'

// ============================================================================
// Types
// ============================================================================

// superadmin > admin (líder de equipo) > user
export type GlobalRole = 'superadmin' | 'admin' | 'user'

// Las áreas ya no son un enum fijo: se gestionan desde la tabla `user_areas`.
// `UserArea` queda como alias de string para compatibilidad con imports previos.
export type UserArea = string

export interface UserAreaRecord {
    id: string
    name: string
}

export interface Profile {
    id: string
    email: string
    full_name: string | null
    avatar_url: string | null
    global_role: GlobalRole
    panel_logo_url: string | null
    area: UserArea[] | null
    last_seen_at: string | null
}

interface AuthContextValue {
    session: Session | null
    user: User | null
    profile: Profile | null
    loading: boolean
    isSuperAdmin: boolean
    areas: UserAreaRecord[]
    signIn: (email: string, password: string) => Promise<{ error: any }>
    signUp: (email: string, password: string, fullName?: string) => Promise<{ error: any }>
    signOut: () => Promise<void>
    updatePanelLogo: (logoUrl: string | null) => Promise<void>
    updateProfile: (updates: { full_name?: string; avatar_url?: string | null }) => Promise<void>
    updatePassword: (newPassword: string) => Promise<void>
    updateArea: (areas: UserArea[]) => Promise<void>
    updateUserGlobalRole: (userId: string, role: GlobalRole) => Promise<void>
    addArea: (name: string) => Promise<void>
    deleteArea: (id: string) => Promise<void>
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
// last_seen_at — ping con throttle (1× cada 15 min) para evitar amplificación
// de escritura por los múltiples disparos de onAuthStateChange (focus de tab).
// ============================================================================

async function pingLastSeen(userId: string) {
    try {
        const key = 'lastSeenPing'
        const last = localStorage.getItem(key)
        const now = Date.now()
        if (last && now - Number(last) < 15 * 60 * 1000) return
        localStorage.setItem(key, String(now))
        await supabase
            .from('profiles')
            .update({ last_seen_at: new Date().toISOString() })
            .eq('id', userId)
    } catch (err) {
        console.warn('last_seen ping failed (non-critical):', err)
    }
}

// ============================================================================
// Provider
// ============================================================================

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [session, setSession] = useState<Session | null>(null)
    const [profile, setProfile] = useState<Profile | null>(null)
    const [loading, setLoading] = useState(true)
    const [areas, setAreas] = useState<UserAreaRecord[]>([])

    // Áreas: legibles por todos (RLS select=true), se cargan al montar.
    const loadAreas = useCallback(async () => {
        const { data, error } = await supabase
            .from('user_areas')
            .select('id, name')
            .order('name')
        if (error) {
            console.error('Error loading areas:', error)
            return
        }
        setAreas((data as UserAreaRecord[]) || [])
    }, [])

    // Carga inicial de áreas (fetch on mount); el setState ocurre tras el await.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => { loadAreas() }, [loadAreas])

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

        // Safety timeout: force loading=false after 3s no matter what
        const safetyTimer = setTimeout(() => {
            if (!cancelled) {
                console.warn('⏱️ Auth init safety timeout – forcing load complete')
                setLoading(false)
            }
        }, 3_000)

        const finishLoading = () => {
            if (!cancelled) {
                setLoading(false)
                clearTimeout(safetyTimer)
            }
        }

        // Get initial session
        supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
            if (cancelled) return
            setSession(existingSession)
            // Finish loading immediately – don't block on profile fetch
            finishLoading()
            if (existingSession?.user) {
                // Fetch profile in background (non-blocking)
                fetchProfile(existingSession.user.id).then(p => {
                    if (!cancelled) setProfile(p)
                }).catch(err => {
                    if (!isAbortError(err)) console.error('Profile fetch failed:', err)
                })
                pingLastSeen(existingSession.user.id)
                if (!onboardingDone.current) {
                    onboardingDone.current = true
                    checkOnboarding(existingSession.user.id).catch(() => { })
                }
            }
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
            (event, newSession) => {
                if (cancelled) return
                console.log('🔐 Auth event:', event)
                setSession(newSession)
                // Finish loading immediately – don't block on profile fetch
                finishLoading()

                if (newSession?.user) {
                    // Fetch profile in background (non-blocking)
                    fetchProfile(newSession.user.id).then(p => {
                        if (!cancelled) setProfile(p)
                    }).catch(err => {
                        if (!isAbortError(err)) console.error('Profile fetch failed on auth change:', err)
                    })
                    pingLastSeen(newSession.user.id)

                    if (event === 'SIGNED_IN' && !onboardingDone.current) {
                        onboardingDone.current = true
                        checkOnboarding(newSession.user.id).catch(() => { })
                    }
                } else {
                    setProfile(null)
                    onboardingDone.current = false
                }
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

    const updatePanelLogo = async (logoUrl: string | null) => {
        if (!session?.user) throw new Error('Not authenticated')
        const { error } = await supabase
            .from('profiles')
            .update({ panel_logo_url: logoUrl })
            .eq('id', session.user.id)
        if (error) throw error
        setProfile((prev) => (prev ? { ...prev, panel_logo_url: logoUrl } : prev))
    }

    const updateProfile = async (updates: { full_name?: string; avatar_url?: string | null }) => {
        if (!session?.user) throw new Error('Not authenticated')
        const patch: Record<string, unknown> = {}
        if (updates.full_name !== undefined) patch.full_name = updates.full_name
        if (updates.avatar_url !== undefined) patch.avatar_url = updates.avatar_url
        if (Object.keys(patch).length === 0) return
        const { error } = await supabase
            .from('profiles')
            .update(patch)
            .eq('id', session.user.id)
        if (error) throw error
        setProfile((prev) => (prev ? { ...prev, ...patch } as Profile : prev))
    }

    const updatePassword = async (newPassword: string) => {
        if (!session?.user) throw new Error('Not authenticated')
        const { error } = await supabase.auth.updateUser({ password: newPassword })
        if (error) throw error
    }

    const updateArea = async (areas: UserArea[]) => {
        if (!session?.user) throw new Error('Not authenticated')
        const { error } = await supabase
            .from('profiles')
            .update({ area: areas })
            .eq('id', session.user.id)
        if (error) throw error
        setProfile((prev) => (prev ? { ...prev, area: areas } : prev))
    }

    const addArea = async (name: string) => {
        const trimmed = name.trim()
        if (!trimmed) throw new Error('El nombre del área no puede estar vacío')
        // RLS exige superadmin para insertar.
        const { error } = await supabase.from('user_areas').insert({ name: trimmed })
        if (error) throw error
        await loadAreas()
    }

    const deleteArea = async (id: string) => {
        // RLS exige superadmin para eliminar.
        const { error } = await supabase.from('user_areas').delete().eq('id', id)
        if (error) throw error
        await loadAreas()
    }

    const updateUserGlobalRole = async (userId: string, role: GlobalRole) => {
        // El trigger trg_protect_global_role en la DB exige superadmin y bloquea
        // degradar al último superadmin; aquí solo propagamos el error.
        const { error } = await supabase
            .from('profiles')
            .update({ global_role: role })
            .eq('id', userId)
        if (error) throw error
        if (session?.user) {
            logActivity({
                userId: session.user.id,
                action: 'role_changed',
                entityType: 'profile',
                entityId: userId,
            })
        }
    }

    const value: AuthContextValue = {
        session,
        user: session?.user || null,
        profile,
        loading,
        isSuperAdmin: profile?.global_role === 'superadmin',
        areas,
        signIn,
        signUp,
        signOut,
        updatePanelLogo,
        updateProfile,
        updatePassword,
        updateArea,
        updateUserGlobalRole,
        addArea,
        deleteArea,
    }

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
