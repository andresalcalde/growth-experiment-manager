import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { LandingPage } from './LandingPage'
import { ForgotPassword } from './ForgotPassword'
import { ResetPassword } from './ResetPassword'

/**
 * AuthGate wraps the app and shows a login/signup screen when not authenticated.
 * The visual design matches the existing Growth Hub aesthetic.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
    const { session, loading, signIn, signUp } = useAuth()
    const [mode, setMode] = useState<'login' | 'signup'>('login')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [fullName, setFullName] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [successMessage, setSuccessMessage] = useState<string | null>(null)
    const [submitting, setSubmitting] = useState(false)
    const [showLanding, setShowLanding] = useState(true)
    const [showForgotPassword, setShowForgotPassword] = useState(false)

    // Route handling — minimal, no react-router. Si la URL es /reset-password
    // mostramos ese flujo SIEMPRE (incluso autenticado, porque el usuario podría
    // venir desde un email con sesión "recovery" activa).
    const isResetPasswordRoute = typeof window !== 'undefined' && window.location.pathname.startsWith('/reset-password')
    if (isResetPasswordRoute) {
        return <ResetPassword />
    }

    // Loading state
    if (loading) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#f6f5f1',
            }}>
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '16px',
                }}>
                    <div style={{
                        width: '32px',
                        height: '32px',
                        border: '2.5px solid rgba(17,17,20,0.15)',
                        borderTopColor: '#111114',
                        borderRadius: '50%',
                        animation: 'spin 0.7s linear infinite',
                    }} />
                    <span style={{ color: '#74747c', fontSize: '14px', fontWeight: 500 }}>
                        Inicializando Growth Hub…
                    </span>
                </div>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        )
    }

    // Authenticated
    if (session) {
        return <>{children}</>
    }

    // Show landing page before login
    if (showLanding) {
        return <LandingPage onLogin={() => setShowLanding(false)} />
    }

    // Forgot password flow
    if (showForgotPassword) {
        return <ForgotPassword onBack={() => setShowForgotPassword(false)} />
    }

    // Login/Signup form
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setSuccessMessage(null)
        setSubmitting(true)

        try {
            if (mode === 'login') {
                const { error } = await signIn(email, password)
                if (error) setError(error.message)
            } else {
                const { error } = await signUp(email, password, fullName)
                if (error) {
                    setError(error.message)
                } else {
                    setSuccessMessage('¡Cuenta creada! Revisa tu email para confirmar y luego inicia sesión.')
                    setMode('login')
                }
            }
        } catch (err: any) {
            setError(err.message || 'Ocurrió un error inesperado')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#f6f5f1',
            padding: '20px',
        }}>
            <div style={{
                width: '100%',
                maxWidth: '400px',
                background: 'white',
                borderRadius: '10px',
                padding: '44px 38px',
                border: '1px solid rgba(17,17,20,0.12)',
            }}>
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '12px',
                        marginBottom: '8px',
                    }}>
                        <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" fill="#4F46E5" />
                        </svg>
                        <span style={{
                            fontFamily: "'Space Grotesk', sans-serif",
                            fontWeight: 600,
                            fontSize: '20px',
                            letterSpacing: '-0.01em',
                            color: '#111114',
                        }}>
                            Growth Hub
                        </span>
                    </div>
                    <p style={{
                        fontSize: '14px',
                        color: '#6b7280',
                        margin: 0,
                    }}>
                        {mode === 'login' ? 'Inicia sesión en tu workspace' : 'Crea tu cuenta'}
                    </p>
                </div>

                {/* Error / Success */}
                {error && (
                    <div style={{
                        padding: '12px 16px',
                        background: '#fef2f2',
                        border: '1px solid #fecaca',
                        borderRadius: '10px',
                        marginBottom: '20px',
                        fontSize: '13px',
                        color: '#dc2626',
                    }}>
                        {error}
                    </div>
                )}
                {successMessage && (
                    <div style={{
                        padding: '12px 16px',
                        background: '#f0fdf4',
                        border: '1px solid #bbf7d0',
                        borderRadius: '10px',
                        marginBottom: '20px',
                        fontSize: '13px',
                        color: '#16a34a',
                    }}>
                        {successMessage}
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {mode === 'signup' && (
                        <div>
                            <label style={labelStyle}>Nombre completo</label>
                            <input
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                placeholder="Tu nombre completo"
                                style={inputStyle}
                            />
                        </div>
                    )}
                    <div>
                        <label style={labelStyle}>Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@company.com"
                            required
                            style={inputStyle}
                        />
                    </div>
                    <div>
                        <label style={labelStyle}>Contraseña</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            minLength={6}
                            style={inputStyle}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={submitting}
                        style={{
                            ...buttonStyle,
                            opacity: submitting ? 0.7 : 1,
                            cursor: submitting ? 'not-allowed' : 'pointer',
                        }}
                    >
                        {submitting
                            ? (mode === 'login' ? 'Iniciando sesión...' : 'Creando cuenta...')
                            : (mode === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta')
                        }
                    </button>
                </form>

                {/* Forgot password link — only on login mode */}
                {mode === 'login' && (
                    <div style={{ textAlign: 'center', marginTop: 16 }}>
                        <button
                            type="button"
                            onClick={() => setShowForgotPassword(true)}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: '#4F46E5',
                                fontWeight: 600,
                                fontSize: 13,
                                cursor: 'pointer',
                                padding: 0,
                            }}
                        >
                            ¿Olvidaste tu contraseña?
                        </button>
                    </div>
                )}

                {/* Toggle mode */}
                <div style={{ textAlign: 'center', marginTop: '24px' }}>
                    <span style={{ fontSize: '13px', color: '#6b7280' }}>
                        {mode === 'login' ? '¿No tienes cuenta? ' : '¿Ya tienes cuenta? '}
                    </span>
                    <button
                        onClick={() => {
                            setMode(mode === 'login' ? 'signup' : 'login')
                            setError(null)
                            setSuccessMessage(null)
                        }}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#4F46E5',
                            fontWeight: 600,
                            fontSize: '13px',
                            cursor: 'pointer',
                            textDecoration: 'underline',
                        }}
                    >
                        {mode === 'login' ? 'Crear Cuenta' : 'Iniciar Sesión'}
                    </button>
                </div>

                {/* Back to landing */}
                <div style={{ textAlign: 'center', marginTop: '16px' }}>
                    <button
                        onClick={() => setShowLanding(true)}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#9ca3af',
                            fontSize: '13px',
                            cursor: 'pointer',
                        }}
                    >
                        ← Volver a la página principal
                    </button>
                </div>
            </div>
        </div>
    )
}

// ── Styles ─────────────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '13px',
    fontWeight: 600,
    color: '#374151',
    marginBottom: '6px',
}

const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 14px',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    boxSizing: 'border-box',
}

const buttonStyle: React.CSSProperties = {
    width: '100%',
    padding: '13px',
    borderRadius: '8px',
    border: 'none',
    background: '#111114',
    color: 'white',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: '8px',
    transition: 'opacity 0.15s ease',
}
