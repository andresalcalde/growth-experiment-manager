import React from 'react';
import {
    Beaker,
    TrendingUp,
    ChevronRight,
    Plus,
    Search,
    Shield,
    Trash2,
    UserCircle,
    LogOut
} from 'lucide-react';
import type { Project } from './types';
import { SectionGuide } from './components/SectionGuide';
import { useAuth } from './contexts/AuthContext';

// ============================================================================
// RoleBadge Component
// ============================================================================
const RoleBadge = ({ role }: { role: string }) => {
    const config: Record<string, { bg: string; color: string; label: string }> = {
        admin: { bg: 'rgba(79, 70, 229, 0.1)', color: '#4F46E5', label: 'Admin' },
        editor: { bg: 'rgba(16, 185, 129, 0.1)', color: '#059669', label: 'Editor' },
        viewer: { bg: 'rgba(107, 114, 128, 0.1)', color: '#6B7280', label: 'Viewer' },
    };
    const c = config[role] || config.admin;
    return (
        <span style={{
            fontSize: '10px', fontWeight: 700, padding: '3px 8px',
            borderRadius: '99px', background: c.bg, color: c.color,
            textTransform: 'uppercase', letterSpacing: '0.5px'
        }}>
            {c.label}
        </span>
    );
};

// ============================================================================
// ProjectCard Component
// ============================================================================

