import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

/**
 * AuthGate wraps the app and shows a login/signup screen when not authenticated.
 * The visual design matches the existing Growth Lab aesthetic.
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

    // Loading state
    if (loading) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            }}>
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '20px',
                }}>
                    <div style={{
                        width: '48px',
                        height: '48px',
                        border: '4px solid rgba(255,255,255,0.3)',
                        borderTopColor: 'white',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                    }} />
                    <span style={{ color: 'white', fontSize: '16px', fontWeight: 500, opacity: 0.9 }}>
                        Initializing Growth Lab...
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
                    setSuccessMessage('Account created! Check your email to confirm, then sign in.')
                    setMode('login')
                }
            }
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred')
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
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '20px',
        }}>
            <div style={{
                width: '100%',
                maxWidth: '420px',
                background: 'white',
                borderRadius: '20px',
                padding: '48px 40px',
                boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
            }}>
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '12px',
                        marginBottom: '8px',
                    }}>
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" fill="#4F46E5" stroke="#4F46E5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <circle cx="12" cy="12" r="10" stroke="#4F46E5" strokeWidth="1" strokeDasharray="2 2" />
                        </svg>
                        <span style={{
                            fontWeight: 800,
                            fontSize: '22px',
                            letterSpacing: '-0.5px',
                            color: '#1a1a2e',
                        }}>
                            Growth Lab
                        </span>
                    </div>
                    <p style={{
                        fontSize: '14px',
                        color: '#6b7280',
                        margin: 0,
                    }}>
                        {mode === 'login' ? 'Sign in to your workspace' : 'Create your account'}
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
                            <label style={labelStyle}>Full Name</label>
                            <input
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                placeholder="Your full name"
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
                        <label style={labelStyle}>Password</label>
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
                            ? (mode === 'login' ? 'Signing in...' : 'Creating account...')
                            : (mode === 'login' ? 'Sign In' : 'Create Account')
                        }
                    </button>
                </form>

                {/* Toggle mode */}
                <div style={{ textAlign: 'center', marginTop: '24px' }}>
                    <span style={{ fontSize: '13px', color: '#6b7280' }}>
                        {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
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
                        {mode === 'login' ? 'Sign Up' : 'Sign In'}
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
    borderRadius: '10px',
    border: '1px solid #e5e7eb',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    boxSizing: 'border-box',
}

const buttonStyle: React.CSSProperties = {
    width: '100%',
    padding: '14px',
    borderRadius: '12px',
    border: 'none',
    background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
    color: 'white',
    fontSize: '15px',
    fontWeight: 700,
    cursor: 'pointer',
    marginTop: '8px',
    transition: 'transform 0.1s, box-shadow 0.2s',
    boxShadow: '0 4px 14px rgba(79, 70, 229, 0.4)',
}
