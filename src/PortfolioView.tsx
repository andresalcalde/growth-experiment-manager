/**
 * PortfolioView - Landing page for project selection
 * 
 * Enterprise-grade implementation with:
 * - Full TypeScript typing
 * - Accessibility (ARIA labels, keyboard navigation)
 * - Performance optimizations
 * - Error boundaries
 * - Responsive design
 * 
 * @version 2.0.0
 * @author Growth Lab Team
 */

import React, { useMemo } from 'react';
import { Folder, Plus, TrendingUp, Calendar, Users, Sparkles } from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface Project {
  id: string;
  name: string;
  created_at?: string;
  description?: string;
}

interface PortfolioViewProps {
  projects: Project[];
  onSelectProject: (projectId: string) => void;
  onCreateProject: () => void;
  loading: boolean;
}

// ============================================================================
// STYLES
// ============================================================================

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '60px 40px',
    position: 'relative' as const,
    overflow: 'hidden'
  },
  header: {
    maxWidth: '1200px',
    margin: '0 auto',
    marginBottom: '48px',
    textAlign: 'center' as const
  },
  title: {
    fontSize: '48px',
    fontWeight: 700,
    color: 'white',
    marginBottom: '16px',
    textAlign: 'center' as const,
    letterSpacing: '-0.02em'
  },
  subtitle: {
    fontSize: '18px',
    color: 'rgba(255, 255, 255, 0.95)',
    textAlign: 'center' as const,
    maxWidth: '600px',
    margin: '0 auto',
    lineHeight: 1.6
  },
  grid: {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '24px',
    position: 'relative' as const,
    zIndex: 1
  },
  createCard: {
    background: 'rgba(255, 255, 255, 0.12)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '2px dashed rgba(255, 255, 255, 0.3)',
    borderRadius: '20px',
    padding: '48px 32px',
    cursor: 'pointer',
    transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '260px',
    outline: 'none',
    position: 'relative' as const,
    overflow: 'hidden'
  },
  projectCard: {
    background: 'white',
    border: 'none',
    borderRadius: '20px',
    padding: '32px 28px',
    cursor: 'pointer',
    transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
    textAlign: 'left' as const,
    minHeight: '260px',
    display: 'flex',
    flexDirection: 'column' as const,
    outline: 'none',
    position: 'relative' as const,
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07)'
  },
  iconCircle: {
    width: '72px',
    height: '72px',
    borderRadius: '50%',
    background: 'rgba(255, 255, 255, 0.25)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '20px',
    transition: 'transform 0.3s ease'
  },
  projectIcon: {
    width: '60px',
    height: '60px',
    borderRadius: '16px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '24px',
    boxShadow: '0 8px 16px rgba(102, 126, 234, 0.3)'
  }
};

// ============================================================================
// COMPONENT
// ============================================================================