const ProjectCard = ({
    project,
    onClick,
    onDelete
}: {
    project: Project;
    onClick: () => void;
    onDelete?: () => void;
}) => {
    const activeExperiments = project.experiments.filter(
        e => !e.status.startsWith('Finished')
    ).length;
    const totalExperiments = project.experiments.length;
    const isDemo = project.metadata.name.toLowerCase().includes('demo');
    const northStarValue = project.northStar?.currentValue ?? 0;
    const northStarName = project.northStar?.name ?? 'Sin configurar';
    const northStarUnit = project.northStar?.unit ?? '';

    const formatValue = (val: number, unit: string) => {
        if (unit === '$' || unit === 'currency') return `$${val.toLocaleString()}`;
        if (unit === '%') return `${val}%`;
        return val.toLocaleString();
    };

    // Get initials for the logo
    const initials = project.metadata.name
        .split(' ')
        .map(w => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();

    return (
        <div
            onClick={onClick}
            style={{
                background: 'white',
                borderRadius: '12px',
                border: '1px solid rgba(17,17,20,0.12)',
                cursor: 'pointer',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease',
                display: 'flex',
                flexDirection: 'column',
                gap: '18px',
                padding: '22px',
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.boxShadow = '0 10px 28px rgba(17,17,20,0.08)';
                e.currentTarget.style.borderColor = 'rgba(17,17,20,0.24)';
                const deleteBtn = e.currentTarget.querySelector('.project-card-delete') as HTMLElement;
                if (deleteBtn) deleteBtn.style.opacity = '1';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.borderColor = 'rgba(17,17,20,0.12)';
                const deleteBtn = e.currentTarget.querySelector('.project-card-delete') as HTMLElement;
                if (deleteBtn) deleteBtn.style.opacity = '0';
            }}
        >
            {/* Top: avatar + badges */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div style={{
                    width: '44px', height: '44px', borderRadius: '9px',
                    background: '#f1f0ec', border: '1px solid rgba(17,17,20,0.10)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '15px', fontWeight: 600, color: '#111114',
                    overflow: 'hidden', flexShrink: 0,
                }}>
                    {project.metadata.logoUrl ? (
                        <img src={project.metadata.logoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                        project.metadata.logo || initials
                    )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {isDemo && (
                        <span style={{
                            fontSize: '10px', fontWeight: 700, padding: '3px 8px',
                            borderRadius: '5px', background: '#f1f0ec', color: '#74747c',
                            textTransform: 'uppercase', letterSpacing: '0.06em',
                        }}>
                            Demo
                        </span>
                    )}
                    <RoleBadge role="admin" />
                    {onDelete && (
                        <button
                            className="project-card-delete"
                            onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm('¿Estás seguro de que deseas eliminar este proyecto? Esta acción no se puede deshacer.')) {
                                    onDelete();
                                }
                            }}
                            style={{
                                opacity: 0,
                                transition: 'opacity 0.2s',
                                padding: '4px',
                                borderRadius: '6px',
                                border: 'none',
                                background: 'rgba(255,255,255,0.9)',
                                backdropFilter: 'blur(4px)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#DC2626',
                            }}
                        >
                            <Trash2 size={14} />
                        </button>
                    )}
                </div>
            </div>

            {/* Project Name */}
            <h3 style={{
                fontSize: '17px', fontWeight: 600, margin: 0, lineHeight: 1.3,
                color: '#111114', letterSpacing: '-0.01em',
            }}>
                {project.metadata.name}
            </h3>

            {/* North Star Metric */}
            <div style={{
                background: '#faf9f6',
                borderRadius: '8px',
                padding: '12px 14px',
                border: '1px solid rgba(17,17,20,0.08)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <div style={{
                            fontSize: '10px', fontWeight: 600, textTransform: 'uppercase',
                            letterSpacing: '0.08em', color: '#9CA3AF', marginBottom: '3px',
                            display: 'flex', alignItems: 'center', gap: '4px',
                        }}>
                            <TrendingUp size={10} />
                            North Star
                        </div>
                        <div style={{ fontSize: '22px', fontWeight: 700, color: '#111114', lineHeight: 1 }}>
                            {formatValue(northStarValue, northStarUnit)}
                        </div>
                    </div>
                    <div style={{
                        fontSize: '11px', color: '#6B7280', textAlign: 'right',
                        maxWidth: '100px', lineHeight: 1.3,
                    }}>
                        {northStarName}
                    </div>
                </div>
            </div>

            {/* Footer stats */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginTop: 'auto', paddingTop: '14px',
                borderTop: '1px solid rgba(17,17,20,0.08)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Beaker size={14} color="#9CA3AF" />
                    <span style={{ fontSize: '13px', color: '#6B7280' }}>
                        <span style={{ fontWeight: 700, color: '#374151' }}>{activeExperiments}</span> activos
                        <span style={{ color: '#D1D5DB', margin: '0 4px' }}>·</span>
                        {totalExperiments} total
                    </span>
                </div>
                <ChevronRight size={16} color="#D1D5DB" />
            </div>
        </div>
    );
};

// ============================================================================
// PortfolioView Component
// ============================================================================
interface PortfolioViewProps {
    projects: Project[];
    onSelectProject: (projectId: string) => void;
    onCreateProject: () => void;
    onSignOut?: () => void;
    onOpenAdmin?: () => void;
    onOpenProfile?: () => void;
    onDeleteProject?: (projectId: string) => void;
}

export const PortfolioView: React.FC<PortfolioViewProps> = ({
    projects,
    onSelectProject,
    onCreateProject,
    onSignOut,
    onOpenAdmin,
    onOpenProfile,
    onDeleteProject,
}) => {
    const { profile } = useAuth();
    const [showUserMenu, setShowUserMenu] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState('');

    const filteredProjects = projects.filter(p =>
        p.metadata.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const totalExperiments = projects.reduce((sum, p) => sum + p.experiments.length, 0);
    const totalActive = projects.reduce((sum, p) => sum + p.experiments.filter(e => !e.status.startsWith('Finished')).length, 0);

    return (
        <div style={{
            minHeight: '100vh',
            background: '#f6f5f1',
        }}>
            {/* Top bar */}
            <div style={{
                padding: '16px 40px',
                borderBottom: '1px solid #E5E7EB',
                background: 'rgba(255,255,255,0.8)',
                backdropFilter: 'blur(12px)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {profile?.panel_logo_url ? (
                        <img
                            src={profile.panel_logo_url}
                            alt="Panel logo"
                            style={{ width: '28px', height: '28px', borderRadius: '6px', objectFit: 'cover' }}
                        />
                    ) : (
                        <>
                            <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" fill="#4F46E5" />
                            </svg>
                            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: '17px', letterSpacing: '-0.01em', color: '#111114' }}>Growth Hub</span>
                        </>
                    )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {onOpenAdmin && (
                    <button
                      onClick={onOpenAdmin}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px',
                        border: '1px solid #c7d2fe', borderRadius: '8px', background: '#eef2ff',
                        color: '#4F46E5', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      <Shield size={16} />
                      Admin
                    </button>
                  )}
                  <div style={{ position: 'relative' }}>
                    <div
                        onClick={() => setShowUserMenu(!showUserMenu)}
                        title={profile?.full_name || profile?.email || ''}
                        style={{
                            width: '36px', height: '36px', borderRadius: '50%',
                            background: '#111114', overflow: 'hidden',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'white', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
                        }}
                    >
                        {profile?.avatar_url && (profile.avatar_url.startsWith('http') || profile.avatar_url.startsWith('data:'))
                            ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : (profile?.full_name || profile?.email || '?').charAt(0).toUpperCase()}
                    </div>
                    {showUserMenu && (
                        <>
                            <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setShowUserMenu(false)} />
                            <div style={{ position: 'absolute', top: '44px', right: 0, background: 'white', borderRadius: '8px', border: '1px solid #E5E7EB', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 100, minWidth: '180px', overflow: 'hidden' }}>
                                <div style={{ padding: '12px 16px', borderBottom: '1px solid #E5E7EB' }}>
                                    <div style={{ fontWeight: 600, fontSize: '14px' }}>{profile?.full_name || 'Usuario'}</div>
                                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>{profile?.email}</div>
                                </div>
                                {onOpenProfile && (
                                    <button
                                        onClick={() => { setShowUserMenu(false); onOpenProfile(); }}
                                        style={{ width: '100%', padding: '10px 16px', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer', fontSize: '13px', color: '#111114', display: 'flex', alignItems: 'center', gap: '8px' }}
                                        onMouseEnter={e => (e.currentTarget.style.background = '#F5F3FF')}
                                        onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                                    >
                                        <UserCircle size={14} />
                                        Mi perfil
                                    </button>
                                )}
                                {onSignOut && (
                                    <button
                                        onClick={() => { setShowUserMenu(false); onSignOut(); }}
                                        style={{ width: '100%', padding: '10px 16px', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer', fontSize: '13px', color: '#DC2626', display: 'flex', alignItems: 'center', gap: '8px' }}
                                        onMouseEnter={e => (e.currentTarget.style.background = '#FEF2F2')}
                                        onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                                    >
                                        <LogOut size={14} />
                                        Cerrar Sesión
                                    </button>
                                )}
                            </div>
                        </>
                    )}
                  </div>
                </div>
            </div>

            <div style={{ padding: '40px', maxWidth: '1100px', margin: '0 auto' }}>
                {/* Header */}
                <div style={{ marginBottom: '32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
                        <h1 style={{ fontSize: '32px', fontWeight: 600, margin: 0, color: '#111114', letterSpacing: '-0.025em' }}>
                            Tus Proyectos
                        </h1>
                        <span style={{
                            fontSize: '13px', fontWeight: 600, padding: '4px 10px',
                            borderRadius: '99px', background: '#EEF2FF', color: '#4F46E5',
                        }}>
                            {projects.length}
                        </span>
                    </div>
                    <p style={{ fontSize: '15px', color: '#6B7280', margin: 0 }}>
                        {totalActive} experimentos activos en {projects.length} proyectos · {totalExperiments} experimentos en total
                    </p>
                </div>

                {/* Section Guide */}
                <div style={{ marginBottom: '20px' }}>
                    <SectionGuide guideId="portfolio" />
                </div>

                {/* Search + Actions */}
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px'
                }}>
                    <div style={{
                        flex: 1, display: 'flex', alignItems: 'center', gap: '10px',
                        background: 'white', borderRadius: '10px', padding: '10px 14px',
                        border: '1px solid #E5E7EB', transition: 'border-color 0.2s',
                    }}>
                        <Search size={16} color="#9CA3AF" />
                        <input
                            type="text"
                            placeholder="Buscar proyectos..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                border: 'none', outline: 'none', fontSize: '14px',
                                background: 'transparent', width: '100%', color: '#374151',
                            }}
                        />
                    </div>
                    <button
                        onClick={onCreateProject}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            padding: '10px 20px', borderRadius: '10px',
                            background: '#111114', color: 'white', border: 'none',
                            cursor: 'pointer', fontSize: '14px', fontWeight: 600,
                            transition: 'opacity 0.15s ease', whiteSpace: 'nowrap',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.86'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
                    >
                        <Plus size={16} />
                        Nuevo Proyecto
                    </button>
                </div>

                {/* Grid */}
                {filteredProjects.length === 0 && searchQuery ? (
                    <div style={{
                        textAlign: 'center', padding: '60px 20px',
                        color: '#9CA3AF',
                    }}>
                        <Search size={40} color="#D1D5DB" style={{ marginBottom: '16px' }} />
                        <p style={{ fontSize: '16px', fontWeight: 500 }}>Ningún proyecto coincide con "{searchQuery}"</p>
                        <p style={{ fontSize: '13px' }}>Intenta con un término diferente</p>
                    </div>
                ) : (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                        gap: '20px'
                    }}>
                        {filteredProjects.map((project) => (
                            <ProjectCard
                                key={project.metadata.id}
                                project={project}
                                onClick={() => onSelectProject(project.metadata.id)}
                                onDelete={onDeleteProject ? () => onDeleteProject(project.metadata.id) : undefined}
                            />
                        ))}

                        {/* Create New Card - only show when not searching */}
                        {!searchQuery && (
                            <div
                                onClick={onCreateProject}
                                style={{
                                    borderRadius: '16px',
                                    border: '2px dashed #D1D5DB',
                                    overflow: 'hidden',
                                    cursor: 'pointer',
                                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '12px',
                                    minHeight: '280px',
                                    color: '#9CA3AF',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.borderColor = '#111114';
                                    e.currentTarget.style.color = '#111114';
                                    e.currentTarget.style.background = 'rgba(17,17,20,0.03)';
                                    e.currentTarget.style.transform = 'translateY(-3px)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.borderColor = '#D1D5DB';
                                    e.currentTarget.style.color = '#9CA3AF';
                                    e.currentTarget.style.background = 'transparent';
                                    e.currentTarget.style.transform = 'translateY(0)';
                                }}
                            >
                                <div style={{
                                    width: '56px', height: '56px', borderRadius: '16px',
                                    background: 'rgba(79, 70, 229, 0.06)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    transition: 'all 0.2s',
                                }}>
                                    <Plus size={24} />
                                </div>
                                <span style={{ fontSize: '15px', fontWeight: 600 }}>Crear Nuevo Proyecto</span>
                                <span style={{ fontSize: '12px', opacity: 0.7 }}>Comienza a trackear tus growth experiments</span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* CSS for skeleton animation */}
            <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
        </div>
    );
};
