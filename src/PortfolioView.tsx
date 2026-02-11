import React from 'react';
import {
    LayoutGrid,
    Beaker,
    TrendingUp,
    Clock,
    ChevronRight,
    Sparkles,
    Plus
} from 'lucide-react';
import type { Project } from './types';

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
            fontSize: '11px', fontWeight: 600, padding: '2px 8px',
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
    onClick
}: {
    project: Project;
    onClick: () => void;
}) => {
    const activeExperiments = project.experiments.filter(
        e => !e.status.startsWith('Finished')
    ).length;
    const totalExperiments = project.experiments.length;
    const isDemo = project.metadata.name.toLowerCase().includes('demo');
    const northStarValue = project.northStar?.currentValue ?? 0;
    const northStarName = project.northStar?.name ?? 'Not set';
    const northStarUnit = project.northStar?.unit ?? '';

    // Format the value nicely
    const formatValue = (val: number, unit: string) => {
        if (unit === '$' || unit === 'currency') return `$${val.toLocaleString()}`;
        if (unit === '%') return `${val}%`;
        return val.toLocaleString();
    };

    return (
        <div
            onClick={onClick}
            style={{
                background: 'white',
                borderRadius: '16px',
                border: '1px solid #E5E7EB',
                padding: '24px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                position: 'relative',
                overflow: 'hidden',
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.08)';
                e.currentTarget.style.borderColor = '#4F46E5';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.borderColor = '#E5E7EB';
            }}
        >
            {/* Top row: badges */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <RoleBadge role="admin" />
                {isDemo && (
                    <span style={{
                        fontSize: '11px', fontWeight: 600, padding: '2px 8px',
                        borderRadius: '99px', background: '#FEF3C7', color: '#D97706',
                        textTransform: 'uppercase', letterSpacing: '0.5px'
                    }}>
                        Demo
                    </span>
                )}
            </div>

            {/* Project Name */}
            <div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0, lineHeight: 1.3, color: '#111827' }}>
                    {project.metadata.name}
                </h3>
            </div>

            {/* North Star Metric */}
            <div style={{
                background: 'linear-gradient(135deg, #F5F3FF 0%, #EEF2FF 100%)',
                borderRadius: '12px',
                padding: '16px',
            }}>
                <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#6B7280', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <TrendingUp size={12} />
                    North Star
                </div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#4F46E5' }}>
                    {formatValue(northStarValue, northStarUnit)}
                </div>
                <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>
                    {northStarName}
                </div>
            </div>

            {/* Stats row */}
            <div style={{ display: 'flex', gap: '16px', marginTop: 'auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Beaker size={14} color="#6B7280" />
                    <span style={{ fontSize: '13px', color: '#374151' }}>
                        <strong>{activeExperiments}</strong> active
                    </span>
                    <span style={{ fontSize: '12px', color: '#9CA3AF' }}>
                        / {totalExperiments} total
                    </span>
                </div>
            </div>

            {/* Arrow indicator */}
            <div style={{
                position: 'absolute', bottom: '24px', right: '20px',
                color: '#D1D5DB', transition: 'color 0.2s'
            }}>
                <ChevronRight size={20} />
            </div>
        </div>
    );
};

// ============================================================================
// Loading Skeleton
// ============================================================================
const ProjectCardSkeleton = () => (
    <div style={{
        background: 'white', borderRadius: '16px', border: '1px solid #E5E7EB',
        padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px',
    }}>
        <div style={{ width: '60px', height: '20px', borderRadius: '10px', background: '#F3F4F6' }} />
        <div style={{ width: '70%', height: '22px', borderRadius: '6px', background: '#F3F4F6' }} />
        <div style={{ height: '80px', borderRadius: '12px', background: '#F3F4F6' }} />
        <div style={{ width: '50%', height: '16px', borderRadius: '6px', background: '#F3F4F6' }} />
    </div>
);

// ============================================================================
// PortfolioView Component
// ============================================================================
interface PortfolioViewProps {
    projects: Project[];
    onSelectProject: (projectId: string) => void;
    onCreateProject: () => void;
}

export const PortfolioView: React.FC<PortfolioViewProps> = ({
    projects,
    onSelectProject,
    onCreateProject,
}) => {
    const isLoading = false; // Future: real loading state

    return (
        <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ marginBottom: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <div style={{
                        width: '40px', height: '40px', borderRadius: '12px',
                        background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <LayoutGrid size={20} color="white" />
                    </div>
                    <h1 style={{ fontSize: '28px', fontWeight: 800, margin: 0, color: '#111827' }}>
                        Projects
                    </h1>
                </div>
                <p style={{ fontSize: '15px', color: '#6B7280', margin: 0 }}>
                    Select a project to manage experiments and track growth.
                </p>
            </div>

            {/* Grid */}
            {isLoading ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
                    <ProjectCardSkeleton />
                    <ProjectCardSkeleton />
                    <ProjectCardSkeleton />
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
                    {projects.map((project) => (
                        <ProjectCard
                            key={project.metadata.id}
                            project={project}
                            onClick={() => onSelectProject(project.metadata.id)}
                        />
                    ))}

                    {/* Create New Project Card */}
                    <div
                        onClick={onCreateProject}
                        style={{
                            borderRadius: '16px',
                            border: '2px dashed #D1D5DB',
                            padding: '24px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '12px',
                            minHeight: '220px',
                            color: '#9CA3AF',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = '#4F46E5';
                            e.currentTarget.style.color = '#4F46E5';
                            e.currentTarget.style.background = 'rgba(79, 70, 229, 0.02)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = '#D1D5DB';
                            e.currentTarget.style.color = '#9CA3AF';
                            e.currentTarget.style.background = 'transparent';
                        }}
                    >
                        <div style={{
                            width: '48px', height: '48px', borderRadius: '50%',
                            background: 'rgba(79, 70, 229, 0.08)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <Plus size={24} />
                        </div>
                        <span style={{ fontSize: '15px', fontWeight: 600 }}>Create New Project</span>
                    </div>
                </div>
            )}
        </div>
    );
};
