import React, { useState, useEffect } from 'react';
import {
  X,
  Lightbulb,
  Target,
  CheckCircle2,
  ExternalLink,
  Upload,
  TrendingUp,
  Edit3
} from 'lucide-react';
import type { Experiment, Status, Objective, Strategy } from './types';

interface ExperimentDrawerProps {
  experiment: Experiment;
  onClose: () => void;
  onStatusChange: (id: string, newStatus: Status) => void;
  onIceUpdate?: (field: 'impact' | 'confidence' | 'ease', val: number) => void;
  onExperimentUpdate: (id: string, updates: Partial<Experiment>) => void;
  objectives: Objective[];
  strategies: Strategy[];
  teamMembers: any[];  // Array of team members for owner selection
}

const ALL_STATUSES: Status[] = [
  'Idea', 'Prioritized', 'Building', 'Live Testing', 'Analysis',
  'Finished - Winner', 'Finished - Loser', 'Finished - Inconclusive'
];

const getStatusColor = (status: Status) => {
  switch (status) {
    case 'Idea': return 'var(--status-idea)';
    case 'Prioritized': return 'var(--status-prioritized)';
    case 'Building': return 'var(--status-dev)';
    case 'Live Testing': return 'var(--status-testing)';
    case 'Finished - Winner': return 'var(--status-winner)';
    case 'Finished - Loser': return 'var(--status-loser)';
    default: return 'var(--status-inconclusive)';
  }
};

