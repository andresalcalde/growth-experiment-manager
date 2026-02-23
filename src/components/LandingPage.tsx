import React from 'react'

interface LandingPageProps {
    onLogin: () => void
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLogin }) => {
    return (
        <>
            <style>{landingStyles}</style>
            <div className="landing-page">
                <div className="bg-grid" />
                <div className="bg-blob blob-1" />
                <div className="bg-blob blob-2" />
                <div className="bg-blob blob-3" />

                {/* Navigation */}
                <nav className="landing-nav">
                    <div className="nav-brand">
                        <div className="nav-logo">🧪</div>
                        Growth Experiment Manager
                    </div>
                    <button className="nav-btn" onClick={onLogin}>
                        Iniciar Sesión →
                    </button>
                </nav>

                {/* Hero */}
                <section className="hero">
                    <div className="l-container">
                        <div className="hero-badge">
                            <span className="dot" />
                            Plataforma de Growth · Metodología científica
                        </div>
                        <h1>
                            Del caos a la claridad<br />
                            en tu estrategia de<br />
                            <span className="gradient-text">crecimiento</span>
                        </h1>
                        <p className="hero-subtitle">
                            Diseña hipótesis, prioriza con ICE scoring, ejecuta experimentos y documenta aprendizajes clave — todo en una plataforma integral para equipos de growth.
                        </p>
                        <div className="hero-cta">
                            <button className="btn-primary" onClick={onLogin}>
                                Comenzar Gratis 🚀
                            </button>
                            <a href="#como-funciona" className="btn-secondary">
                                ¿Cómo funciona? ↓
                            </a>
                        </div>

                        {/* Metrics */}
                        <div className="metrics-bar">
                            <div className="metric-item">
                                <div className="metric-value">3</div>
                                <div className="metric-label">Fases del Proceso</div>
                            </div>
                            <div className="metric-item">
                                <div className="metric-value">5</div>
                                <div className="metric-label">Etapas del Funnel</div>
                            </div>
                            <div className="metric-item">
                                <div className="metric-value">∞</div>
                                <div className="metric-label">Proyectos & Experimentos</div>
                            </div>
                            <div className="metric-item">
                                <div className="metric-value">ICE</div>
                                <div className="metric-label">Framework de Priorización</div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Problem */}
                <section className="problem-section">
                    <div className="l-container">
                        <div className="section-label"><span className="icon">⚡</span> EL PROBLEMA</div>
                        <h2 className="section-title">¿Te suena familiar?</h2>
                        <p className="section-desc">
                            Los equipos de growth enfrentan los mismos problemas una y otra vez. Sin un sistema, el crecimiento es caótico.
                        </p>
                        <div className="problem-grid">
                            <div className="problem-card">
                                <div className="problem-emoji">📋</div>
                                <h3>Experimentos en spreadsheets</h3>
                                <p>Hipótesis perdidas en Google Sheets, sin contexto, sin resultados trazables. El conocimiento se pierde con cada iteración.</p>
                            </div>
                            <div className="problem-card">
                                <div className="problem-emoji">🎯</div>
                                <h3>Sin alineación estratégica</h3>
                                <p>¿Cómo conectar cada experimento con un objetivo de negocio? Sin visibilidad de la cascada North Star → Objetivos → Estrategias.</p>
                            </div>
                            <div className="problem-card">
                                <div className="problem-emoji">🔮</div>
                                <h3>Priorización por intuición</h3>
                                <p>Sin un framework objetivo para decidir qué experimentar primero. Las decisiones se toman por "feeling", no por datos.</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* How It Works */}
                <section className="how-section" id="como-funciona">
                    <div className="l-container">
                        <div className="section-label"><span className="icon">🔄</span> METODOLOGÍA</div>
                        <h2 className="section-title" style={{ textAlign: 'center' }}>Un proceso de 3 fases</h2>
                        <p className="section-desc" style={{ textAlign: 'center', margin: '0 auto 64px' }}>
                            Sigue un flujo estructurado que va desde el diseño estratégico hasta la ejecución ágil de experimentos.
                        </p>
                        <div className="steps-grid">
                            <div className="step-card step-1">
                                <div className="step-number">01</div>
                                <div className="step-subtitle">ROADMAP</div>
                                <h3>Design</h3>
                                <p>Define tu North Star Metric, establece objetivos y diseña estrategias. Crea una cascada clara desde tu métrica clave hasta las tácticas ejecutables.</p>
                            </div>
                            <div className="step-card step-2">
                                <div className="step-number">02</div>
                                <div className="step-subtitle">BACKLOG</div>
                                <h3>Explore</h3>
                                <p>Prioriza tu backlog de experimentos con ICE scoring. Visualiza todos tus experimentos en tabla, filtra por funnel stage, ordena por impacto.</p>
                            </div>
                            <div className="step-card step-3">
                                <div className="step-number">03</div>
                                <div className="step-subtitle">KANBAN</div>
                                <h3>Be Agile</h3>
                                <p>Mueve experimentos por las fases: Prioritized → Building → Live Testing → Analysis. Drag &amp; drop para agilidad total.</p>
                            </div>
                        </div>

                        {/* ICE Framework */}
                        <div className="ice-preview">
                            <div className="ice-item">
                                <div className="ice-letter ice-i">I</div>
                                <div className="ice-word">Impact</div>
                                <div className="ice-desc">¿Qué tan grande será el efecto?</div>
                            </div>
                            <div className="ice-item">
                                <div className="ice-letter ice-c">C</div>
                                <div className="ice-word">Confidence</div>
                                <div className="ice-desc">¿Qué tan seguro estás?</div>
                            </div>
                            <div className="ice-item">
                                <div className="ice-letter ice-e">E</div>
                                <div className="ice-word">Ease</div>
                                <div className="ice-desc">¿Qué tan fácil de implementar?</div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Funnel Framework */}
                <section className="funnel-section">
                    <div className="l-container">
                        <div className="section-label" style={{ textAlign: 'center' }}><span className="icon">📊</span> AARRR FRAMEWORK</div>
                        <h2 className="section-title" style={{ textAlign: 'center' }}>Pirate Metrics integrado</h2>
                        <p className="section-desc" style={{ textAlign: 'center', margin: '0 auto 56px' }}>
                            Cada experimento se clasifica por etapa del funnel, dándote visibilidad de dónde estás invirtiendo esfuerzo y dónde hay oportunidades.
                        </p>
                        <div className="funnel-visual">
                            <div className="funnel-stage stage-acq">
                                <div className="stage-icon">🎣</div>
                                <h4>Acquisition</h4>
                                <p>¿Cómo atraes usuarios?</p>
                            </div>
                            <div className="funnel-arrow">→</div>
                            <div className="funnel-stage stage-act">
                                <div className="stage-icon">⚡</div>
                                <h4>Activation</h4>
                                <p>¿Llegan al "Aha moment"?</p>
                            </div>
                            <div className="funnel-arrow">→</div>
                            <div className="funnel-stage stage-ret">
                                <div className="stage-icon">🔄</div>
                                <h4>Retention</h4>
                                <p>¿Regresan los usuarios?</p>
                            </div>
                            <div className="funnel-arrow">→</div>
                            <div className="funnel-stage stage-ref">
                                <div className="stage-icon">📣</div>
                                <h4>Referral</h4>
                                <p>¿Recomiendan tu producto?</p>
                            </div>
                            <div className="funnel-arrow">→</div>
                            <div className="funnel-stage stage-rev">
                                <div className="stage-icon">💰</div>
                                <h4>Revenue</h4>
                                <p>¿Cómo monetizas?</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Features */}
                <section className="features-section" id="features">
                    <div className="l-container">
                        <div className="section-label" style={{ textAlign: 'center' }}><span className="icon">✨</span> FUNCIONALIDADES</div>
                        <h2 className="section-title" style={{ textAlign: 'center' }}>Todo lo que necesitas para crecer</h2>
                        <p className="section-desc" style={{ textAlign: 'center', margin: '0 auto 64px' }}>
                            Herramientas diseñadas específicamente para equipos de growth que toman decisiones basadas en datos.
                        </p>
                        <div className="features-grid">
                            <div className="feature-card">
                                <div className="feature-icon purple">🎯</div>
                                <div>
                                    <h3>North Star Metric</h3>
                                    <p>Define y monitorea tu métrica estrella. Visualiza el progreso en tiempo real con barras de avance y targets configurables.</p>
                                </div>
                            </div>
                            <div className="feature-card">
                                <div className="feature-icon blue">📐</div>
                                <div>
                                    <h3>Roadmap Estratégico</h3>
                                    <p>Cascada visual de Objetivos → Estrategias → Experimentos. Cada nivel se conecta al anterior para trazabilidad total.</p>
                                </div>
                            </div>
                            <div className="feature-card">
                                <div className="feature-icon green">📊</div>
                                <div>
                                    <h3>Backlog con ICE Scoring</h3>
                                    <p>Tabla interactiva con edición inline de Impact, Confidence y Ease. Prioriza objetivamente con puntuación automática.</p>
                                </div>
                            </div>
                            <div className="feature-card">
                                <div className="feature-icon orange">🗂️</div>
                                <div>
                                    <h3>Kanban con Drag &amp; Drop</h3>
                                    <p>Board visual para mover experimentos entre etapas. Arrastra tarjetas de Prioritized a Building, Testing y Analysis.</p>
                                </div>
                            </div>
                            <div className="feature-card">
                                <div className="feature-icon pink">📁</div>
                                <div>
                                    <h3>Multi-Proyecto</h3>
                                    <p>Gestiona múltiples proyectos desde un portfolio centralizado. Cada proyecto con su propio North Star, equipo y experimentos.</p>
                                </div>
                            </div>
                            <div className="feature-card">
                                <div className="feature-icon teal">📚</div>
                                <div>
                                    <h3>Knowledge Library</h3>
                                    <p>Documenta hipótesis, criterios de éxito, key learnings y pruebas visuales. Construye un repositorio de conocimiento para tu equipo.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* CTA */}
                <section className="cta-section">
                    <div className="l-container">
                        <div className="cta-box">
                            <h2>Empieza a experimentar<br />con metodología</h2>
                            <p>Deja de adivinar y empieza a tomar decisiones de crecimiento basadas en datos y frameworks probados.</p>
                            <button className="btn-primary" onClick={onLogin}>
                                Acceder a la Plataforma 🚀
                            </button>
                        </div>
                    </div>
                </section>

                {/* Footer */}
                <footer className="landing-footer">
                    <div className="l-container">
                        <p>© 2026 Growth Experiment Manager · Construido con 💜 por Laboratorio Polanco</p>
                    </div>
                </footer>
            </div>
        </>
    )
}

