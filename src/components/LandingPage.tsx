import React from 'react'
import { Target, Route, BarChart3, Columns3, FolderKanban, BookOpen, ArrowDown } from 'lucide-react'

interface LandingPageProps {
    onLogin: () => void
}

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
                                <path
                                    d="M13 2L4 14h6l-1 8 9-12h-6l1-8z"
                                    fill="#4F46E5"
                                />
                            </svg>
                            <span>Growth Hub</span>
                        </div>
                        <button className="ln-nav-btn" onClick={onLogin}>
                            Iniciar sesión
                        </button>
                    </div>
                </nav>

                {/* ── Hero ── */}
                <header className="ln-hero">
                    <div className="ln-wrap">
                        <p className="ln-eyebrow"><i className="ln-rule" />Plataforma de growth</p>
                        <h1 className="ln-h1">
                            Del caos a la claridad en tu
                            estrategia de <em>crecimiento</em>.
                        </h1>
                        <p className="ln-lead">
                            Diseña hipótesis, prioriza con ICE scoring, ejecuta experimentos y
                            documenta los aprendizajes clave. Un solo lugar para el trabajo de
                            tu equipo de growth.
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
                </header>

                {/* ── Problema ── */}
                <section className="ln-section">
                    <div className="ln-wrap">
                        <p className="ln-eyebrow"><i className="ln-rule" />El problema</p>
                        <h2 className="ln-h2">Sin un sistema, el crecimiento es caótico.</h2>
                        <div className="ln-problems">
                            <div className="ln-problem">
                                <h3>Experimentos en spreadsheets</h3>
                                <p>Hipótesis perdidas en hojas de cálculo, sin contexto ni
                                resultados trazables. El conocimiento se pierde en cada iteración.</p>
                            </div>
                            <div className="ln-problem">
                                <h3>Sin alineación estratégica</h3>
                                <p>Cada experimento desconectado del objetivo de negocio, sin
                                visibilidad de la cascada North Star, objetivos y estrategias.</p>
                            </div>
                            <div className="ln-problem">
                                <h3>Priorización por intuición</h3>
                                <p>Sin un marco objetivo para decidir qué probar primero. Las
                                decisiones se toman por intuición, no por datos.</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── Metodología ── */}
                <section className="ln-section ln-section-alt" id="metodologia">
                    <div className="ln-wrap">
                        <p className="ln-eyebrow"><i className="ln-rule" />Metodología</p>
                        <h2 className="ln-h2">Un proceso de tres fases.</h2>
                        <p className="ln-section-lead">
                            Un flujo estructurado que va del diseño estratégico a la ejecución
                            ágil de experimentos.
                        </p>
                        <div className="ln-phases">
                            {PHASES.map(p => (
                                <article key={p.n} className="ln-phase">
                                    <span className="ln-phase-n">{p.n}</span>
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
                <section className="ln-section">
                    <div className="ln-wrap">
                        <p className="ln-eyebrow"><i className="ln-rule" />Pirate metrics</p>
                        <h2 className="ln-h2">El funnel AARRR, integrado.</h2>
                        <p className="ln-section-lead">
                            Cada experimento se clasifica por etapa del funnel: dónde inviertes
                            esfuerzo y dónde están las oportunidades.
                        </p>
                        <div className="ln-funnel">
                            {FUNNEL.map(s => (
                                <div key={s.n} className="ln-funnel-stage">
                                    <span className="ln-funnel-n">{s.n}</span>
                                    <h3>{s.name}</h3>
                                    <p>{s.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ── Funcionalidades ── */}
                <section className="ln-section ln-section-alt">
                    <div className="ln-wrap">
                        <p className="ln-eyebrow"><i className="ln-rule" />Funcionalidades</p>
                        <h2 className="ln-h2">Todo lo que el equipo necesita.</h2>
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
                    <div className="ln-wrap">
                        <h2>Empieza a experimentar con metodología.</h2>
                        <p>
                            Deja de adivinar. Toma decisiones de crecimiento basadas en datos y
                            marcos probados.
                        </p>
                        <button className="ln-btn ln-btn-light" onClick={onLogin}>
                            Entrar a la plataforma
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
    .ln-nav-btn {
        font-family: inherit; font-size: 0.875rem; font-weight: 500;
        color: var(--ink); background: none; border: none; cursor: pointer;
        padding: 8px 4px; border-bottom: 1px solid var(--ink);
        transition: opacity 0.15s ease;
    }
    .ln-nav-btn:hover { opacity: 0.55; }

    /* ── Shared type ── */
    .ln-eyebrow {
        display: flex; align-items: center; gap: 12px;
        font-size: 0.72rem; font-weight: 600; letter-spacing: 0.16em;
        text-transform: uppercase; color: var(--muted); margin-bottom: 28px;
    }
    .ln-rule { display: block; width: 28px; height: 1px; background: var(--ink); opacity: 0.55; }
    .ln-h1 {
        font-family: 'Space Grotesk', sans-serif;
        font-size: clamp(2.5rem, 5.4vw, 4.15rem); font-weight: 500;
        line-height: 1.06; letter-spacing: -0.035em; max-width: 16ch;
    }
    .ln-h1 em { font-style: italic; font-weight: 500; }
    .ln-h2 {
        font-family: 'Space Grotesk', sans-serif;
        font-size: clamp(1.85rem, 3.3vw, 2.7rem); font-weight: 500;
        line-height: 1.12; letter-spacing: -0.03em; max-width: 20ch;
    }
    .ln-lead {
        font-size: 1.12rem; color: var(--ink-soft); line-height: 1.62;
        max-width: 52ch; margin-top: 28px;
    }
    .ln-section-lead {
        font-size: 1.02rem; color: var(--muted); line-height: 1.6;
        max-width: 56ch; margin-top: 18px;
    }

    /* ── Hero ── */
    .ln-hero { padding: 116px 0 124px; }
    .ln-hero-actions {
        display: flex; align-items: center; gap: 28px; margin-top: 40px;
        flex-wrap: wrap;
    }
    .ln-btn {
        font-family: inherit; font-size: 0.95rem; font-weight: 500;
        padding: 14px 28px; border: 1px solid transparent; cursor: pointer;
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
        text-decoration: none; transition: opacity 0.15s ease;
    }
    .ln-link svg { transition: transform 0.2s ease; }
    .ln-link:hover svg { transform: translateY(3px); }

    /* ── Sections ── */
    .ln-section { padding: 104px 0; border-top: 1px solid var(--line); }
    .ln-section-alt { background: var(--bg-alt); }

    /* ── Problema ── */
    .ln-problems {
        display: grid; grid-template-columns: repeat(3, 1fr);
        gap: 1px; background: var(--line); border: 1px solid var(--line);
        margin-top: 52px;
    }
    .ln-problem { background: var(--bg); padding: 36px 32px; }
    .ln-problem h3 {
        font-family: 'Space Grotesk', sans-serif;
        font-size: 1.08rem; font-weight: 600; letter-spacing: -0.01em;
        margin-bottom: 12px;
    }
    .ln-problem p { font-size: 0.94rem; color: var(--muted); line-height: 1.62; }
    .ln-section-alt .ln-problem { background: var(--bg-alt); }

    /* ── Fases ── */
    .ln-phases {
        display: grid; grid-template-columns: repeat(3, 1fr);
        gap: 40px; margin-top: 56px;
    }
    .ln-phase { padding-top: 24px; border-top: 1.5px solid var(--ink); }
    .ln-phase-n {
        font-family: 'Space Grotesk', sans-serif;
        font-size: 0.95rem; font-weight: 600; color: var(--muted);
    }
    .ln-phase-kicker {
        display: block; margin-top: 18px;
        font-size: 0.7rem; font-weight: 600; letter-spacing: 0.14em;
        text-transform: uppercase; color: var(--accent);
    }
    .ln-phase h3 {
        font-family: 'Space Grotesk', sans-serif;
        font-size: 1.5rem; font-weight: 500; letter-spacing: -0.02em;
        margin: 8px 0 14px;
    }
    .ln-phase p { font-size: 0.95rem; color: var(--muted); line-height: 1.62; }

    /* ── ICE ── */
    .ln-ice { margin-top: 72px; padding-top: 40px; border-top: 1px solid var(--line); }
    .ln-ice-label {
        font-size: 0.72rem; font-weight: 600; letter-spacing: 0.14em;
        text-transform: uppercase; color: var(--muted); margin-bottom: 24px;
    }
    .ln-ice-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 36px; }
    .ln-ice-item { display: flex; gap: 16px; align-items: flex-start; }
    .ln-ice-letter {
        font-family: 'Space Grotesk', sans-serif;
        font-size: 1.7rem; font-weight: 500; line-height: 1;
        color: var(--ink); flex-shrink: 0;
    }
    .ln-ice-item strong {
        display: block; font-size: 0.95rem; font-weight: 600; margin-bottom: 3px;
    }
    .ln-ice-item span { font-size: 0.86rem; color: var(--muted); line-height: 1.5; }

    /* ── Funnel ── */
    .ln-funnel {
        display: grid; grid-template-columns: repeat(5, 1fr);
        gap: 1px; background: var(--line); border: 1px solid var(--line);
        margin-top: 52px;
    }
    .ln-funnel-stage { background: var(--bg); padding: 30px 22px; }
    .ln-funnel-n {
        font-family: 'Space Grotesk', sans-serif;
        font-size: 0.82rem; font-weight: 600; color: var(--muted);
    }
    .ln-funnel-stage h3 {
        font-family: 'Space Grotesk', sans-serif;
        font-size: 1.05rem; font-weight: 600; letter-spacing: -0.01em;
        margin: 14px 0 6px;
    }
    .ln-funnel-stage p { font-size: 0.83rem; color: var(--muted); line-height: 1.5; }

    /* ── Funcionalidades ── */
    .ln-features {
        display: grid; grid-template-columns: repeat(3, 1fr);
        gap: 1px; background: var(--line); border: 1px solid var(--line);
        margin-top: 52px;
    }
    .ln-feature { background: var(--bg-alt); padding: 36px 30px; }
    .ln-feature-icon { color: var(--ink); margin-bottom: 20px; display: block; }
    .ln-feature h3 {
        font-family: 'Space Grotesk', sans-serif;
        font-size: 1.08rem; font-weight: 600; letter-spacing: -0.01em;
        margin-bottom: 10px;
    }
    .ln-feature p { font-size: 0.92rem; color: var(--muted); line-height: 1.6; }

    /* ── Cierre ── */
    .ln-cta { background: var(--ink); color: #fff; padding: 104px 0; }
    .ln-cta h2 {
        font-family: 'Space Grotesk', sans-serif;
        font-size: clamp(1.9rem, 3.4vw, 2.8rem); font-weight: 500;
        line-height: 1.12; letter-spacing: -0.03em; max-width: 18ch;
    }
    .ln-cta p {
        font-size: 1.05rem; color: rgba(255,255,255,0.62);
        max-width: 48ch; margin: 22px 0 36px; line-height: 1.6;
    }

    /* ── Footer ── */
    .ln-footer { border-top: 1px solid var(--line); padding: 36px 0; }
    .ln-footer-inner {
        display: flex; align-items: center; justify-content: space-between;
        flex-wrap: wrap; gap: 12px;
    }
    .ln-footer p { font-size: 0.84rem; color: var(--muted); }

    /* ── Responsive ── */
    @media (max-width: 860px) {
        .ln-wrap { padding: 0 22px; }
        .ln-hero { padding: 80px 0 84px; }
        .ln-section { padding: 72px 0; }
        .ln-cta { padding: 80px 0; }
        .ln-problems, .ln-phases, .ln-ice-row { grid-template-columns: 1fr; }
        .ln-phases { gap: 0; }
        .ln-phase { margin-top: 0; }
        .ln-features { grid-template-columns: 1fr; }
        .ln-funnel { grid-template-columns: 1fr; }
        .ln-ice-row { gap: 24px; }
    }
`
