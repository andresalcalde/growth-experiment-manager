import React, { useState, useEffect } from 'react';
import { X, Lightbulb, ChevronRight, Sparkles, BookOpen, HelpCircle } from 'lucide-react';

// ============================================================================
// Section Guide — Contextual onboarding tooltip for each platform section
// Inspired by Asana's "Learn about" cards & Miro's section walkthroughs
// ============================================================================

export interface GuideStep {
    icon: string;
    title: string;
    description: string;
}

export interface SectionGuideConfig {
    id: string;
    emoji: string;
    title: string;
    subtitle: string;
    description: string;
    steps: GuideStep[];
    proTip?: string;
    accentColor: string;
    accentGradient: string;
}

// ── Predefined configs for each section ─────────────────────────────────────

export const SECTION_GUIDES: Record<string, SectionGuideConfig> = {
    portfolio: {
        id: 'portfolio',
        emoji: '📊',
        title: 'Portfolio Overview',
        subtitle: 'Tu centro de comando de growth',
        description: 'Este es tu dashboard central con todos los proyectos activos. Cada tarjeta representa un proyecto de growth con el progreso de su North Star Metric, experimentos activos y actividad del equipo.',
        steps: [
            { icon: '🎯', title: 'Selecciona un Proyecto', description: 'Haz clic en cualquier tarjeta para acceder a su Growth Roadmap y experimentos.' },
            { icon: '➕', title: 'Crear Nuevo Proyecto', description: 'Usa el botón "Nuevo Proyecto" para iniciar una nueva iniciativa de growth con una North Star Metric definida.' },
            { icon: '📈', title: 'Monitorea el Progreso', description: 'Cada tarjeta muestra el progreso en tiempo real hacia tu North Star Metric target.' },
        ],
        proTip: 'Piensa en cada proyecto como una "apuesta" de growth que tu equipo está haciendo. Enfócate en máximo 2-3 proyectos activos a la vez.',
        accentColor: '#4F46E5',
        accentGradient: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
    },

    roadmap: {
        id: 'roadmap',
        emoji: '🗺️',
        title: '01. Design — Growth Roadmap',
        subtitle: 'Define tu estrategia de growth',
        description: 'Diseña tu motor de crecimiento usando el framework de Reforge: empieza con tu North Star Metric, luego define Growth Objectives (levers) y Strategic Initiatives (acciones) que la muevan.',
        steps: [
            { icon: '⭐', title: 'Define tu North Star', description: 'Define la métrica más importante que representa el core value de tu compañía. Haz clic en la tarjeta de North Star para editarla.' },
            { icon: '🎯', title: 'Agrega Growth Objectives', description: 'Son los "levers" de alto impacto que influyen en tu North Star. Piensa en ellos como áreas de enfoque estratégico (ej: "Aumentar Conversion Rate", "Reducir Churn").' },
            { icon: '⚡', title: 'Define Initiatives', description: 'Bajo cada objetivo, agrega estrategias accionables específicas: las acciones concretas que tu equipo ejecutará (ej: "A/B Test en Landing Page", "Secuencia de Email Onboarding").' },
        ],
        proTip: 'Una buena North Star tiene 3–5 Growth Objectives. Cada Objective debería tener 2–4 Initiatives. Esto crea un roadmap de growth enfocado y manejable.',
        accentColor: '#4F46E5',
        accentGradient: 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)',
    },

    table: {
        id: 'table',
        emoji: '🔬',
        title: '02. Explore — Experiment Backlog',
        subtitle: 'Prioriza tus experimentos científicamente',
        description: 'Esta es tu tabla de priorización de experimentos. Todos los experimentos comienzan aquí como "Ideas". Usa ICE scoring (Impact × Confidence × Ease) para rankear objetivamente cuáles ejecutar primero.',
        steps: [
            { icon: '💡', title: 'Agrega Ideas', description: 'Haz clic en "Nuevo Experimento" para agregar ideas. Incluye una hipótesis clara, la strategy vinculada y su funnel stage.' },
            { icon: '🎲', title: 'Evalúa con ICE', description: 'Califica cada experimento del 1–10 en Impact, Confidence y Ease. El ICE Score (I×C×E) los rankea automáticamente. Haz clic en cualquier celda para editar inline.' },
            { icon: '🚀', title: 'Promueve a Committed', description: 'Cambia el status de "Idea" → "Prioritized" para comprometerte a ejecutar un experimento. Aparecerá en el board de Be Agile.' },
        ],
        proTip: 'Ordena por ICE Score descendente para ver tus experimentos de mayor prioridad primero. Enfoca el bandwidth de tu equipo en los top 3–5 experimentos en cualquier momento.',
        accentColor: '#0EA5E9',
        accentGradient: 'linear-gradient(135deg, #0EA5E9 0%, #38BDF8 100%)',
    },

    board: {
        id: 'board',
        emoji: '🏃',
        title: '03. Be Agile — Kanban Board',
        subtitle: 'Sigue tus experimentos committed en tiempo real',
        description: 'Este Kanban board muestra solo los experimentos committed (Prioritized → Live Testing → Analysis). Arrastra y suelta las tarjetas para actualizar su status conforme avanzan en tu growth sprint.',
        steps: [
            { icon: '📋', title: 'Prioritized', description: 'Experimentos aprobados y listos para construir. Tu equipo debería tomar de aquí para el sprint actual.' },
            { icon: '🔨', title: 'Building', description: 'Experimentos en desarrollo — assets creativos, landing pages, implementación técnica, etc.' },
            { icon: '🧪', title: 'Live Testing', description: 'Experimentos en vivo recolectando datos. Monitoréalos activamente y define los success criteria.' },
            { icon: '📊', title: 'Analysis', description: 'Experimentos donde el testing terminó. Analiza resultados y márcalos como Winner, Loser o Inconclusive.' },
        ],
        proTip: 'Cuando muevas un experimento a "Finished", se te pedirá registrar Key Learnings. Esto construye el conocimiento institucional de tu equipo con el tiempo.',
        accentColor: '#10B981',
        accentGradient: 'linear-gradient(135deg, #10B981 0%, #34D399 100%)',
    },

    library: {
        id: 'library',
        emoji: '📚',
        title: '04. Learning — Knowledge Library',
        subtitle: 'Tu memoria institucional de growth',
        description: 'La Learning Library es donde los experimentos completados viven como "case studies". Cada tarjeta captura la hipótesis, resultados y key learnings — construyendo el conocimiento compuesto de growth de tu equipo.',
        steps: [
            { icon: '✅', title: 'Winners', description: 'Experimentos que validaron su hipótesis. Son playbooks probados para escalar y replicar.' },
            { icon: '❌', title: 'Losers', description: 'Experimentos que refutaron su hipótesis. Igualmente valiosos — previenen repetir enfoques fallidos.' },
            { icon: '🔍', title: 'Filtra y Busca', description: 'Usa los filtros para navegar por resultado (Winners/Losers) o funnel stage (Acquisition, Activation, etc.).' },
        ],
        proTip: 'Los mejores equipos de growth tratan los "losers" como datos sumamente valiosos. Un experimento fallido con un learning claro vale más que un winner que no puedes explicar.',
        accentColor: '#8B5CF6',
        accentGradient: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)',
    },

    settings: {
        id: 'settings',
        emoji: '⚙️',
        title: 'Settings — Team & Project Config',
        subtitle: 'Administra tu workspace',
        description: 'Configura los miembros de tu equipo, acceso a proyectos y ajustes del workspace. Los miembros agregados aquí estarán disponibles como owners de experimentos en toda la plataforma.',
        steps: [
            { icon: '👥', title: 'Team Members', description: 'Agrega y administra miembros del equipo. Cada miembro puede ser asignado como owner de un experimento.' },
            { icon: '🔐', title: 'Project Access', description: 'Controla a qué proyectos puede acceder cada miembro y su rol (Admin, Lead, Viewer).' },
            { icon: '🔄', title: 'Data Management', description: 'Reinicia o exporta tus datos según sea necesario.' },
        ],
        accentColor: '#6B7280',
        accentGradient: 'linear-gradient(135deg, #6B7280 0%, #9CA3AF 100%)',
    },
};