const landingStyles = `
    .landing-page {
        font-family: 'Inter', -apple-system, sans-serif;
        background: #0a0a0f;
        color: #f1f5f9;
        line-height: 1.6;
        overflow-x: hidden;
        min-height: 100vh;
    }

    .landing-page * { margin: 0; padding: 0; box-sizing: border-box; }

    /* ─── Background Effects ─── */
    .landing-page .bg-grid {
        position: fixed; inset: 0;
        background-image:
            linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
        background-size: 64px 64px;
        z-index: 0; pointer-events: none;
    }
    .landing-page .bg-blob {
        position: fixed; border-radius: 50%; filter: blur(120px);
        opacity: 0.4; z-index: 0; pointer-events: none;
    }
    .blob-1 { width: 600px; height: 600px; background: #7c3aed; top: -200px; right: -150px; opacity: 0.15; }
    .blob-2 { width: 500px; height: 500px; background: #3b82f6; bottom: 200px; left: -200px; opacity: 0.1; }
    .blob-3 { width: 400px; height: 400px; background: #22c55e; bottom: -100px; right: 100px; opacity: 0.08; }

    /* ─── Navigation ─── */
    .landing-nav {
        position: fixed; top: 0; left: 0; right: 0; z-index: 100;
        padding: 16px 40px; display: flex; align-items: center; justify-content: space-between;
        background: rgba(10, 10, 15, 0.7); backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px); border-bottom: 1px solid rgba(255,255,255,0.06);
    }
    .nav-brand {
        display: flex; align-items: center; gap: 12px;
        font-weight: 700; font-size: 1.15rem; letter-spacing: -0.5px;
    }
    .nav-logo {
        width: 36px; height: 36px;
        background: linear-gradient(135deg, #7c3aed, #a78bfa);
        border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 18px;
    }
    .nav-btn {
        padding: 10px 24px; background: #7c3aed; color: white; border: none;
        border-radius: 10px; font-weight: 600; font-size: 0.9rem; cursor: pointer;
        transition: all 0.3s ease;
    }
    .nav-btn:hover { background: #6d28d9; transform: translateY(-1px); box-shadow: 0 8px 24px rgba(124,58,237,0.25); }

    /* ─── Container ─── */
    .l-container { max-width: 1200px; margin: 0 auto; padding: 0 24px; position: relative; z-index: 1; }

    /* ─── Hero ─── */
    .hero { padding: 160px 0 100px; text-align: center; }
    .hero-badge {
        display: inline-flex; align-items: center; gap: 8px;
        padding: 8px 20px; background: rgba(124,58,237,0.08);
        border: 1px solid rgba(124,58,237,0.2); border-radius: 100px;
        font-size: 0.85rem; color: #a78bfa; margin-bottom: 32px;
        animation: fadeInUp 0.6s ease;
    }
    .hero-badge .dot {
        width: 8px; height: 8px; background: #22c55e; border-radius: 50%;
        animation: pulse-dot 2s infinite;
    }
    @keyframes pulse-dot {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.5; transform: scale(1.3); }
    }
    .hero h1 {
        font-size: clamp(2.8rem, 6vw, 4.8rem); font-weight: 800;
        line-height: 1.1; letter-spacing: -2px; margin-bottom: 24px;
        animation: fadeInUp 0.6s ease 0.1s both;
    }
    .hero h1 .gradient-text {
        background: linear-gradient(135deg, #a78bfa 0%, #ec4899 50%, #f59e0b 100%);
        -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
    }
    .hero-subtitle {
        font-size: 1.25rem; color: #94a3b8; max-width: 640px;
        margin: 0 auto 48px; line-height: 1.7; animation: fadeInUp 0.6s ease 0.2s both;
    }
    .hero-cta {
        display: flex; gap: 16px; justify-content: center;
        animation: fadeInUp 0.6s ease 0.3s both;
    }
    .btn-primary {
        padding: 16px 36px; background: linear-gradient(135deg, #7c3aed, #6d28d9);
        color: white; border: none; border-radius: 14px; font-weight: 700; font-size: 1.05rem;
        cursor: pointer; transition: all 0.3s ease; text-decoration: none;
        display: inline-flex; align-items: center; gap: 10px;
    }
    .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 12px 40px rgba(124,58,237,0.25); }
    .btn-secondary {
        padding: 16px 36px; background: transparent; color: #f1f5f9;
        border: 1px solid rgba(255,255,255,0.1); border-radius: 14px;
        font-weight: 600; font-size: 1.05rem; cursor: pointer; transition: all 0.3s ease;
        text-decoration: none; display: inline-flex; align-items: center; gap: 10px;
    }
    .btn-secondary:hover { background: rgba(255,255,255,0.05); border-color: #a78bfa; transform: translateY(-2px); }
    @keyframes fadeInUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }

    /* ─── Metrics Bar ─── */
    .metrics-bar {
        display: flex; justify-content: center; gap: 48px; padding: 48px 0; margin-top: 64px;
        border-top: 1px solid rgba(255,255,255,0.06); border-bottom: 1px solid rgba(255,255,255,0.06);
    }
    .metric-item { text-align: center; }
    .metric-value {
        font-size: 2.5rem; font-weight: 800;
        background: linear-gradient(135deg, #a78bfa, #ec4899);
        -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
    }
    .metric-label { font-size: 0.85rem; color: #64748b; margin-top: 4px; }

    /* ─── Problem Section ─── */
    .problem-section { padding: 80px 0; }
    .section-label {
        display: inline-flex; align-items: center; gap: 8px;
        font-size: 0.8rem; font-weight: 700; letter-spacing: 2px; text-transform: uppercase;
        color: #a78bfa; margin-bottom: 20px;
    }
    .section-label .icon { font-size: 1rem; }
    .section-title {
        font-size: clamp(2rem, 4vw, 2.8rem); font-weight: 700;
        letter-spacing: -1px; margin-bottom: 16px; line-height: 1.2;
    }
    .section-desc {
        font-size: 1.1rem; color: #94a3b8; max-width: 600px; line-height: 1.7; margin-bottom: 48px;
    }
    .problem-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
    .problem-card {
        background: #1a1a28; border: 1px solid rgba(255,255,255,0.06);
        border-radius: 16px; padding: 32px 28px; transition: all 0.4s ease;
        position: relative; overflow: hidden;
    }
    .problem-card::before {
        content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
        background: linear-gradient(90deg, #7c3aed, #ec4899); opacity: 0; transition: opacity 0.3s ease;
    }
    .problem-card:hover { border-color: rgba(124,58,237,0.3); transform: translateY(-4px); box-shadow: 0 20px 60px rgba(0,0,0,0.3); }
    .problem-card:hover::before { opacity: 1; }
    .problem-emoji { font-size: 2.2rem; margin-bottom: 16px; }
    .problem-card h3 { font-size: 1.15rem; font-weight: 700; margin-bottom: 10px; }
    .problem-card p { font-size: 0.92rem; color: #94a3b8; line-height: 1.6; }

    /* ─── How Section ─── */
    .how-section { padding: 100px 0; }
    .steps-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 32px; position: relative; }
    .steps-grid::before {
        content: ''; position: absolute; top: 60px; left: 17%; right: 17%; height: 2px;
        background: linear-gradient(90deg, transparent, #7c3aed, #22c55e, transparent); opacity: 0.3;
    }
    .step-card { text-align: center; position: relative; }
    .step-number {
        width: 64px; height: 64px; border-radius: 20px; display: flex;
        align-items: center; justify-content: center; font-size: 1.5rem; font-weight: 800;
        margin: 0 auto 24px; position: relative; z-index: 2; color: white;
    }
    .step-1 .step-number { background: linear-gradient(135deg, #7c3aed, #6d28d9); box-shadow: 0 8px 30px rgba(124,58,237,0.25); }
    .step-2 .step-number { background: linear-gradient(135deg, #3b82f6, #2563eb); box-shadow: 0 8px 30px rgba(59,130,246,0.25); }
    .step-3 .step-number { background: linear-gradient(135deg, #22c55e, #16a34a); box-shadow: 0 8px 30px rgba(34,197,94,0.2); }
    .step-card h3 { font-size: 1.3rem; font-weight: 700; margin-bottom: 12px; }
    .step-card p { color: #94a3b8; font-size: 0.95rem; line-height: 1.65; max-width: 300px; margin: 0 auto; }
    .step-subtitle {
        display: inline-block; padding: 4px 12px; border-radius: 6px;
        font-size: 0.78rem; font-weight: 600; margin-bottom: 16px;
    }
    .step-1 .step-subtitle { background: rgba(124,58,237,0.08); color: #a78bfa; }
    .step-2 .step-subtitle { background: rgba(59,130,246,0.1); color: #60a5fa; }
    .step-3 .step-subtitle { background: rgba(34,197,94,0.1); color: #4ade80; }

    /* ─── ICE Preview ─── */
    .ice-preview { display: flex; gap: 32px; justify-content: center; margin-top: 56px; }
    .ice-item {
        background: #1a1a28; border: 1px solid rgba(255,255,255,0.06);
        border-radius: 10px; padding: 20px 28px; text-align: center; min-width: 140px;
    }
    .ice-letter { font-size: 2rem; font-weight: 800; }
    .ice-i { color: #a78bfa; } .ice-c { color: #3b82f6; } .ice-e { color: #22c55e; }
    .ice-word { font-size: 0.85rem; color: #94a3b8; margin-top: 4px; }
    .ice-desc { font-size: 0.75rem; color: #64748b; margin-top: 4px; }

    /* ─── Funnel Section ─── */
    .funnel-section { padding: 80px 0; }
    .funnel-visual { display: flex; justify-content: center; gap: 0; max-width: 800px; margin: 0 auto; }
    .funnel-stage {
        flex: 1; padding: 28px 16px; text-align: center; position: relative;
        border-radius: 10px; transition: all 0.3s ease;
    }
    .funnel-stage:hover { transform: translateY(-4px); }
    .funnel-stage .stage-icon { font-size: 2rem; margin-bottom: 12px; }
    .funnel-stage h4 { font-size: 0.95rem; font-weight: 700; margin-bottom: 6px; }
    .funnel-stage p { font-size: 0.78rem; color: #64748b; line-height: 1.4; }
    .stage-acq { background: rgba(59,130,246,0.08); border: 1px solid rgba(59,130,246,0.15); }
    .stage-act { background: rgba(124,58,237,0.08); border: 1px solid rgba(124,58,237,0.15); }
    .stage-ret { background: rgba(236,72,153,0.08); border: 1px solid rgba(236,72,153,0.15); }
    .stage-ref { background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.15); }
    .stage-rev { background: rgba(34,197,94,0.08); border: 1px solid rgba(34,197,94,0.15); }
    .funnel-arrow { display: flex; align-items: center; color: #64748b; font-size: 1.2rem; padding: 0 4px; }

    /* ─── Features ─── */
    .features-section { padding: 80px 0 100px; }
    .features-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
    .feature-card {
        background: #1a1a28; border: 1px solid rgba(255,255,255,0.06);
        border-radius: 16px; padding: 36px 32px; display: flex; gap: 20px; transition: all 0.4s ease;
    }
    .feature-card:hover { border-color: rgba(124,58,237,0.2); background: #22223a; transform: translateY(-2px); }
    .feature-icon {
        width: 52px; height: 52px; border-radius: 14px; display: flex;
        align-items: center; justify-content: center; font-size: 1.6rem; flex-shrink: 0;
    }
    .feature-icon.purple { background: rgba(124,58,237,0.08); }
    .feature-icon.blue { background: rgba(59,130,246,0.1); }
    .feature-icon.green { background: rgba(34,197,94,0.1); }
    .feature-icon.orange { background: rgba(245,158,11,0.1); }
    .feature-icon.pink { background: rgba(236,72,153,0.1); }
    .feature-icon.teal { background: rgba(20,184,166,0.1); }
    .feature-card h3 { font-size: 1.1rem; font-weight: 700; margin-bottom: 8px; }
    .feature-card p { color: #94a3b8; font-size: 0.9rem; line-height: 1.55; }

    /* ─── CTA ─── */
    .cta-section { padding: 100px 0 120px; text-align: center; }
    .cta-box {
        background: linear-gradient(135deg, rgba(124,58,237,0.12), rgba(236,72,153,0.06));
        border: 1px solid rgba(124,58,237,0.2); border-radius: 24px; padding: 72px 48px;
        position: relative; overflow: hidden;
    }
    .cta-box::before {
        content: ''; position: absolute; top: -50%; left: -50%; width: 200%; height: 200%;
        background: radial-gradient(circle, rgba(124,58,237,0.25) 0%, transparent 70%);
        opacity: 0.5; pointer-events: none;
    }
    .cta-box h2 { font-size: clamp(2rem, 4vw, 2.8rem); font-weight: 800; letter-spacing: -1px; margin-bottom: 16px; position: relative; }
    .cta-box p { color: #94a3b8; font-size: 1.15rem; max-width: 500px; margin: 0 auto 40px; position: relative; }
    .cta-box .btn-primary { position: relative; font-size: 1.15rem; padding: 18px 44px; }

    /* ─── Footer ─── */
    .landing-footer {
        padding: 32px 0; border-top: 1px solid rgba(255,255,255,0.06);
        text-align: center; color: #64748b; font-size: 0.85rem;
    }

    /* ─── Responsive ─── */
    @media (max-width: 768px) {
        .landing-nav { padding: 12px 20px; }
        .hero { padding: 120px 0 60px; }
        .problem-grid { grid-template-columns: 1fr; }
        .steps-grid { grid-template-columns: 1fr; gap: 48px; }
        .steps-grid::before { display: none; }
        .features-grid { grid-template-columns: 1fr; }
        .funnel-visual { flex-direction: column; gap: 12px; }
        .funnel-arrow { transform: rotate(90deg); justify-content: center; }
        .hero-cta { flex-direction: column; align-items: center; }
        .metrics-bar { flex-wrap: wrap; gap: 24px; }
        .ice-preview { flex-direction: column; align-items: center; }
    }
`