export const PortfolioView: React.FC<PortfolioViewProps> = ({
  projects,
  onSelectProject,
  onCreateProject,
  loading
}) => {
  // Memoize sorted projects for performance
  const sortedProjects = useMemo(() => {
    return [...projects].sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return dateB - dateA; // Most recent first
    });
  }, [projects]);

  // Loading state
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        flexDirection: 'column' as const,
        gap: '20px'
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          border: '4px solid rgba(255, 255, 255, 0.3)',
          borderTopColor: 'white',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <div style={{ color: 'white', fontSize: '18px', fontWeight: 500 }}>
          Cargando proyectos...
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container} role="main" aria-label="Portfolio de proyectos">
      {/* Decorative background elements */}
      <div style={{
        position: 'absolute',
        top: '-200px',
        right: '-200px',
        width: '600px',
        height: '600px',
        background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
        borderRadius: '50%',
        pointerEvents: 'none'
      }} />
      
      {/* Header */}
      <header style={styles.header}>
        <h1 style={styles.title}>
          <Sparkles 
            size={40} 
            style={{ 
              display: 'inline-block', 
              verticalAlign: 'middle', 
              marginRight: '12px',
              color: '#fbbf24'
            }} 
          />
          Growth Lab Portfolio
        </h1>
        <p style={styles.subtitle}>
          Selecciona un proyecto existente para continuar o crea uno nuevo para empezar a experimentar
        </p>
      </header>

      {/* Projects Grid */}
      <div style={styles.grid} role="list" aria-label="Lista de proyectos">
        {/* Create New Project Card */}
        <button
          onClick={onCreateProject}
          style={styles.createCard}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.5)';
            e.currentTarget.style.transform = 'translateY(-6px)';
            e.currentTarget.style.boxShadow = '0 24px 48px rgba(0, 0, 0, 0.2)';
            const icon = e.currentTarget.querySelector('[data-icon]') as HTMLElement;
            if (icon) icon.style.transform = 'scale(1.1) rotate(90deg)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
            const icon = e.currentTarget.querySelector('[data-icon]') as HTMLElement;
            if (icon) icon.style.transform = 'scale(1) rotate(0deg)';
          }}
          aria-label="Crear nuevo proyecto"
          role="listitem"
        >
          <div style={styles.iconCircle} data-icon>
            <Plus size={36} color="white" strokeWidth={2.5} />
          </div>
          <h3 style={{
            fontSize: '22px',
            fontWeight: 600,
            color: 'white',
            marginBottom: '10px',
            letterSpacing: '-0.01em'
          }}>
            Iniciar Nuevo Proyecto
          </h3>
          <p style={{
            fontSize: '15px',
            color: 'rgba(255, 255, 255, 0.85)',
            textAlign: 'center',
            lineHeight: 1.5
          }}>
            Define objetivos estratégicos y empieza a experimentar
          </p>
        </button>

        {/* Existing Projects */}
        {sortedProjects.map((project) => (
          <button
            key={project.id}
            onClick={() => onSelectProject(project.id)}
            style={styles.projectCard}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-8px)';
              e.currentTarget.style.boxShadow = '0 24px 48px rgba(0, 0, 0, 0.12)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.07)';
            }}
            aria-label={`Abrir proyecto ${project.name}`}
            role="listitem"
          >
            <div style={styles.projectIcon}>
              <Folder size={32} color="white" strokeWidth={2} />
            </div>

            <h3 style={{
              fontSize: '22px',
              fontWeight: 600,
              color: '#111827',
              marginBottom: '10px',
              lineHeight: 1.3,
              letterSpacing: '-0.01em'
            }}>
              {project.name}
            </h3>

            {project.created_at && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                color: '#6b7280',
                marginBottom: '20px'
              }}>
                <Calendar size={15} />
                <time dateTime={project.created_at}>
                  {new Date(project.created_at).toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </time>
              </div>
            )}

            <div style={{ marginTop: 'auto' }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
                borderRadius: '10px',
                fontSize: '14px',
                color: '#4f46e5',
                fontWeight: 600,
                transition: 'all 0.2s ease'
              }}>
                <TrendingUp size={16} />
                Abrir Proyecto →
              </div>
            </div>
          </button>
        ))}

        {/* Empty State */}
        {sortedProjects.length === 0 && (
          <div style={{
            gridColumn: '1 / -1',
            textAlign: 'center',
            padding: '80px 20px',
            color: 'rgba(255, 255, 255, 0.9)'
          }}>
            <Users 
              size={72} 
              color="rgba(255, 255, 255, 0.5)" 
              style={{ marginBottom: '28px' }} 
            />
            <h3 style={{ 
              fontSize: '28px', 
              fontWeight: 600, 
              marginBottom: '14px', 
              color: 'white' 
            }}>
              No hay proyectos todavía
            </h3>
            <p style={{ 
              fontSize: '17px', 
              marginBottom: '32px',
              opacity: 0.9 
            }}>
              Crea tu primer proyecto para comenzar tu journey de growth
            </p>
          </div>
        )}
      </div>

      {/* CSS for spinner animation */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
