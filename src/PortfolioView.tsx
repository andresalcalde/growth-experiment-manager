import React from 'react';
import {
    Beaker,
    TrendingUp,
    ChevronRight,
    Plus,
    Search,
    Trash2
} from 'lucide-react';
import type { Project } from './types';
import { SectionGuide } from './components/SectionGuide';

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
// ProjectCard Component - Miro-inspired
// ============================================================================

// Gradient presets for card headers
const CARD_GRADIENTS = [
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
    'linear-gradient(135deg, #fccb90 0%, #d57eeb 100%)',
    'linear-gradient(135deg, #96e6a1 0%, #d4fc79 100%)',
];

const ProjectCard = ({
    project,
    index,
    onClick,
    onDelete
}: {
    project: Project;
    index: number;
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
    const gradient = CARD_GRADIENTS[index % CARD_GRADIENTS.length];

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
                borderRadius: '16px',
                border: '1px solid #E5E7EB',
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 12px 40px rgba(79, 70, 229, 0.15)';
                e.currentTarget.style.borderColor = '#C7D2FE';
                const deleteBtn = e.currentTarget.querySelector('.project-card-delete') as HTMLElement;
                if (deleteBtn) deleteBtn.style.opacity = '1';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.borderColor = '#E5E7EB';
                const deleteBtn = e.currentTarget.querySelector('.project-card-delete') as HTMLElement;
                if (deleteBtn) deleteBtn.style.opacity = '0';
            }}
        >
            {/* Gradient Header - Miro style */}
            <div style={{
                height: '80px',
                background: gradient,
                position: 'relative',
                display: 'flex',
                alignItems: 'flex-end',
                padding: '0 20px 0',
            }}>
                {/* Decorative pattern */}
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    opacity: 0.15,
                    backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 30%, white 1px, transparent 1px), radial-gradient(circle at 60% 70%, white 1.5px, transparent 1.5px)',
                    backgroundSize: '40px 40px, 50px 50px, 30px 30px'
                }} />

                {/* Project Avatar */}
                <div style={{
                    width: '48px', height: '48px', borderRadius: '14px',
                    background: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '16px', fontWeight: 800, color: '#4F46E5',
                    transform: 'translateY(24px)', border: '3px solid white',
                    flexShrink: 0,
                }}>
                    {project.metadata.logo || initials}
                </div>

                {/* Badges */}
                <div style={{
                    position: 'absolute', top: '12px', right: '12px',
                    display: 'flex', gap: '6px', alignItems: 'center'
                }}>
                    {isDemo && (
                        <span style={{
                            fontSize: '10px', fontWeight: 700, padding: '3px 8px',
                            borderRadius: '99px', background: 'rgba(255,255,255,0.9)', color: '#D97706',
                            textTransform: 'uppercase', letterSpacing: '0.5px',
                            backdropFilter: 'blur(4px)',
                        }}>
                            ★ Demo
                        </span>
                    )}
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

            {/* Card Body */}
            <div style={{ padding: '32px 20px 20px', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Badges row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <RoleBadge role="admin" />
                </div>

                {/* Project Name */}
                <h3 style={{
                    fontSize: '17px', fontWeight: 700, margin: 0, lineHeight: 1.3,
                    color: '#111827', letterSpacing: '-0.2px'
                }}>
                    {project.metadata.name}
                </h3>

                {/* North Star Metric - Compact */}
                <div style={{
                    background: '#F9FAFB',
                    borderRadius: '10px',
                    padding: '12px 14px',
                    border: '1px solid #F3F4F6',
                }}>
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                    }}>
                        <div>
                            <div style={{
                                fontSize: '10px', fontWeight: 600, textTransform: 'uppercase',
                                letterSpacing: '0.5px', color: '#9CA3AF', marginBottom: '2px',
                                display: 'flex', alignItems: 'center', gap: '4px'
                            }}>
                                <TrendingUp size={10} />
                                North Star
                            </div>
                            <div style={{ fontSize: '22px', fontWeight: 800, color: '#111827', lineHeight: 1 }}>
                                {formatValue(northStarValue, northStarUnit)}
                            </div>
                        </div>
                        <div style={{
                            fontSize: '11px', color: '#6B7280', textAlign: 'right',
                            maxWidth: '100px', lineHeight: 1.3
                        }}>
                            {northStarName}
                        </div>
                    </div>
                </div>

                {/* Footer stats */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    marginTop: 'auto', paddingTop: '8px',
                    borderTop: '1px solid #F3F4F6'
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
    onDeleteProject?: (projectId: string) => void;
}

export const PortfolioView: React.FC<PortfolioViewProps> = ({
    projects,
    onSelectProject,
    onCreateProject,
    onDeleteProject,
}) => {
    const [searchQuery, setSearchQuery] = React.useState('');

    const filteredProjects = projects.filter(p =>
        p.metadata.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const totalExperiments = projects.reduce((sum, p) => sum + p.experiments.length, 0);
    const totalActive = projects.reduce((sum, p) => sum + p.experiments.filter(e => !e.status.startsWith('Finished')).length, 0);

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(180deg, #F8FAFC 0%, #EEF2FF 100%)',
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
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                        <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" fill="#4F46E5" stroke="#4F46E5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span style={{ fontWeight: 800, fontSize: '17px', letterSpacing: '-0.5px', color: '#111827' }}>Growth Lab</span>
                </div>
                <div style={{
                    width: '36px', height: '36px', borderRadius: '50%',
                    background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', fontSize: '14px', fontWeight: 700,
                }}>
                    A
                </div>
            </div>

            <div style={{ padding: '40px', maxWidth: '1100px', margin: '0 auto' }}>
                {/* Header */}
                <div style={{ marginBottom: '32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
                        <h1 style={{ fontSize: '32px', fontWeight: 800, margin: 0, color: '#111827', letterSpacing: '-0.5px' }}>
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
                            background: '#4F46E5', color: 'white', border: 'none',
                            cursor: 'pointer', fontSize: '14px', fontWeight: 600,
                            transition: 'all 0.2s', whiteSpace: 'nowrap',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#4338CA'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = '#4F46E5'; }}
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
                        {filteredProjects.map((project, index) => (
                            <ProjectCard
                                key={project.metadata.id}
                                project={project}
                                index={index}
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
                                    e.currentTarget.style.borderColor = '#4F46E5';
                                    e.currentTarget.style.color = '#4F46E5';
                                    e.currentTarget.style.background = 'rgba(79, 70, 229, 0.03)';
                                    e.currentTarget.style.transform = 'translateY(-4px)';
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