// ── Persistence helpers ─────────────────────────────────────────────────────

function isDismissed(guideId: string): boolean {
    try {
        const dismissed = JSON.parse(localStorage.getItem('dismissedGuides') || '[]');
        return dismissed.includes(guideId);
    } catch {
        return false;
    }
}

function dismissGuide(guideId: string): void {
    try {
        const dismissed = JSON.parse(localStorage.getItem('dismissedGuides') || '[]');
        if (!dismissed.includes(guideId)) {
            dismissed.push(guideId);
            localStorage.setItem('dismissedGuides', JSON.stringify(dismissed));
        }
    } catch { }
}

function resetGuide(guideId: string): void {
    try {
        const dismissed = JSON.parse(localStorage.getItem('dismissedGuides') || '[]');
        const updated = dismissed.filter((id: string) => id !== guideId);
        localStorage.setItem('dismissedGuides', JSON.stringify(updated));
    } catch { }
}


// ============================================================================
// SectionGuide Component — Collapsible contextual guide banner
// ============================================================================

interface SectionGuideProps {
    guideId: string;
    variant?: 'banner' | 'compact';
}

export const SectionGuide: React.FC<SectionGuideProps> = ({ guideId, variant = 'banner' }) => {
    const config = SECTION_GUIDES[guideId];
    if (!config) return null;

    const [isExpanded, setIsExpanded] = useState(false);
    const [isDismissedState, setIsDismissedState] = useState(() => isDismissed(guideId));
    const [isAnimating, setIsAnimating] = useState(false);

    // Reset animation state on expand
    useEffect(() => {
        if (isExpanded) {
            setIsAnimating(true);
            const timer = setTimeout(() => setIsAnimating(false), 300);
            return () => clearTimeout(timer);
        }
    }, [isExpanded]);

    if (isDismissedState && variant === 'banner') {
        // Show a subtle "?" button to re-open
        return (
            <button
                onClick={() => {
                    resetGuide(guideId);
                    setIsDismissedState(false);
                }}
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: '20px',
                    border: '1px solid #E5E7EB',
                    background: 'white',
                    color: '#9CA3AF',
                    fontSize: '12px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    marginLeft: '8px',
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = config.accentColor;
                    e.currentTarget.style.color = config.accentColor;
                    e.currentTarget.style.background = `${config.accentColor}08`;
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#E5E7EB';
                    e.currentTarget.style.color = '#9CA3AF';
                    e.currentTarget.style.background = 'white';
                }}
                title="Mostrar guía de sección"
            >
                <HelpCircle size={14} />
                <span>Cómo funciona</span>
            </button>
        );
    }

    const handleDismiss = () => {
        dismissGuide(guideId);
        setIsDismissedState(true);
    };

    // ── Compact variant: small inline tooltip ──
    if (variant === 'compact') {
        return (
            <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                position: 'relative',
            }}>
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '4px 10px',
                        borderRadius: '16px',
                        border: `1px solid ${isExpanded ? config.accentColor : '#E5E7EB'}`,
                        background: isExpanded ? `${config.accentColor}10` : 'white',
                        color: isExpanded ? config.accentColor : '#9CA3AF',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                        if (!isExpanded) {
                            e.currentTarget.style.borderColor = config.accentColor;
                            e.currentTarget.style.color = config.accentColor;
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (!isExpanded) {
                            e.currentTarget.style.borderColor = '#E5E7EB';
                            e.currentTarget.style.color = '#9CA3AF';
                        }
                    }}
                >
                    <Lightbulb size={12} />
                    <span>Guía</span>
                </button>

                {isExpanded && (
                    <div style={{
                        position: 'absolute',
                        top: 'calc(100% + 8px)',
                        left: 0,
                        width: '320px',
                        background: 'white',
                        borderRadius: '12px',
                        border: '1px solid #E5E7EB',
                        boxShadow: '0 12px 40px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.08)',
                        zIndex: 100,
                        padding: '16px',
                        animation: 'guideSlideDown 0.2s ease-out',
                    }}>
                        <div style={{ marginBottom: '12px' }}>
                            <div style={{ fontSize: '14px', fontWeight: 700, color: '#1F2937', marginBottom: '4px' }}>
                                {config.emoji} {config.title}
                            </div>
                            <div style={{ fontSize: '12px', color: '#6B7280', lineHeight: '1.5' }}>
                                {config.description}
                            </div>
                        </div>
                        {config.proTip && (
                            <div style={{
                                padding: '10px 12px',
                                borderRadius: '8px',
                                background: `${config.accentColor}08`,
                                border: `1px solid ${config.accentColor}20`,
                                fontSize: '11px',
                                color: '#4B5563',
                                lineHeight: '1.5',
                            }}>
                                <strong style={{ color: config.accentColor }}>💡 Pro Tip:</strong> {config.proTip}
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    }

    // ── Banner variant: full-width collapsible section guide ──
    return (
        <>
            <div style={{
                background: 'white',
                borderRadius: '16px',
                border: '1px solid #E5E7EB',
                overflow: 'hidden',
                marginBottom: '20px',
                transition: 'all 0.3s ease',
                boxShadow: isExpanded ? '0 4px 24px rgba(0,0,0,0.06)' : '0 1px 4px rgba(0,0,0,0.04)',
            }}>
                {/* Header bar — always visible */}
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        width: '100%',
                        padding: '14px 20px',
                        border: 'none',
                        background: isExpanded ? config.accentGradient : 'white',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        gap: '12px',
                    }}
                >
                    <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        background: isExpanded ? 'rgba(255,255,255,0.2)' : `${config.accentColor}10`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '16px',
                        transition: 'all 0.3s ease',
                    }}>
                        {config.emoji}
                    </div>

                    <div style={{ flex: 1, textAlign: 'left' }}>
                        <div style={{
                            fontSize: '14px',
                            fontWeight: 700,
                            color: isExpanded ? 'white' : '#1F2937',
                            letterSpacing: '-0.2px',
                            transition: 'color 0.3s ease',
                        }}>
                            {config.title}
                        </div>
                        <div style={{
                            fontSize: '12px',
                            color: isExpanded ? 'rgba(255,255,255,0.85)' : '#9CA3AF',
                            fontWeight: 400,
                            transition: 'color 0.3s ease',
                        }}>
                            {config.subtitle}
                        </div>
                    </div>

                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                    }}>
                        {!isExpanded && (
                            <span style={{
                                fontSize: '11px',
                                fontWeight: 600,
                                color: config.accentColor,
                                background: `${config.accentColor}10`,
                                padding: '4px 10px',
                                borderRadius: '12px',
                            }}>
                                <BookOpen size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                                Cómo funciona
                            </span>
                        )}
                        <ChevronRight
                            size={16}
                            style={{
                                color: isExpanded ? 'white' : '#9CA3AF',
                                transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                                transition: 'transform 0.3s ease, color 0.3s ease',
                            }}
                        />
                    </div>
                </button>

                {/* Expanded content */}
                {isExpanded && (
                    <div style={{
                        padding: '24px 20px',
                        borderTop: '1px solid #F3F4F6',
                        animation: 'guideSlideDown 0.3s ease-out',
                    }}>
                        {/* Description */}
                        <p style={{
                            fontSize: '14px',
                            lineHeight: '1.7',
                            color: '#374151',
                            marginBottom: '20px',
                            maxWidth: '680px',
                        }}>
                            {config.description}
                        </p>

                        {/* Steps */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: `repeat(${Math.min(config.steps.length, 4)}, 1fr)`,
                            gap: '12px',
                            marginBottom: '20px',
                        }}>
                            {config.steps.map((step, i) => (
                                <div
                                    key={i}
                                    style={{
                                        background: '#F9FAFB',
                                        borderRadius: '12px',
                                        padding: '16px',
                                        border: '1px solid #F3F4F6',
                                        transition: 'all 0.2s ease',
                                        animation: isAnimating
                                            ? `guideStepIn 0.3s ease-out ${i * 0.08}s both`
                                            : undefined,
                                    }}
                                >
                                    <div style={{
                                        fontSize: '24px',
                                        marginBottom: '10px',
                                    }}>
                                        {step.icon}
                                    </div>
                                    <div style={{
                                        fontSize: '13px',
                                        fontWeight: 700,
                                        color: '#1F2937',
                                        marginBottom: '6px',
                                        letterSpacing: '-0.1px',
                                    }}>
                                        {step.title}
                                    </div>
                                    <div style={{
                                        fontSize: '12px',
                                        color: '#6B7280',
                                        lineHeight: '1.5',
                                    }}>
                                        {step.description}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Pro Tip */}
                        {config.proTip && (
                            <div style={{
                                display: 'flex',
                                gap: '12px',
                                alignItems: 'flex-start',
                                padding: '14px 16px',
                                borderRadius: '10px',
                                background: `${config.accentColor}06`,
                                border: `1px solid ${config.accentColor}15`,
                                marginBottom: '16px',
                            }}>
                                <Sparkles size={16} style={{ color: config.accentColor, flexShrink: 0, marginTop: '2px' }} />
                                <div>
                                    <div style={{
                                        fontSize: '12px',
                                        fontWeight: 700,
                                        color: config.accentColor,
                                        marginBottom: '4px',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.3px',
                                    }}>
                                        Pro Tip
                                    </div>
                                    <div style={{
                                        fontSize: '13px',
                                        color: '#4B5563',
                                        lineHeight: '1.6',
                                    }}>
                                        {config.proTip}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Dismiss */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'flex-end',
                            gap: '8px',
                        }}>
                            <button
                                onClick={(e) => { e.stopPropagation(); handleDismiss(); }}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '6px 14px',
                                    borderRadius: '8px',
                                    border: '1px solid #E5E7EB',
                                    background: 'white',
                                    color: '#9CA3AF',
                                    fontSize: '12px',
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.borderColor = '#D1D5DB';
                                    e.currentTarget.style.color = '#6B7280';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.borderColor = '#E5E7EB';
                                    e.currentTarget.style.color = '#9CA3AF';
                                }}
                            >
                                <X size={12} />
                                Entendido, no mostrar de nuevo
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Animations */}
            <style>{`
        @keyframes guideSlideDown {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes guideStepIn {
          from {
            opacity: 0;
            transform: translateY(8px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
        </>
    );
};
