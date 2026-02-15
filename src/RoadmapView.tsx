import React, { useState } from 'react';
import { Target, Edit2, Plus, TrendingUp, X, Lightbulb, Trash2 } from 'lucide-react';
import type { NorthStarMetric, Objective, Strategy, Experiment, MetricType } from './types';
import { formatMetricValue, getUnitLabel, calculateProgress as calcProgress } from './utils/metricFormatters';

interface RoadmapViewProps {
  northStar: NorthStarMetric;
  onUpdateNorthStar: (updatedNorthStar: NorthStarMetric) => void;
  objectives: Objective[];
  strategies: Strategy[];
  experiments: Experiment[];
  onAddObjective: (title: string) => void;
  onAddStrategy: (objectiveId: string, title: string) => void;
  onEditObjective: (objectiveId: string, newTitle: string, newDescription?: string) => void;
  onEditStrategy: (strategyId: string, newTitle: string) => void;
  onDeleteObjective: (objectiveId: string) => void;
  onDeleteStrategy: (strategyId: string) => void;
  onSelectExperiment: (exp: Experiment) => void;
}

type ModalState =
  | { type: 'none' }
  | { type: 'northstar' }
  | { type: 'objective' }
  | { type: 'edit-objective'; objectiveId: string }
  | { type: 'strategy'; objectiveId: string }
  | { type: 'edit-strategy'; strategyId: string };

