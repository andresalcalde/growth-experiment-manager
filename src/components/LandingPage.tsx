import React from 'react'
import { Target, Route, BarChart3, Columns3, FolderKanban, BookOpen, ArrowDown, ArrowRight } from 'lucide-react'

interface LandingPageProps {
    onLogin: () => void
}

const STATS = [
    { v: '03', l: 'Fases del proceso' },
    { v: '05', l: 'Etapas del funnel' },
    { v: 'ICE', l: 'Framework de priorización' },
    { v: '∞', l: 'Proyectos y experimentos' },
]

const PROBLEMS = [
    {
        n: '01', title: 'Experimentos en spreadsheets',
        desc: 'Hipótesis perdidas en hojas de cálculo, sin contexto ni resultados trazables. El conocimiento se pierde en cada iteración.',
    },
    {
        n: '02', title: 'Sin alineación estratégica',
        desc: 'Cada experimento desconectado del objetivo de negocio, sin visibilidad de la cascada North Star, objetivos y estrategias.',
    },
    {
        n: '03', title: 'Priorización por intuición',
        desc: 'Sin un marco objetivo para decidir qué probar primero. Las decisiones se toman por intuición, no por datos.',
    },
]

const PHASES = [
    {
        n: '01', kicker: 'Roadmap', name: 'Design',
        desc: 'Define tu North Star Metric, establece objetivos y diseña estrategias. Una cascada clara desde la métrica clave hasta las tácticas ejecutables.',
    },
    {
        n: '02', kicker: 'Backlog', name: 'Explore',
        desc: 'Prioriza el backlog con ICE scoring. Visualiza los experimentos en tabla, filtra por etapa del funnel y ordena por impacto.',
    },
    {
        n: '03', kicker: 'Kanban', name: 'Be Agile',
        desc: 'Mueve experimentos por las fases —Prioritized, Building, Live Testing, Analysis— con un tablero de arrastre directo.',
    },
]

const FUNNEL = [
    { n: '01', name: 'Acquisition', desc: 'Cómo atraes usuarios' },
    { n: '02', name: 'Activation', desc: 'Si llegan al "aha moment"' },
    { n: '03', name: 'Retention', desc: 'Si los usuarios regresan' },
    { n: '04', name: 'Referral', desc: 'Si recomiendan el producto' },
    { n: '05', name: 'Revenue', desc: 'Cómo monetizas' },
]

const FEATURES = [
    { Icon: Target, name: 'North Star Metric', desc: 'Define y monitorea tu métrica estrella con progreso en tiempo real y targets configurables.' },
    { Icon: Route, name: 'Roadmap estratégico', desc: 'Cascada de Objetivos, Estrategias y Experimentos. Cada nivel conecta con el anterior.' },
    { Icon: BarChart3, name: 'Backlog con ICE', desc: 'Tabla con edición inline de Impact, Confidence y Ease. Priorización objetiva y automática.' },
    { Icon: Columns3, name: 'Kanban operativo', desc: 'Tablero para mover experimentos entre etapas con arrastre directo.' },
    { Icon: FolderKanban, name: 'Multi-proyecto', desc: 'Gestiona varios proyectos desde un portfolio, cada uno con su equipo y métrica.' },
    { Icon: BookOpen, name: 'Knowledge Library', desc: 'Documenta hipótesis, criterios de éxito, aprendizajes y pruebas visuales del equipo.' },
]

const PREVIEW_BOARD = [
    { label: 'Building', count: 2, cards: [{ t: 'Checkout en 2 pasos', ice: 88 }, { t: 'Hero — copy A/B', ice: 84 }] },
    { label: 'Live Testing', count: 1, cards: [{ t: 'Secuencia de onboarding', ice: 91 }] },
    { label: 'Analysis', count: 1, cards: [{ t: 'Rediseño de pricing', ice: 72 }] },
]