export const ExperimentDrawer: React.FC<ExperimentDrawerProps> = ({
  experiment,
  onClose,
  onStatusChange,
  onIceUpdate,
  onExperimentUpdate,
  objectives,
  strategies,
  teamMembers
}) => {
  const [activeTab, setActiveTab] = useState<'strategy' | 'execution'>('strategy');
  const [editingSuccessCriteria, setEditingSuccessCriteria] = useState(false);
  const [editingTargetMetric, setEditingTargetMetric] = useState(false);
  const [editingUrl, setEditingUrl] = useState(false);
  const [editingLearnings, setEditingLearnings] = useState(false);

  const [tempSuccessCriteria, setTempSuccessCriteria] = useState(experiment.successCriteria || '');
  const [tempTargetMetric, setTempTargetMetric] = useState(experiment.targetMetric || '');
  const [tempUrl, setTempUrl] = useState(experiment.testUrl || '');
  const [tempLearnings, setTempLearnings] = useState(experiment.keyLearnings || '');

  useEffect(() => {
    setTempSuccessCriteria(experiment.successCriteria || '');
    setTempTargetMetric(experiment.targetMetric || '');
    setTempUrl(experiment.testUrl || '');
    setTempLearnings(experiment.keyLearnings || '');
  }, [experiment.id]);

  const linkedStrategy = strategies.find(s => s.id === experiment.linkedStrategyId);
  const parentObjective = linkedStrategy
    ? objectives.find(o => o.id === linkedStrategy.parentObjectiveId)
    : null;

  const canConclude = experiment.status === 'Analysis';

  const saveSuccessCriteria = () => {
    onExperimentUpdate(experiment.id, { successCriteria: tempSuccessCriteria });
    setEditingSuccessCriteria(false);
  };

  const saveTargetMetric = () => {
    onExperimentUpdate(experiment.id, { targetMetric: tempTargetMetric });
    setEditingTargetMetric(false);
  };

  const saveUrl = () => {
    onExperimentUpdate(experiment.id, { testUrl: tempUrl });
    setEditingUrl(false);
  };

  const saveLearnings = () => {
    onExperimentUpdate(experiment.id, { keyLearnings: tempLearnings });
    setEditingLearnings(false);
  };

  const handleImageUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (!files) return;
      Array.from(files).forEach(file => {
        if (file.size > 5 * 1024 * 1024) { alert('Max 5MB'); return; }
        const reader = new FileReader();
        reader.onload = (ev) => {
          const d = ev.target?.result as string;
          const cur = experiment.visualProof || [];
          onExperimentUpdate(experiment.id, { visualProof: [...cur, d] });
        };
        reader.readAsDataURL(file);
      });
    };
    input.click();
  };
  const handleRemoveImage = (idx: number) => {
    const cur = experiment.visualProof || [];
    onExperimentUpdate(experiment.id, { visualProof: cur.filter((_, i) => i !== idx) });
  };

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer" onClick={e => e.stopPropagation()}>
        <div className="drawer-header" style={{ position: 'relative' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <select
                value={experiment.status}
                onChange={(e) => onStatusChange(experiment.id, e.target.value as Status)}
                className="badge"
                style={{
                  backgroundColor: getStatusColor(experiment.status) + '20',
                  color: getStatusColor(experiment.status),
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: 600,
                  outline: 'none'
                }}
              >
                {ALL_STATUSES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <span style={{ color: 'var(--text-subtle)', fontSize: '13px' }}>EXP-{experiment.id}</span>
            </div>
            <h2 style={{ fontSize: '24px', marginBottom: '4px' }}>{experiment.title}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--text-muted)' }}>
              {experiment.owner.avatar && (experiment.owner.avatar.startsWith('http') || experiment.owner.avatar.startsWith('data:'))
                ? <img src={experiment.owner.avatar} alt="" style={{ width: '20px', height: '20px', borderRadius: '50%', objectFit: 'cover' }} />
                : <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600, color: '#6B7280' }}>{experiment.owner.avatar || experiment.owner.name?.charAt(0)?.toUpperCase() || '?'}</div>
              }
              <span>{experiment.owner.name}</span>
            </div>
          </div>

          <div style={{
            position: 'absolute',
            top: '16px',
            right: '60px',
            background: 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)',
            borderRadius: '12px',
            padding: '16px 24px',
            boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px', fontWeight: 700 }}>
              ICE Score
            </div>
            <div style={{ fontSize: '32px', fontWeight: 800, color: 'white', lineHeight: 1 }}>
              {experiment.iceScore}
            </div>
          </div>

          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-subtle)', padding: '4px', cursor: 'pointer' }}
          >
            <X size={24} />
          </button>
        </div>

        <div className="drawer-content">
          <div className="drawer-tabs">
            <button
              className={'tab ' + (activeTab === 'strategy' ? 'active' : '')}
              onClick={() => setActiveTab('strategy')}
              style={{
                borderBottom: activeTab === 'strategy' ? '2px solid #4F46E5' : '2px solid transparent',
                color: activeTab === 'strategy' ? '#4F46E5' : 'var(--text-muted)'
              }}
            >
              Strategy y Definición
            </button>
            <button
              className={'tab ' + (activeTab === 'execution' ? 'active' : '')}
              onClick={() => setActiveTab('execution')}
              style={{
                borderBottom: activeTab === 'execution' ? '2px solid #4F46E5' : '2px solid transparent',
                color: activeTab === 'execution' ? '#4F46E5' : 'var(--text-muted)'
              }}
            >
              Ejecución y Resultados
            </button>
          </div>

          {activeTab === 'strategy' ? (
            <div className="tab-content transition-in">
              <div className="form-group">
                <div className="label">Hipótesis</div>
                <div className="rich-text" style={{ background: 'var(--bg-sidebar)', border: 'none', fontWeight: 500, fontSize: '16px' }}>
                  {experiment.hypothesis}
                </div>
              </div>

              {/* EDITABLE Success Criteria */}
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div className="label">Criterios de Éxito (Definición de Done)</div>
                  <button
                    onClick={() => setEditingSuccessCriteria(!editingSuccessCriteria)}
                    style={{ background: 'none', border: 'none', color: '#4F46E5', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600 }}
                  >
                    <Edit3 size={14} />
                    {editingSuccessCriteria ? 'Cancelar' : 'Editar'}
                  </button>
                </div>
                {editingSuccessCriteria ? (
                  <div>
                    <textarea
                      value={tempSuccessCriteria}
                      onChange={(e) => setTempSuccessCriteria(e.target.value)}
                      placeholder="Define las condiciones exactas que determinan el éxito..."
                      style={{
                        width: '100%',
                        minHeight: '80px',
                        padding: '12px',
                        border: '1px solid #86EFAC',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontFamily: 'inherit',
                        resize: 'vertical',
                        marginBottom: '8px'
                      }}
                    />
                    <button
                      onClick={saveSuccessCriteria}
                      style={{
                        background: '#4F46E5',
                        color: 'white',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: '13px'
                      }}
                    >
                      Guardar
                    </button>
                  </div>
                ) : (
                  <div className="rich-text" style={{ background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: '8px', padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                      <CheckCircle2 size={18} style={{ color: '#16A34A', marginTop: '2px', flexShrink: 0 }} />
                      <div style={{ color: '#166534', fontSize: '14px', lineHeight: '1.6' }}>
                        {experiment.successCriteria || 'Aún no definidos. Haz clic en "Editar" para especificar las condiciones exactas que determinan si este experimento es exitoso.'}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* EDITABLE Target Metric */}
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div className="label">Métrica Objetivo</div>
                  <button
                    onClick={() => setEditingTargetMetric(!editingTargetMetric)}
                    style={{ background: 'none', border: 'none', color: '#4F46E5', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600 }}
                  >
                    <Edit3 size={14} />
                    {editingTargetMetric ? 'Cancelar' : 'Editar'}
                  </button>
                </div>
                {editingTargetMetric ? (
                  <div>
                    <input
                      type="text"
                      value={tempTargetMetric}
                      onChange={(e) => setTempTargetMetric(e.target.value)}
                      placeholder="Ej: Conversion Rate, Sign-up Rate, NPS Score..."
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid rgba(79, 70, 229, 0.3)',
                        borderRadius: '8px',
                        fontSize: '14px',
                        marginBottom: '8px'
                      }}
                    />
                    <button
                      onClick={saveTargetMetric}
                      style={{
                        background: '#4F46E5',
                        color: 'white',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: '13px'
                      }}
                    >
                      Guardar
                    </button>
                  </div>
                ) : (
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.05) 0%, rgba(99, 102, 241, 0.05) 100%)',
                    border: '1px solid rgba(79, 70, 229, 0.2)',
                    borderRadius: '8px',
                    padding: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}>
                    <TrendingUp size={24} style={{ color: '#4F46E5' }} />
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#4F46E5', marginBottom: '4px' }}>
                        {experiment.targetMetric || 'Sin métrica específica definida'}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        La métrica exacta que este experimento busca impactar
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {experiment.observation && (
                <div className="form-group">
                  <div className="label">Observación</div>
                  <div className="rich-text" style={{ background: 'var(--bg-sidebar)', border: 'none' }}>
                    {experiment.observation}
                  </div>
                </div>
              )}

              {experiment.problem && (
                <div className="form-group">
                  <div className="label">Problema a Resolver</div>
                  <div className="rich-text" style={{ background: 'var(--bg-sidebar)', border: 'none' }}>
                    {experiment.problem}
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginTop: '32px' }}>
                <div>
                  <div className="label">Priorización (ICE)</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '16px' }}>
                    {(['impact', 'confidence', 'ease'] as const).map(key => {
                      const score = { label: key.charAt(0).toUpperCase() + key.slice(1), value: experiment[key] };
                      return (
                        <div key={score.label}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                            <span>{score.label}</span>
                            <span style={{ fontWeight: 600, color: '#4F46E5' }}>{score.value}/10</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="10"
                            value={score.value}
                            onChange={(e) => onIceUpdate && onIceUpdate(key, Number(e.target.value))}
                            style={{
                              width: '100%',
                              cursor: 'pointer',
                              accentColor: '#4F46E5'
                            }}
                          />
                        </div>
                      )
                    })}
                  </div>
                </div>


                <div>
                  <div className="label">Contexto Estratégico</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '16px' }}>
                    {/* EDITABLE Linked Strategy Dropdown */}
                    <div>
                      <div className="label" style={{ fontSize: '10px', marginBottom: '8px' }}>Strategy Vinculada</div>
                      <select
                        value={experiment.linkedStrategyId || ''}
                        onChange={(e) => onExperimentUpdate(experiment.id, { linkedStrategyId: e.target.value || undefined })}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontWeight: 500,
                          cursor: 'pointer',
                          background: 'white',
                          outline: 'none'
                        }}
                      >
                        <option value="">Sin strategy vinculada</option>
                        {objectives.map(obj => {
                          const objStrategies = strategies.filter(s => s.parentObjectiveId === obj.id);
                          if (objStrategies.length === 0) return null;
                          return (
                            <optgroup key={obj.id} label={obj.title}>
                              {objStrategies.map(strat => (
                                <option key={strat.id} value={strat.id}>
                                  {strat.title}
                                </option>
                              ))}
                            </optgroup>
                          );
                        })}
                      </select>
                    </div>

                    {parentObjective && (
                      <div>
                        <div className="label" style={{ fontSize: '10px' }}>Objective Padre</div>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontSize: '14px',
                          fontWeight: 600,
                          color: '#4F46E5',
                          background: 'rgba(79, 70, 229, 0.08)',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          borderLeft: '3px solid #4F46E5'
                        }}>
                          <Target size={16} />
                          {parentObjective.title}
                        </div>
                      </div>
                    )}

                    <div>
                      <div className="label" style={{ fontSize: '10px' }}>Funnel Stage</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 500 }}>
                        <Target size={16} style={{ color: '#4F46E5' }} />
                        {experiment.funnelStage}
                      </div>
                    </div>
                    <div>
                      <div className="label" style={{ fontSize: '10px' }}>North Star Metric</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 500 }}>
                        <CheckCircle2 size={16} style={{ color: 'var(--status-winner)' }} />
                        {experiment.northStarMetric}
                      </div>
                    </div>
                    {experiment.source && (
                      <div>
                        <div className="label" style={{ fontSize: '10px' }}>Fuente</div>
                        <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-muted)' }}>
                          {experiment.source}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="tab-content transition-in">
              <div className="form-group">
                <div className="label">Líder del Experimento</div>
                <select
                  value={experiment.owner.name}
                  onChange={(e) => {
                    const selectedMember = teamMembers.find(m => m.name === e.target.value);
                    if (selectedMember) {
                      onExperimentUpdate(experiment.id, {
                        owner: {
                          name: selectedMember.name,
                          avatar: selectedMember.avatar
                        }
                      });
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    background: 'white',
                    outline: 'none'
                  }}
                >
                  {teamMembers.filter(m => m.role === 'Admin' || m.role === 'Lead').map(member => (
                    <option key={member.id} value={member.name}>
                      {member.avatar} {member.name}
                    </option>
                  ))}
                </select>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginTop: '12px',
                  padding: '8px',
                  background: 'var(--bg-sidebar)',
                  borderRadius: '6px'
                }}>
                  <span style={{ fontSize: '24px' }}>{experiment.owner.avatar}</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '13px' }}>{experiment.owner.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Owner Actual</div>
                  </div>
                </div>
              </div>

              {/* EDITABLE Dates */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '32px' }}>
                <div>
                  <div className="label" style={{ marginBottom: '8px' }}>Fecha de Inicio</div>
                  <input
                    type="date"
                    value={experiment.startDate || ''}
                    onChange={(e) => onExperimentUpdate(experiment.id, { startDate: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontFamily: 'inherit',
                      cursor: 'pointer'
                    }}
                  />
                </div>
                <div>
                  <div className="label" style={{ marginBottom: '8px' }}>Fecha de Finalización Esperada</div>
                  <input
                    type="date"
                    value={experiment.endDate || ''}
                    onChange={(e) => onExperimentUpdate(experiment.id, { endDate: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontFamily: 'inherit',
                      cursor: 'pointer'
                    }}
                  />
                </div>
              </div>

              {/* EDITABLE URL */}
              <div style={{ marginBottom: '32px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div className="label">Live URL</div>
                  <button
                    onClick={() => setEditingUrl(!editingUrl)}
                    style={{ background: 'none', border: 'none', color: '#4F46E5', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600 }}
                  >
                    <Edit3 size={14} />
                    {editingUrl ? 'Cancelar' : 'Editar'}
                  </button>
                </div>
                {editingUrl ? (
                  <div>
                    <input
                      type="url"
                      value={tempUrl}
                      onChange={(e) => setTempUrl(e.target.value)}
                      placeholder="https://example.com/experiment-variant"
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '8px',
                        fontSize: '14px',
                        marginBottom: '8px'
                      }}
                    />
                    <button
                      onClick={saveUrl}
                      style={{
                        background: '#4F46E5',
                        color: 'white',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: '13px'
                      }}
                    >
                      Guardar
                    </button>
                  </div>
                ) : (
                  <div style={{
                    padding: '12px',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px'
                  }}>
                    {experiment.testUrl ? (
                      <a href={experiment.testUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500, color: '#4F46E5', textDecoration: 'none' }}>
                        <ExternalLink size={16} />
                        {experiment.testUrl.replace('https://', '')}
                      </a>
                    ) : (
                      <span style={{ color: 'var(--text-subtle)' }}>Sin URL adjunta</span>
                    )}
                  </div>
                )}
              </div>

              {/* EDITABLE Key Learnings */}
              <div style={{ marginBottom: '32px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div className="label">Key Learnings</div>
                  <button
                    onClick={() => setEditingLearnings(!editingLearnings)}
                    style={{ background: 'none', border: 'none', color: '#4F46E5', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600 }}
                  >
                    <Edit3 size={14} />
                    {editingLearnings ? 'Cancelar' : 'Editar'}
                  </button>
                </div>
                {editingLearnings ? (
                  <div>
                    <textarea
                      value={tempLearnings}
                      onChange={(e) => setTempLearnings(e.target.value)}
                      placeholder="Documenta los key insights y learnings de este experimento..."
                      style={{
                        width: '100%',
                        minHeight: '120px',
                        padding: '12px',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontFamily: 'inherit',
                        resize: 'vertical',
                        marginBottom: '8px'
                      }}
                    />
                    <button
                      onClick={saveLearnings}
                      style={{
                        background: '#4F46E5',
                        color: 'white',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: '13px'
                      }}
                    >
                      Guardar
                    </button>
                  </div>
                ) : experiment.keyLearnings ? (
                  <div className="rich-text" style={{ marginTop: '12px', border: '1px dashed var(--border-strong)', background: 'var(--bg-sidebar)' }}>
                    <Lightbulb size={20} style={{ color: 'var(--status-winner)', marginBottom: '8px' }} />
                    {experiment.keyLearnings}
                  </div>
                ) : (
                  <div style={{ padding: '32px', textAlign: 'center', border: '1px dashed var(--border-subtle)', borderRadius: '8px', color: 'var(--text-subtle)', marginTop: '8px' }}>
                    Aún no hay learnings registrados. Haz clic en "Editar" para agregar insights.
                  </div>
                )}
              </div>

              {/* EDITABLE Visual Proof */}
              <div>
                <div className="label">Prueba Visual</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '12px', marginTop: '12px' }}>
                  {experiment.visualProof && experiment.visualProof.map((proof, i) => (
                    <div key={i} style={{ position: 'relative', aspectRatio: '16/9', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
                      {proof.startsWith('data:') ? (
                        <img src={proof} alt={'Proof'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{proof}</div>
                      )}
                      <button onClick={() => handleRemoveImage(i)} style={{ position: 'absolute', top: '4px', right: '4px', width: '24px', height: '24px', borderRadius: '50%', background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', cursor: 'pointer', fontSize: '14px' }}>x</button>
                    </div>
                  ))}
                  <button
                    onClick={handleImageUpload}
                    style={{
                      aspectRatio: '16/9',
                      background: 'transparent',
                      border: '2px dashed #4F46E5',
                      borderRadius: '8px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      color: '#4F46E5',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(79, 70, 229, 0.05)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <Upload size={24} />
                    <span style={{ fontSize: '12px', fontWeight: 600 }}>Subir Screenshot</span>
                  </button>
                </div>
              </div>

              <div style={{ marginTop: '48px', paddingTop: '24px', borderTop: '1px solid var(--border-subtle)' }}>
                <button
                  onClick={() => canConclude && onStatusChange(experiment.id, 'Finished - Winner')}
                  disabled={!canConclude}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    background: canConclude ? '#4F46E5' : '#E5E7EB',
                    color: canConclude ? 'white' : '#9CA3AF',
                    fontWeight: 600,
                    border: 'none',
                    cursor: canConclude ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.2s'
                  }}
                >
                  <CheckCircle2 size={18} />
                  Concluir y Archivar Experimento
                </button>
                <div style={{ textAlign: 'center', marginTop: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>
                  {canConclude
                    ? 'Esto moverá el experimento a la Library'
                    : 'Cambia el status a "Analysis" para concluir este experimento'}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
