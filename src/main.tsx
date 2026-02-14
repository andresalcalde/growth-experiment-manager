import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { AuthProvider } from './contexts/AuthContext'
import { ProjectProvider } from './contexts/ProjectContext'
import { AuthGate } from './components/AuthGate'

// Error Boundary to catch runtime errors
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', background: '#1a1a2e', color: '#ff6b6b', minHeight: '100vh', fontFamily: 'monospace' }}>
          <h1 style={{ color: 'white' }}>⚠️ Runtime Error</h1>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: '16px', background: '#16213e', padding: '20px', borderRadius: '8px' }}>
            {this.state.error?.message}
          </pre>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: '12px', color: '#a0a0a0', marginTop: '20px' }}>
            {this.state.error?.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <AuthGate>
          <ProjectProvider>
            <App />
          </ProjectProvider>
        </AuthGate>
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