export const LandingPage: React.FC<LandingPageProps> = ({ onLogin }) => {
    return (
        <>
            <style>{landingStyles}</style>
            <div className="landing">
                {/* ── Nav ── */}
                <nav className="ln-nav">
                    <div className="ln-wrap ln-nav-inner">
                        <div className="ln-brand">
                            <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" fill="#4F46E5" />
                            </svg>
                            <span>Growth Hub</span>
                        </div>
                        <div className="ln-nav-links">
                            <a href="#metodologia">Metodología</a>
                            <a href="#funnel">Funnel</a>
                            <a href="#features">Funcionalidades</a>
                        </div>
                        <button className="ln-nav-btn" onClick={onLogin}>
                            Iniciar sesión
                        </button>
                    </div>
                </nav>

                {/* ── Hero ── */}
                <header className="ln-hero">
                    <div className="ln-wrap ln-hero-grid">
                        <div className="ln-hero-copy">
                            <p className="ln-eyebrow"><i className="ln-rule" />Plataforma de growth</p>
                            <h1 className="ln-h1">
                                Del caos a la claridad en tu
                                estrategia de <em>crecimiento</em>.
                            </h1>
                            <p className="ln-lead">
                                Diseña hipótesis, prioriza con ICE scoring, ejecuta experimentos
                                y documenta los aprendizajes clave. Un solo lugar para el trabajo
                                de tu equipo de growth.
                            </p>
                            <div className="ln-hero-actions">
                                <button className="ln-btn ln-btn-solid" onClick={onLogin}>
                                    Entrar a la plataforma
                                </button>
                                <a href="#metodologia" className="ln-link">
                                    Ver la metodología <ArrowDown size={15} />
                                </a>
                            </div>
                        </div>

                        {/* Product preview */}
                        <div className="ln-preview" aria-hidden="true">
                            <div className="ln-preview-bar">
                                <span className="ln-preview-mark" />
                                <span className="ln-preview-name">Acquisition Q2</span>
                                <span className="ln-preview-tabs">
                                    <span>Explore</span>
                                    <span className="on">Be Agile</span>
                                    <span>Learning</span>
                                </span>
                            </div>
                            <div className="ln-preview-body">
                                <div className="ln-preview-ns">
                                    <div className="ln-preview-ns-head">
                                        <span>North Star · Revenue</span>
                                        <strong>$1.24M</strong>
                                    </div>
                                    <div className="ln-preview-track"><i style={{ width: '64%' }} /></div>
                                </div>
                                <div className="ln-preview-board">
                                    {PREVIEW_BOARD.map(col => (
                                        <div key={col.label} className="ln-preview-col">
                                            <div className="ln-preview-colhead">
                                                <span>{col.label}</span>
                                                <span className="ln-preview-count">{col.count}</span>
                                            </div>
                                            {col.cards.map(c => (
                                                <div key={c.t} className="ln-preview-card">
                                                    <span>{c.t}</span>
                                                    <em>ICE {c.ice}</em>
                                                </div>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                {/* ── Stats band ── */}
                <section className="ln-stats">
                    <div className="ln-wrap ln-stats-grid">
                        {STATS.map(s => (
                            <div key={s.l} className="ln-stat">
                                <span className="ln-stat-v">{s.v}</span>
                                <span className="ln-stat-l">{s.l}</span>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ── Problema ── */}
                <section className="ln-section">
                    <div className="ln-wrap">
                        <div className="ln-section-head">
                            <p className="ln-eyebrow"><i className="ln-rule" />El problema</p>
                            <h2 className="ln-h2">Sin un sistema, el crecimiento es caótico.</h2>
                        </div>
                        <div className="ln-problems">
                            {PROBLEMS.map(p => (
                                <article key={p.n} className="ln-problem">
                                    <span className="ln-problem-n">{p.n}</span>
                                    <h3>{p.title}</h3>
                                    <p>{p.desc}</p>
                                </article>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── Metodología ── */}
                <section className="ln-section ln-section-alt" id="metodologia">
                    <div className="ln-wrap">
                        <div className="ln-section-head">
                            <p className="ln-eyebrow"><i className="ln-rule" />Metodología</p>
                            <h2 className="ln-h2">Un proceso de tres fases.</h2>
                            <p className="ln-section-lead">
                                Un flujo estructurado que va del diseño estratégico a la ejecución
                                ágil de experimentos.
                            </p>
                        </div>
                        <div className="ln-phases">
                            {PHASES.map((p, i) => (
                                <article key={p.n} className="ln-phase">
                                    <div className="ln-phase-top">
                                        <span className="ln-phase-n">{p.n}</span>
                                        {i < PHASES.length - 1 && <ArrowRight size={16} className="ln-phase-arrow" />}
                                    </div>
                                    <span className="ln-phase-kicker">{p.kicker}</span>
                                    <h3>{p.name}</h3>
                                    <p>{p.desc}</p>
                                </article>
                            ))}
                        </div>

                        <div className="ln-ice">
                            <p className="ln-ice-label">Priorización ICE</p>
                            <div className="ln-ice-row">
                                <div className="ln-ice-item">
                                    <span className="ln-ice-letter">I</span>
                                    <div>
                                        <strong>Impact</strong>
                                        <span>Qué tan grande es el efecto esperado</span>
                                    </div>
                                </div>
                                <div className="ln-ice-item">
                                    <span className="ln-ice-letter">C</span>
                                    <div>
                                        <strong>Confidence</strong>
                                        <span>Qué tan seguro estás de la hipótesis</span>
                                    </div>
                                </div>
                                <div className="ln-ice-item">
                                    <span className="ln-ice-letter">E</span>
                                    <div>
                                        <strong>Ease</strong>
                                        <span>Qué tan fácil es de implementar</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── Funnel ── */}
                <section className="ln-section" id="funnel">
                    <div className="ln-wrap">
                        <div className="ln-section-head">
                            <p className="ln-eyebrow"><i className="ln-rule" />Pirate metrics</p>
                            <h2 className="ln-h2">El funnel AARRR, integrado.</h2>
                            <p className="ln-section-lead">
                                Cada experimento se clasifica por etapa del funnel: dónde inviertes
                                esfuerzo y dónde están las oportunidades.
                            </p>
                        </div>
                        <div className="ln-funnel">
                            <div className="ln-funnel-line" />
                            {FUNNEL.map(s => (
                                <div key={s.n} className="ln-funnel-stage">
                                    <span className="ln-funnel-node">{s.n}</span>
                                    <h3>{s.name}</h3>
                                    <p>{s.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── Funcionalidades ── */}
                <section className="ln-section ln-section-alt" id="features">
                    <div className="ln-wrap">
                        <div className="ln-section-head">
                            <p className="ln-eyebrow"><i className="ln-rule" />Funcionalidades</p>
                            <h2 className="ln-h2">Todo lo que el equipo necesita.</h2>
                        </div>
                        <div className="ln-features">
                            {FEATURES.map(({ Icon, name, desc }) => (
                                <article key={name} className="ln-feature">
                                    <Icon size={20} strokeWidth={1.6} className="ln-feature-icon" />
                                    <h3>{name}</h3>
                                    <p>{desc}</p>
                                </article>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── Cierre ── */}
                <section className="ln-cta">
                    <div className="ln-wrap ln-cta-inner">
                        <div>
                            <h2>Empieza a experimentar con metodología.</h2>
                            <p>
                                Deja de adivinar. Toma decisiones de crecimiento basadas en datos
                                y marcos probados.
                            </p>
                        </div>
                        <button className="ln-btn ln-btn-light" onClick={onLogin}>
                            Entrar a la plataforma <ArrowRight size={16} />
                        </button>
                    </div>
                </section>

                {/* ── Footer ── */}
                <footer className="ln-footer">
                    <div className="ln-wrap ln-footer-inner">
                        <div className="ln-brand">
                            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" fill="#4F46E5" />
                            </svg>
                            <span>Growth Hub</span>
                        </div>
                        <p>© 2026 Growth Hub — Laboratorio Polanco</p>
                    </div>
                </footer>
            </div>
        </>
    )
}

const landingStyles = `
    .landing {
        --bg: #ffffff;
        --bg-alt: #f6f5f1;
        --ink: #111114;
        --ink-soft: #3d3d42;
        --muted: #74747c;
        --line: rgba(17,17,20,0.12);
        --line-soft: rgba(17,17,20,0.08);
        --accent: #4f46e5;
        background: var(--bg);
        color: var(--ink);
        font-family: 'Inter', -apple-system, sans-serif;
        line-height: 1.6;
        -webkit-font-smoothing: antialiased;
        overflow-x: hidden;
    }
    .landing * { margin: 0; padding: 0; box-sizing: border-box; }

    .ln-wrap { max-width: 1140px; margin: 0 auto; padding: 0 32px; }

    /* ── Nav ── */
    .ln-nav {
        position: sticky; top: 0; z-index: 50;
        background: rgba(255,255,255,0.85);
        backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
        border-bottom: 1px solid var(--line);
    }
    .ln-nav-inner {
        display: flex; align-items: center; justify-content: space-between;
        height: 68px;
    }
    .ln-brand {
        display: flex; align-items: center; gap: 9px;
        font-family: 'Space Grotesk', sans-serif;
        font-weight: 600; font-size: 1.05rem; letter-spacing: -0.01em;
    }
    .ln-nav-links { display: flex; gap: 30px; }
    .ln-nav-links a {
        font-size: 0.875rem; font-weight: 500; color: var(--ink-soft);
        text-decoration: none; transition: color 0.15s ease;
    }
    .ln-nav-links a:hover { color: var(--ink); }
    .ln-nav-btn {
        font-family: inherit; font-size: 0.875rem; font-weight: 500;
        color: #fff; background: var(--ink); border: none; cursor: pointer;
        padding: 9px 18px; border-radius: 7px; transition: opacity 0.15s ease;
    }
    .ln-nav-btn:hover { opacity: 0.86; }

    /* ── Shared type ── */
    .ln-eyebrow {
        display: flex; align-items: center; gap: 12px;
        font-size: 0.72rem; font-weight: 600; letter-spacing: 0.16em;
        text-transform: uppercase; color: var(--muted); margin-bottom: 22px;
    }
    .ln-rule { display: block; width: 28px; height: 1px; background: var(--ink); opacity: 0.55; }
    .ln-h1 {
        font-family: 'Space Grotesk', sans-serif;
        font-size: clamp(2.3rem, 3.9vw, 3.5rem); font-weight: 500;
        line-height: 1.07; letter-spacing: -0.035em;
    }
    .ln-h1 em { font-style: italic; font-weight: 500; }
    .ln-h2 {
        font-family: 'Space Grotesk', sans-serif;
        font-size: clamp(1.85rem, 3.2vw, 2.6rem); font-weight: 500;
        line-height: 1.12; letter-spacing: -0.03em; max-width: 20ch;
    }
    .ln-lead {
        font-size: 1.08rem; color: var(--ink-soft); line-height: 1.62;
        max-width: 46ch; margin-top: 24px;
    }
    .ln-section-head { margin-bottom: 52px; }
    .ln-section-lead {
        font-size: 1.02rem; color: var(--muted); line-height: 1.6;
        max-width: 56ch; margin-top: 16px;
    }

    /* ── Hero ── */
    .ln-hero { padding: 92px 0 100px; }
    .ln-hero-grid {
        display: grid; grid-template-columns: 1fr 1.04fr;
        gap: 56px; align-items: center;
    }
    .ln-hero-actions {
        display: flex; align-items: center; gap: 26px; margin-top: 36px;
        flex-wrap: wrap;
    }
    .ln-btn {
        display: inline-flex; align-items: center; gap: 9px;
        font-family: inherit; font-size: 0.95rem; font-weight: 500;
        padding: 14px 26px; border: 1px solid transparent; cursor: pointer;
        border-radius: 7px; transition: opacity 0.15s ease, transform 0.15s ease;
    }
    .ln-btn:hover { transform: translateY(-1px); }
    .ln-btn-solid { background: var(--ink); color: #fff; }
    .ln-btn-solid:hover { opacity: 0.86; }
    .ln-btn-light { background: #fff; color: var(--ink); }
    .ln-btn-light:hover { opacity: 0.9; }
    .ln-link {
        display: inline-flex; align-items: center; gap: 7px;
        font-size: 0.95rem; font-weight: 500; color: var(--ink);
        text-decoration: none;
    }
    .ln-link svg { transition: transform 0.2s ease; }
    .ln-link:hover svg { transform: translateY(3px); }

    /* ── Product preview ── */
    .ln-preview {
        background: #fff; border: 1px solid var(--line);
        border-radius: 13px; overflow: hidden;
        box-shadow: 0 32px 64px -28px rgba(17,17,20,0.28);
    }
    .ln-preview-bar {
        display: flex; align-items: center; gap: 12px;
        padding: 13px 18px; border-bottom: 1px solid var(--line-soft);
    }
    .ln-preview-mark {
        width: 13px; height: 13px; border-radius: 4px;
        background: var(--accent); flex-shrink: 0;
    }
    .ln-preview-name {
        font-family: 'Space Grotesk', sans-serif;
        font-weight: 600; font-size: 0.86rem;
    }
    .ln-preview-tabs { display: flex; gap: 14px; margin-left: auto; }
    .ln-preview-tabs span {
        font-size: 0.72rem; font-weight: 500; color: var(--muted);
    }
    .ln-preview-tabs .on {
        color: var(--ink); border-bottom: 1.5px solid var(--accent); padding-bottom: 2px;
    }
    .ln-preview-body { padding: 18px; background: #faf9f6; }
    .ln-preview-ns {
        background: #fff; border: 1px solid var(--line-soft);
        border-radius: 9px; padding: 13px 15px; margin-bottom: 14px;
    }
    .ln-preview-ns-head {
        display: flex; align-items: baseline; justify-content: space-between;
        margin-bottom: 9px;
    }
    .ln-preview-ns-head span {
        font-size: 0.68rem; font-weight: 600; letter-spacing: 0.08em;
        text-transform: uppercase; color: var(--muted);
    }
    .ln-preview-ns-head strong {
        font-family: 'Space Grotesk', sans-serif;
        font-size: 1.05rem; font-weight: 600;
    }
    .ln-preview-track {
        height: 5px; background: rgba(17,17,20,0.07); border-radius: 3px;
    }
    .ln-preview-track i { display: block; height: 100%; background: var(--accent); border-radius: 3px; }
    .ln-preview-board { display: grid; grid-template-columns: repeat(3, 1fr); gap: 9px; }
    .ln-preview-colhead {
        display: flex; align-items: center; justify-content: space-between;
        margin-bottom: 8px;
    }
    .ln-preview-colhead span:first-child {
        font-size: 0.66rem; font-weight: 700; letter-spacing: 0.06em;
        text-transform: uppercase; color: var(--muted);
    }
    .ln-preview-count {
        font-size: 0.62rem; font-weight: 700; color: var(--muted);
        background: rgba(17,17,20,0.06); border-radius: 4px; padding: 1px 5px;
    }
    .ln-preview-card {
        background: #fff; border: 1px solid var(--line-soft);
        border-radius: 7px; padding: 9px 10px; margin-bottom: 7px;
        display: flex; flex-direction: column; gap: 7px;
    }
    .ln-preview-card span {
        font-size: 0.72rem; font-weight: 500; line-height: 1.35; color: var(--ink);
    }
    .ln-preview-card em {
        font-style: normal; align-self: flex-start;
        font-size: 0.6rem; font-weight: 700; letter-spacing: 0.03em;
        color: var(--accent); background: rgba(79,70,229,0.09);
        border-radius: 4px; padding: 2px 6px;
    }

    /* ── Stats band ── */
    .ln-stats { background: var(--ink); color: #fff; }
    .ln-stats-grid {
        display: grid; grid-template-columns: repeat(4, 1fr);
    }
    .ln-stat {
        padding: 44px 28px 44px 0; border-left: 1px solid rgba(255,255,255,0.13);
        padding-left: 28px;
    }
    .ln-stat:first-child { border-left: none; padding-left: 0; }
    .ln-stat-v {
        display: block; font-family: 'Space Grotesk', sans-serif;
        font-size: 2.6rem; font-weight: 500; letter-spacing: -0.03em; line-height: 1;
    }
    .ln-stat-l {
        display: block; margin-top: 10px;
        font-size: 0.84rem; color: rgba(255,255,255,0.55); line-height: 1.45;
    }

    /* ── Sections ── */
    .ln-section { padding: 104px 0; border-top: 1px solid var(--line); }
    .ln-section:first-of-type { border-top: none; }
    .ln-section-alt { background: var(--bg-alt); }

    /* ── Problema ── */
    .ln-problems {
        display: grid; grid-template-columns: repeat(3, 1fr);
        gap: 1px; background: var(--line); border: 1px solid var(--line);
    }
    .ln-problem { background: var(--bg); padding: 34px 30px; }
    .ln-problem-n {
        font-family: 'Space Grotesk', sans-serif;
        font-size: 0.82rem; font-weight: 600; color: var(--accent);
    }
    .ln-problem h3 {
        font-family: 'Space Grotesk', sans-serif;
        font-size: 1.12rem; font-weight: 600; letter-spacing: -0.01em;
        margin: 14px 0 11px;
    }
    .ln-problem p { font-size: 0.94rem; color: var(--muted); line-height: 1.62; }

    /* ── Fases ── */
    .ln-phases {
        display: grid; grid-template-columns: repeat(3, 1fr);
        gap: 32px;
    }
    .ln-phase { padding-top: 22px; border-top: 1.5px solid var(--ink); }
    .ln-phase-top {
        display: flex; align-items: center; justify-content: space-between;
    }
    .ln-phase-n {
        font-family: 'Space Grotesk', sans-serif;
        font-size: 1rem; font-weight: 600; color: var(--muted);
    }
    .ln-phase-arrow { color: rgba(17,17,20,0.25); }
    .ln-phase-kicker {
        display: block; margin-top: 20px;
        font-size: 0.7rem; font-weight: 600; letter-spacing: 0.14em;
        text-transform: uppercase; color: var(--accent);
    }
    .ln-phase h3 {
        font-family: 'Space Grotesk', sans-serif;
        font-size: 1.55rem; font-weight: 500; letter-spacing: -0.02em;
        margin: 8px 0 14px;
    }
    .ln-phase p { font-size: 0.95rem; color: var(--muted); line-height: 1.62; }

    /* ── ICE ── */
    .ln-ice { margin-top: 64px; padding-top: 40px; border-top: 1px solid var(--line); }
    .ln-ice-label {
        font-size: 0.72rem; font-weight: 600; letter-spacing: 0.14em;
        text-transform: uppercase; color: var(--muted); margin-bottom: 24px;
    }
    .ln-ice-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 36px; }
    .ln-ice-item { display: flex; gap: 16px; align-items: flex-start; }
    .ln-ice-letter {
        font-family: 'Space Grotesk', sans-serif;
        font-size: 1.7rem; font-weight: 500; line-height: 1;
        color: var(--accent); flex-shrink: 0;
    }
    .ln-ice-item strong {
        display: block; font-size: 0.95rem; font-weight: 600; margin-bottom: 3px;
    }
    .ln-ice-item span { font-size: 0.86rem; color: var(--muted); line-height: 1.5; }

    /* ── Funnel ── */
    .ln-funnel {
        display: grid; grid-template-columns: repeat(5, 1fr);
        gap: 14px; position: relative;
    }
    .ln-funnel-line {
        position: absolute; top: 17px; left: 5%; right: 5%;
        height: 1px; background: var(--line);
    }
    .ln-funnel-stage { position: relative; }
    .ln-funnel-node {
        display: flex; align-items: center; justify-content: center;
        width: 34px; height: 34px; border-radius: 50%;
        background: var(--bg); border: 1px solid var(--line);
        font-family: 'Space Grotesk', sans-serif;
        font-size: 0.78rem; font-weight: 600; color: var(--ink);
        margin-bottom: 18px;
    }
    .ln-funnel-stage h3 {
        font-family: 'Space Grotesk', sans-serif;
        font-size: 1.05rem; font-weight: 600; letter-spacing: -0.01em;
        margin-bottom: 6px;
    }
    .ln-funnel-stage p { font-size: 0.85rem; color: var(--muted); line-height: 1.5; }

    /* ── Funcionalidades ── */
    .ln-features {
        display: grid; grid-template-columns: repeat(3, 1fr);
        gap: 1px; background: var(--line); border: 1px solid var(--line);
    }
    .ln-feature { background: var(--bg-alt); padding: 34px 30px; }
    .ln-feature-icon { color: var(--ink); margin-bottom: 18px; display: block; }
    .ln-feature h3 {
        font-family: 'Space Grotesk', sans-serif;
        font-size: 1.08rem; font-weight: 600; letter-spacing: -0.01em;
        margin-bottom: 10px;
    }
    .ln-feature p { font-size: 0.92rem; color: var(--muted); line-height: 1.6; }

    /* ── Cierre ── */
    .ln-cta { background: var(--ink); color: #fff; padding: 92px 0; }
    .ln-cta-inner {
        display: flex; align-items: center; justify-content: space-between;
        gap: 48px; flex-wrap: wrap;
    }
    .ln-cta h2 {
        font-family: 'Space Grotesk', sans-serif;
        font-size: clamp(1.8rem, 3vw, 2.5rem); font-weight: 500;
        line-height: 1.13; letter-spacing: -0.03em; max-width: 16ch;
    }
    .ln-cta p {
        font-size: 1.02rem; color: rgba(255,255,255,0.6);
        max-width: 42ch; margin-top: 16px; line-height: 1.6;
    }

    /* ── Footer ── */
    .ln-footer { border-top: 1px solid var(--line); padding: 34px 0; }
    .ln-footer-inner {
        display: flex; align-items: center; justify-content: space-between;
        flex-wrap: wrap; gap: 12px;
    }
    .ln-footer p { font-size: 0.84rem; color: var(--muted); }

    /* ── Responsive ── */
    @media (max-width: 940px) {
        .ln-hero-grid { grid-template-columns: 1fr; gap: 44px; }
        .ln-nav-links { display: none; }
    }
    @media (max-width: 760px) {
        .ln-wrap { padding: 0 22px; }
        .ln-hero { padding: 60px 0 72px; }
        .ln-section { padding: 68px 0; }
        .ln-cta { padding: 64px 0; }
        .ln-stats-grid { grid-template-columns: repeat(2, 1fr); }
        .ln-stat { padding: 30px 0 30px 24px; }
        .ln-stat:nth-child(odd) { border-left: none; padding-left: 0; }
        .ln-problems, .ln-phases, .ln-ice-row, .ln-features { grid-template-columns: 1fr; }
        .ln-phases { gap: 0; }
        .ln-funnel { grid-template-columns: 1fr 1fr; gap: 28px 14px; }
        .ln-funnel-line { display: none; }
        .ln-cta-inner { flex-direction: column; align-items: flex-start; }
    }
`
