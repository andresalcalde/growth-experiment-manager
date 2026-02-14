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
        subtitle: 'Your growth command center',
        description: 'This is your central dashboard showing all active projects. Each card represents a growth project with its North Star Metric progress, active experiments, and team activity.',
        steps: [
            { icon: '🎯', title: 'Select a Project', description: 'Click any project card to dive into its growth roadmap and experiments.' },
            { icon: '➕', title: 'Create New Project', description: 'Use the "New Project" button to start a fresh growth initiative with a defined North Star Metric.' },
            { icon: '📈', title: 'Monitor Progress', description: 'Each card shows real-time progress toward your North Star Metric target.' },
        ],
        proTip: 'Star your most important projects to keep them at the top. Think of each project as a growth "bet" your team is making.',
        accentColor: '#4F46E5',
        accentGradient: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
    },

    roadmap: {
        id: 'roadmap',
        emoji: '🗺️',
        title: '01. Design — Growth Roadmap',
        subtitle: 'Define your growth strategy',
        description: 'Design your growth engine using the Reforge framework: Start with your North Star Metric, then define Growth Objectives (levers) and Strategic Initiatives (actions) that will move it.',
        steps: [
            { icon: '⭐', title: 'Set Your North Star', description: 'Define the single most important metric that represents your company\'s core value delivery. Click the North Star card to edit it.' },
            { icon: '🎯', title: 'Add Growth Objectives', description: 'These are the high-impact "levers" that influence your North Star. Think of them as strategic focus areas (e.g., "Increase Conversion Rate", "Reduce Churn").' },
            { icon: '⚡', title: 'Define Initiatives', description: 'Under each objective, add specific actionable strategies — these are the concrete actions your team will take (e.g., "A/B Test Landing Page", "Email Onboarding Sequence").' },
        ],
        proTip: 'A good North Star has 3–5 Growth Objectives. Each Objective should have 2–4 Initiatives. This creates a focused, manageable growth roadmap.',
        accentColor: '#4F46E5',
        accentGradient: 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)',
    },

    table: {
        id: 'table',
        emoji: '🔬',
        title: '02. Explore — Experiment Backlog',
        subtitle: 'Prioritize your experiments scientifically',
        description: 'This is your experiment prioritization table. All experiments start here as "Ideas". Use ICE scoring (Impact × Confidence × Ease) to objectively rank which experiments to run first.',
        steps: [
            { icon: '💡', title: 'Add Experiment Ideas', description: 'Click "New Experiment" to add ideas. Include a clear hypothesis, the strategy it\'s linked to, and its funnel stage.' },
            { icon: '🎲', title: 'Score with ICE', description: 'Rate each experiment 1–10 on Impact, Confidence, and Ease. The ICE Score (I×C×E) automatically ranks them. Click any score cell to edit inline.' },
            { icon: '🚀', title: 'Promote to Committed', description: 'Change status from "Idea" → "Prioritized" to commit to running an experiment. It will then appear in the Be Agile board.' },
        ],
        proTip: 'Sort by ICE Score descending to see your highest-priority experiments first. Focus your team\'s bandwidth on the top 3–5 experiments at any time.',
        accentColor: '#0EA5E9',
        accentGradient: 'linear-gradient(135deg, #0EA5E9 0%, #38BDF8 100%)',
    },

    board: {
        id: 'board',
        emoji: '🏃',
        title: '03. Be Agile — Kanban Board',
        subtitle: 'Track committed experiments in real-time',
        description: 'This Kanban board shows only committed experiments (Prioritized → Live Testing → Analysis). Drag and drop cards to update their status as they progress through your growth sprint.',
        steps: [
            { icon: '📋', title: 'Prioritized', description: 'Experiments that are approved and ready to build. Your team should pick from here for the current sprint.' },
            { icon: '🔨', title: 'Building', description: 'Experiments currently being developed — creative assets, landing pages, technical implementation, etc.' },
            { icon: '🧪', title: 'Live Testing', description: 'Experiments that are live and collecting data. Monitor these actively and define success criteria.' },
            { icon: '📊', title: 'Analysis', description: 'Experiments where testing is complete. Analyze results and mark as Winner, Loser, or Inconclusive.' },
        ],
        proTip: 'When you move an experiment to "Finished", you\'ll be prompted to record Key Learnings. This builds your team\'s institutional knowledge over time.',
        accentColor: '#10B981',
        accentGradient: 'linear-gradient(135deg, #10B981 0%, #34D399 100%)',
    },

    library: {
        id: 'library',
        emoji: '📚',
        title: '04. Learning — Knowledge Library',
        subtitle: 'Your institutional growth memory',
        description: 'The Learning Library is where completed experiments live as "case studies". Each card captures the hypothesis, results, and key learnings — building your team\'s compounding growth knowledge.',
        steps: [
            { icon: '✅', title: 'Winners', description: 'Experiments that validated their hypothesis. These are proven playbooks to scale and replicate.' },
            { icon: '❌', title: 'Losers', description: 'Experiments that disproved their hypothesis. Equally valuable — they prevent repeating failed approaches.' },
            { icon: '🔍', title: 'Filter & Search', description: 'Use the filters to browse by outcome (Winners/Losers) or funnel stage (Acquisition, Activation, etc.).' },
        ],
        proTip: 'The most successful growth teams treat "losers" as some of their most valuable data. A failed experiment with a clear learning is worth more than a winner you can\'t explain.',
        accentColor: '#8B5CF6',
        accentGradient: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)',
    },

    settings: {
        id: 'settings',
        emoji: '⚙️',
        title: 'Settings — Team & Project Config',
        subtitle: 'Manage your workspace',
        description: 'Configure your team members, project access, and workspace settings. Team members added here will be available as experiment owners throughout the platform.',
        steps: [
            { icon: '👥', title: 'Team Members', description: 'Add and manage team members. Each member can be assigned as an experiment owner.' },
            { icon: '🔐', title: 'Project Access', description: 'Control which projects each team member can access and their role (Admin, Lead, Viewer).' },
            { icon: '🔄', title: 'Data Management', description: 'Reset or export your data as needed.' },
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
                title="Show section guide"
            >
                <HelpCircle size={14} />
                <span>How it works</span>
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
                    <span>Guide</span>
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
                                How it works
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
                                Got it, don't show again
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