export const RoadmapView: React.FC<RoadmapViewProps> = ({
  northStar,
  onUpdateNorthStar,
  objectives,
  strategies,
  experiments,
  onAddObjective,
  onAddStrategy,
  onEditObjective,
  onEditStrategy,
  onSelectExperiment,
  onDeleteObjective,
  onDeleteStrategy
}) => {
  const [modalState, setModalState] = useState<ModalState>({ type: 'none' });
  // Safety check: Strategy-First Empty State
  if (!northStar) {
    return (
      <div style={{ padding: "60px 40px", textAlign: "center", maxWidth: "600px", margin: "0 auto" }}>
        <div style={{ width: "80px", height: "80px", borderRadius: "20px", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", boxShadow: "0 8px 24px rgba(102, 126, 234, 0.3)" }}>
          <Target size={40} color="white" />
        </div>
        <h2 style={{ fontSize: "28px", fontWeight: 700, color: "#111827", marginBottom: "12px", letterSpacing: "-0.02em" }}>Define tu Estrategia de Crecimiento</h2>
        <p style={{ fontSize: "16px", color: "#6b7280", lineHeight: 1.6, marginBottom: "32px" }}>Antes de crear experimentos, define tu North Star Metric y objetivos estratégicos. Este enfoque Strategy-First asegura que cada experimento esté alineado con tus metas.</p>
        <button onClick={() => onUpdateNorthStar({ name: "Revenue", currentValue: 0, targetValue: 0, unit: "$", type: "currency" })} style={{ padding: "16px 32px", background: "linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)", color: "white", border: "none", borderRadius: "12px", fontSize: "16px", fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "10px", boxShadow: "0 4px 12px rgba(79, 70, 229, 0.4)" }}>
          <Plus size={20} /> Definir Objetivo Estratégico
        </button>
      </div>
    );
  }

  // North Star form state
  const [nsMetricName, setNsMetricName] = useState('');
  const [nsCurrentValue, setNsCurrentValue] = useState('');
  const [nsTargetValue, setNsTargetValue] = useState('');
  const [nsMetricType, setNsMetricType] = useState<MetricType>('currency');

  // Objective form state
  const [objectiveTitle, setObjectiveTitle] = useState('');
  const [objectiveDescription, setObjectiveDescription] = useState('');

  // Strategy form state
  const [strategyTitle, setStrategyTitle] = useState('');
  const [strategyDescription, setStrategyDescription] = useState('');

  const calculateProgress = () => {
    return calcProgress(northStar.currentValue, northStar.targetValue);
  };

  // Count experiments linked to a strategy
  const countLinkedExperiments = (strategyId: string): number => {
    return experiments.filter(exp => exp.linkedStrategyId === strategyId).length;
  };

  // Handlers
  const handleOpenNorthStarModal = () => {
    setNsMetricName(northStar.name);
    setNsCurrentValue(northStar.currentValue.toString());
    setNsTargetValue(northStar.targetValue.toString());
    setNsMetricType(northStar.type || 'currency');
    setModalState({ type: 'northstar' });
  };

  const handleSaveNorthStar = () => {
    const current = parseFloat(nsCurrentValue.replace(/,/g, ''));
    const target = parseFloat(nsTargetValue.replace(/,/g, ''));

    if (!nsMetricName.trim() || isNaN(current) || isNaN(target)) {
      alert('Please complete all fields with valid values');
      return;
    }

    // Derive unit from metric type
    const unitMap: Record<MetricType, string> = { currency: '$', percentage: '%', count: '#', ratio: '×' };

    onUpdateNorthStar({
      ...northStar,
      name: nsMetricName.trim(),
      currentValue: current,
      targetValue: target,
      type: nsMetricType,
      unit: unitMap[nsMetricType] || '$'
    });

    setModalState({ type: 'none' });
  };

  const handleOpenObjectiveModal = () => {
    setObjectiveTitle('');
    setModalState({ type: 'objective' });
  };

  const handleSaveObjective = () => {
    if (!objectiveTitle.trim()) {
      alert('Por favor ingresa un título');
      return;
    }

    onAddObjective(objectiveTitle.trim());
    setModalState({ type: 'none' });
  };

  const handleOpenStrategyModal = (objectiveId: string) => {
    setStrategyTitle('');
    setStrategyDescription('');
    setModalState({ type: 'strategy', objectiveId });
  };



  const handleOpenEditObjective = (objectiveId: string) => {
    const obj = objectives.find(o => o.id === objectiveId);
    if (obj) {
      setObjectiveTitle(obj.title);
      setObjectiveDescription(obj.description || '');
      setModalState({ type: 'edit-objective', objectiveId });
    }
  };

  const handleSaveEditObjective = () => {
    if (modalState.type === 'edit-objective' && objectiveTitle.trim()) {
      onEditObjective(modalState.objectiveId, objectiveTitle.trim(), objectiveDescription.trim());
      closeModal();
    }
  };

  const handleOpenEditStrategy = (strategyId: string) => {
    const strat = strategies.find(s => s.id === strategyId);
    if (strat) {
      setStrategyTitle(strat.title);
      setStrategyDescription('');
      setModalState({ type: 'edit-strategy', strategyId });
    }
  };

  const handleSaveEditStrategy = () => {
    if (modalState.type === 'edit-strategy' && strategyTitle.trim()) {
      onEditStrategy(modalState.strategyId, strategyTitle.trim());
      closeModal();
    }
  };

  const handleSaveStrategy = () => {
    if (modalState.type !== 'strategy') return;

    if (!strategyTitle.trim()) {
      alert('Por favor ingresa un título');
      return;
    }

    onAddStrategy(modalState.objectiveId, strategyTitle.trim());
    setModalState({ type: 'none' });
  };

  const closeModal = () => {
    setModalState({ type: 'none' });
  };

  return (
    <div style={{ padding: '32px', overflowY: 'auto', height: '100%', position: 'relative' }}>

      {/* North Star Modal */}
      {modalState.type === 'northstar' && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '32px',
            width: '500px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>Edit North Star Metric</h2>
              <button
                onClick={closeModal}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                <X size={24} />
              </button>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>
                Metric Name
              </label>
              <input
                type="text"
                value={nsMetricName}
                onChange={(e) => setNsMetricName(e.target.value)}
                placeholder="e.g. Monthly Active Users, Annual Revenue, Retention Rate"
                autoFocus
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '16px',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>
                Metric Type
              </label>
              <select
                value={nsMetricType}
                onChange={(e) => setNsMetricType(e.target.value as MetricType)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '16px',
                  outline: 'none',
                  cursor: 'pointer',
                  background: 'white'
                }}
              >
                <option value="currency">Currency ($) - e.g., $6,500,000</option>
                <option value="count">Numeric (#) - e.g., 50,000 Users</option>
                <option value="percentage">Percentage (%) - e.g., 85% Retention</option>
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>
                  Current Value ({getUnitLabel(nsMetricType)})
                </label>
                <input
                  type="number"
                  value={nsCurrentValue}
                  onChange={(e) => setNsCurrentValue(e.target.value)}
                  placeholder={nsMetricType === 'currency' ? '6500000' : nsMetricType === 'percentage' ? '85' : '50000'}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '16px',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>
                  Target Value ({getUnitLabel(nsMetricType)})
                </label>
                <input
                  type="number"
                  value={nsTargetValue}
                  onChange={(e) => setNsTargetValue(e.target.value)}
                  placeholder={nsMetricType === 'currency' ? '10000000' : nsMetricType === 'percentage' ? '95' : '100000'}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSaveNorthStar();
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '16px',
                    outline: 'none'
                  }}
                />
              </div>
            </div>


            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={closeModal}
                style={{
                  padding: '10px 20px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  background: 'white',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '14px'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNorthStar}
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  borderRadius: '8px',
                  background: '#4f46e5',
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '14px'
                }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Objective Modal */}
      {modalState.type === 'objective' && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '32px',
            width: '500px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>New Objective</h2>
              <button
                onClick={closeModal}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                <X size={24} />
              </button>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>
                Objective Title
              </label>
              <input
                type="text"
                value={objectiveTitle}
                onChange={(e) => setObjectiveTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSaveObjective();
                  }
                }}
                placeholder="e.g. Expand to Brazil Market"
                autoFocus
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '16px',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>
                Description
              </label>
              <textarea
                value={strategyDescription}
                onChange={(e) => setStrategyDescription(e.target.value)}
                placeholder="Describe what this growth lever aims to achieve..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  fontFamily: 'inherit',
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={closeModal}
                style={{
                  padding: '10px 20px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  background: 'white',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '14px'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveObjective}
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  borderRadius: '8px',
                  background: '#4f46e5',
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '14px'
                }}
              >
                Create Objective
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Strategy Modal */}
      {modalState.type === 'strategy' && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '32px',
            width: '500px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>Add Initiative</h2>
              <button
                onClick={closeModal}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                <X size={24} />
              </button>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>
                Initiative Title
              </label>
              <input
                type="text"
                value={strategyTitle}
                onChange={(e) => setStrategyTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSaveStrategy();
                  }
                }}
                placeholder="e.g. SEO Optimization"
                autoFocus
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '16px',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>
                Description
              </label>
              <textarea
                value={strategyDescription}
                onChange={(e) => setStrategyDescription(e.target.value)}
                placeholder="Describe what this growth lever aims to achieve..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  fontFamily: 'inherit',
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={closeModal}
                style={{
                  padding: '10px 20px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  background: 'white',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '14px'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveStrategy}
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  borderRadius: '8px',
                  background: '#4f46e5',
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '14px'
                }}
              >
                Add Initiative
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Edit Objective Modal */}
      {modalState.type === 'edit-objective' && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '32px',
            width: '500px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>Edit Objective</h2>
              <button
                onClick={closeModal}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                <X size={24} />
              </button>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>
                Objective Title
              </label>
              <input
                type="text"
                value={objectiveTitle}
                onChange={(e) => setObjectiveTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSaveEditObjective();
                  }
                }}
                autoFocus
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '16px',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>
                Description
              </label>
              <textarea
                value={strategyDescription}
                onChange={(e) => setStrategyDescription(e.target.value)}
                placeholder="Describe what this growth lever aims to achieve..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  fontFamily: 'inherit',
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={closeModal}
                style={{
                  padding: '10px 20px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  background: 'white',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '14px'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEditObjective}
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  borderRadius: '8px',
                  background: '#4f46e5',
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '14px'
                }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Initiative Modal */}
      {modalState.type === 'edit-strategy' && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '32px',
            width: '500px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>Edit Initiative</h2>
              <button
                onClick={closeModal}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                <X size={24} />
              </button>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>
                Initiative Title
              </label>
              <input
                type="text"
                value={strategyTitle}
                onChange={(e) => setStrategyTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSaveEditStrategy();
                  }
                }}
                autoFocus
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '16px',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>
                Description
              </label>
              <textarea
                value={strategyDescription}
                onChange={(e) => setStrategyDescription(e.target.value)}
                placeholder="Describe what this growth lever aims to achieve..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  fontFamily: 'inherit',
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={closeModal}
                style={{
                  padding: '10px 20px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  background: 'white',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '14px'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEditStrategy}
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  borderRadius: '8px',
                  background: '#4f46e5',
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '14px'
                }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* North Star Metric - Compact High-Density Header */}
      <div style={{
        background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)',
        borderRadius: '12px',
        padding: '20px 24px 0 24px',
        color: 'white',
        marginBottom: '24px',
        boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.2), 0 2px 4px -1px rgba(79, 70, 229, 0.1)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Main Content Row */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingBottom: '16px'
        }}>
          {/* Left: Label + Current Value */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                marginBottom: '4px',
                opacity: 0.85
              }}>
                <TrendingUp size={14} />
                <span style={{
                  textTransform: 'uppercase',
                  letterSpacing: '0.8px',
                  fontSize: '10px',
                  fontWeight: 700
                }}>
                  North Star Metric
                </span>
              </div>
              <div style={{
                fontSize: '28px',
                fontWeight: 800,
                lineHeight: 1,
                letterSpacing: '-0.5px'
              }}>
                {formatMetricValue(northStar.currentValue, northStar.type || 'currency', true, northStar.name)}
              </div>
              <div style={{
                fontSize: '11px',
                opacity: 0.7,
                marginTop: '2px',
                fontWeight: 500
              }}>
                {northStar.name}
              </div>
            </div>
          </div>

          {/* Right: Target + Progress + Edit */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                opacity: 0.7,
                fontWeight: 600,
                marginBottom: '2px'
              }}>
                Target
              </div>
              <div style={{
                fontSize: '20px',
                fontWeight: 700,
                lineHeight: 1
              }}>
                {formatMetricValue(northStar.targetValue, northStar.type || 'currency', true, northStar.name)}
              </div>
            </div>

            <div style={{
              height: '40px',
              width: '1px',
              background: 'rgba(255,255,255,0.2)'
            }} />

            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: '24px',
                fontWeight: 800,
                lineHeight: 1,
                marginBottom: '2px'
              }}>
                {calculateProgress()}%
              </div>
              <div style={{
                fontSize: '10px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                opacity: 0.75,
                fontWeight: 600
              }}>
                Achieved
              </div>
            </div>

            <button
              onClick={handleOpenNorthStarModal}
              style={{
                background: 'rgba(255,255,255,0.15)',
                border: 'none',
                borderRadius: '6px',
                padding: '6px',
                cursor: 'pointer',
                color: 'white',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.25)';
                e.currentTarget.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
                e.currentTarget.style.transform = 'scale(1)';
              }}
              title="Edit North Star Metric"
            >
              <Edit2 size={14} />
            </button>
          </div>
        </div>

        {/* Premium Progress Bar - Full Width at Bottom */}
        <div style={{
          position: 'relative',
          height: '5px',
          background: 'rgba(255,255,255,0.15)',
          borderRadius: '0',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${calculateProgress()}%`,
            height: '100%',
            background: 'linear-gradient(90deg, #60a5fa 0%, #a78bfa 50%, #f472b6 100%)',
            transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: '0 0 10px rgba(168, 85, 247, 0.4)'
          }} />
        </div>
      </div>

      {/* Growth Strategy System Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 700 }}>Growth Strategy System</h2>
        <button
          onClick={handleOpenObjectiveModal}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: '#4f46e5',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '10px 16px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = '#4338ca'}
          onMouseLeave={(e) => e.currentTarget.style.background = '#4f46e5'}
        >
          <Plus size={18} />
          New Objective
        </button>
      </div>

      {/* Objectives List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {objectives.length === 0 && (
          <div style={{ padding: '48px', textAlign: 'center', background: 'white', borderRadius: '16px', border: '1px dashed #e5e7eb' }}>
            <div style={{ background: '#f3f4f6', width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Target size={24} style={{ color: '#9ca3af' }} />
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>No Objectives Yet</h3>
            <p style={{ color: '#6b7280', fontSize: '14px', maxWidth: '400px', margin: '0 auto 24px' }}>
              Click the button above to create your first strategic objective.
            </p>
            <button
              onClick={handleOpenObjectiveModal}
              style={{
                background: '#4f46e5',
                color: 'white',
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Create First Objective
            </button>
          </div>
        )}

        {objectives.map(objective => {
          const objectiveStrategies = strategies.filter(s => s.parentObjectiveId === objective.id);

          return (
            <div key={objective.id} style={{
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              padding: '24px',
              background: 'white',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
            }}>
              {/* Objective Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ background: '#eff6ff', padding: '8px', borderRadius: '8px', color: '#4f46e5' }}>
                    <Target size={24} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div>
                      <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#6b7280', fontWeight: 700, letterSpacing: '0.5px' }}>Growth Lever</div>
                      <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#111827' }}>{objective.title}</h3>
                      {objective.description && (
                        <p style={{
                          fontSize: '13px',
                          color: '#6b7280',
                          margin: '6px 0 0 0',
                          lineHeight: '1.5',
                          fontStyle: 'italic',
                          maxWidth: '600px'
                        }}>
                          {objective.description}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleOpenEditObjective(objective.id)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px',
                        color: '#6b7280',
                        display: 'flex',
                        alignItems: 'center',
                        transition: 'color 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.color = '#4f46e5'}
                      onMouseLeave={(e) => e.currentTarget.style.color = '#6b7280'}
                      title="Edit objective"
                    >
                      <Edit2 size={16} />
                    </button>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => handleOpenStrategyModal(objective.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 12px',
                      background: '#f9fafb',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#4b5563',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#f3f4f6';
                      e.currentTarget.style.borderColor = '#d1d5db';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#f9fafb';
                      e.currentTarget.style.borderColor = '#e5e7eb';
                    }}
                  >
                    <Plus size={14} />
                    Add Initiative
                  </button>
                  <button
                    onClick={() => onDeleteObjective(objective.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 12px',
                      background: '#fef2f2',
                      border: '1px solid #fecaca',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#dc2626',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#fee2e2';
                      e.currentTarget.style.borderColor = '#fca5a5';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#fef2f2';
                      e.currentTarget.style.borderColor = '#fecaca';
                    }}
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                </div>
              </div>

              {/* Strategies List */}
              {objectiveStrategies.length === 0 ? (
                <div style={{
                  padding: '24px',
                  background: '#f9fafb',
                  borderRadius: '8px',
                  border: '1px dashed #d1d5db',
                  textAlign: 'center'
                }}>
                  <Lightbulb size={20} style={{ color: '#9ca3af', marginBottom: '8px' }} />
                  <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>
                    No strategies added yet. Click "Add Initiative" to create one.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {objectiveStrategies.map(strategy => {
                    const linkedCount = countLinkedExperiments(strategy.id);

                    return (
                      <div
                        key={strategy.id}
                        style={{
                          padding: '16px',
                          background: '#f9fafb',
                          borderRadius: '8px',
                          border: '1px solid #e5e7eb',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                              <div style={{ fontWeight: 600, fontSize: '14px', color: '#111827' }}>
                                {strategy.title}
                              </div>
                              {strategy.targetMetric && (
                                <span style={{
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  padding: '3px 8px',
                                  borderRadius: '4px',
                                  background: 'linear-gradient(135deg, #4f46e5 0%, #6366F1 100%)',
                                  color: 'white',
                                  letterSpacing: '0.3px'
                                }}>
                                  🎯 {strategy.targetMetric}
                                </span>
                              )}
                            </div>
                            <div style={{
                              fontSize: '12px',
                              background: linkedCount > 0 ? '#dcfce7' : '#f3f4f6',
                              color: linkedCount > 0 ? '#166534' : '#6b7280',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              display: 'inline-block',
                              fontWeight: 600
                            }}>
                              {linkedCount} {linkedCount === 1 ? 'Experiment' : 'Experiments'}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                            <button
                              onClick={() => handleOpenEditStrategy(strategy.id)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '4px',
                                color: '#6b7280',
                                display: 'flex',
                                alignItems: 'center',
                                transition: 'color 0.2s'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.color = '#4f46e5'}
                              onMouseLeave={(e) => e.currentTarget.style.color = '#6b7280'}
                              title="Edit initiative"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => {
                                const linked = experiments.filter(exp => exp.linkedStrategyId === strategy.id);
                                let msg = `Delete initiative "${strategy.title}"?`;
                                if (linked.length > 0) {
                                  msg += `\n\n⚠️ ${linked.length} experiment${linked.length === 1 ? ' is' : 's are'} linked. The link will be removed.`;
                                }
                                if (window.confirm(msg)) {
                                  onDeleteStrategy(strategy.id);
                                }
                              }}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '4px',
                                color: '#6b7280',
                                display: 'flex',
                                alignItems: 'center',
                                transition: 'color 0.2s'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.color = '#dc2626'}
                              onMouseLeave={(e) => e.currentTarget.style.color = '#6b7280'}
                              title="Delete initiative"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                        <div style={{
                          background: linkedCount > 0 ? '#dcfce7' : '#f3f4f6',
                          color: linkedCount > 0 ? '#166534' : '#6b7280',
                          padding: '4px 12px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: 600
                        }}>
                          {linkedCount}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
