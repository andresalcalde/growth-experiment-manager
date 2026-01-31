import os

file_path = '/Users/andres/.gemini/antigravity/brain/50faad1d-d922-4d7a-8db6-b7755fdeb5db/growth-experiment-manager/src/RoadmapView.tsx'

content = """import React from 'react';
import { Target, ChevronRight, Edit2, Plus, TrendingUp } from 'lucide-react';
import type { Objective, Strategy, Experiment, NorthStarMetric, Status } from './types';

// Defined explicitly to match App.tsx passing
interface RoadmapViewProps {
  northStar: NorthStarMetric;
  onUpdateNorthStar: () => void;
  objectives: Objective[];
  strategies: Strategy[];
  experiments: Experiment[];
  onAddObjective: () => void;
  onAddStrategy: (objectiveId: string) => void;
  onSelectExperiment: (exp: Experiment) => void;
}

const getStatusColor = (status: Status) => {
  switch (status) {
    case 'Idea Backlog': return 'var(--status-idea)';
    case 'Prioritized': return 'var(--status-prioritized)';
    case 'Live Testing': return 'var(--status-testing)';
    case 'Finished - Winner': return 'var(--status-winner)';
    case 'Finished - Loser': return 'var(--status-loser)';
    default: return 'var(--status-inconclusive)';
  }
};

export const RoadmapView: React.FC<RoadmapViewProps> = ({ 
  northStar, 
  onUpdateNorthStar, 
  objectives, 
  strategies, 
  experiments,
  onAddObjective,
  onAddStrategy,
  onSelectExperiment
}) => {

  const calculateProgress = () => {
    if (northStar.targetValue === 0) return 0;
    return Math.min(100, Math.round((northStar.currentValue / northStar.targetValue) * 100));
  };

  return (
    <div style={{ padding: '32px', overflowY: 'auto', height: '100%' }}>
      
      {/* North Star Hero Card */}
      <div style={{ 
        background: 'linear-gradient(135deg, #4f46e5 0%, #312e81 100%)', 
        borderRadius: '16px', 
        padding: '32px', 
        color: 'white',
        marginBottom: '48px',
        boxShadow: '0 10px 15px -3px rgba(79, 70, 229, 0.4)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', opacity: 0.8 }}>
              <TrendingUp size={20} />
              <span style={{ textTransform: 'uppercase', letterSpacing: '1px', fontSize: '12px', fontWeight: 600 }}>North Star Metric</span>
            </div>
            <h1 style={{ fontSize: '32px', fontWeight: 700, margin: 0 }}>{northStar.name}</h1>
          </div>
          <button 
            onClick={() => {
              console.log("ROADMAP BUTTON CLICKED: Update North Star");
              onUpdateNorthStar();
            }}
            style={{ 
              background: 'rgba(255,255,255,0.1)', 
              border: 'none', 
              borderRadius: '8px', 
              padding: '8px', 
              cursor: 'pointer',
              color: 'white',
              transition: 'background 0.2s'
            }}
          >
            <Edit2 size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '16px', marginBottom: '16px' }}>
          <div style={{ fontSize: '48px', fontWeight: 800, lineHeight: 1 }}>
            {northStar.unit}{northStar.currentValue.toLocaleString()}
          </div>
          <div style={{ fontSize: '16px', opacity: 0.7, paddingBottom: '8px' }}>
             / {northStar.unit}{northStar.targetValue.toLocaleString()} Target
          </div>
        </div>

        {/* Progress Bar */}
        <div style={{ background: 'rgba(255,255,255,0.2)', height: '8px', borderRadius: '99px', overflow: 'hidden' }}>
          <div style={{ width: `${calculateProgress()}%`, height: '100%', background: 'white', borderRadius: '99px', transition: 'width 0.5s ease-out' }}></div>
        </div>
        <div style={{ textAlign: 'right', marginTop: '8px', fontSize: '14px', fontWeight: 600, color: '#e0e7ff' }}>
          {calculateProgress()}% Achieved
        </div>
      </div>

      {/* Roadmap Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 700 }}>Strategy Roadmap</h2>
        {/* NEW OBJECTIVE BUTTON - EXPLICIT WIRING */}
        <button 
          onClick={() => {
            console.log("ROADMAP BUTTON CLICKED: New Objective");
            onAddObjective();
          }}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            background: 'var(--accent)', 
            color: 'white', 
            border: 'none', 
            borderRadius: '8px', 
            padding: '10px 16px', 
            fontWeight: 600, 
            cursor: 'pointer' 
          }}
        >
          <Plus size={18} />
          New Objective
        </button>
      </div>

      {/* Objectives List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        {objectives.length === 0 && (
           <div style={{ padding: '48px', textAlign: 'center', background: 'white', borderRadius: '16px', border: '1px dashed var(--border-subtle)', marginTop: '24px' }}>
              <div style={{ background: '#f3f4f6', width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                 <Target size={24} style={{ color: '#9ca3af' }} />
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>No Objectives Yet</h3>
              <p style={{ color: '#6b7280', fontSize: '14px', maxWidth: '400px', margin: '0 auto 24px' }}>
                 Define your high-level goals to start building your strategy roadmap.
              </p>
              <button 
                onClick={() => {
                  console.log("ROADMAP BUTTON CLICKED: Create First Objective");
                  onAddObjective();
                }}
                style={{ background: 'var(--accent)', color: 'white', padding: '10px 20px', borderRadius: '8px', border: 'none', fontWeight: 600, cursor: 'pointer' }}
              >
                 Create First Objective
              </button>
           </div>
        )}
        {objectives.map(objective => {
          const objectiveStrategies = strategies.filter(s => s.parentObjectiveId === objective.id);
          
          return (
            <div key={objective.id} style={{ border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '24px', background: 'white', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
              {/* Objective Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ background: '#eff6ff', padding: '8px', borderRadius: '8px', color: 'var(--accent)' }}>
                    <Target size={24} />
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-subtle)', fontWeight: 700, letterSpacing: '0.5px' }}>Objective</div>
                    <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>{objective.title}</h3>
                  </div>
                </div>
                {/* ADD STRATEGY BUTTON - EXPLICIT WIRING */}
                <button 
                  onClick={() => {
                    console.log("ROADMAP BUTTON CLICKED: Add Strategy");
                    onAddStrategy(objective.id);
                  }}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px', 
                    background: 'white', 
                    border: '1px solid var(--border-subtle)', 
                    borderRadius: '6px', 
                    padding: '6px 12px', 
                    fontSize: '13px',
                    fontWeight: 600, 
                    cursor: 'pointer',
                    color: 'var(--text-primary)'
                  }}
                >
                  <Plus size={14} />
                  Add Strategy
                </button>
              </div>

              {/* Strategies List */}
              <div style={{ paddingLeft: '24px', borderLeft: '2px solid #f3f4f6', marginLeft: '19px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {objectiveStrategies.length === 0 && (
                   <div style={{ padding: '16px', color: 'var(--text-subtle)', fontStyle: 'italic', fontSize: '14px' }}>No strategies defined yet.</div>
                )}
                
                {objectiveStrategies.map(strategy => {
                  const strategyExperiments = experiments.filter(exp => exp.linkedStrategyId === strategy.id);

                  return (
                    <div key={strategy.id}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#cbd5e1' }}></div>
                        <h4 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{strategy.title} <span style={{ fontWeight: 400, color: 'var(--text-subtle)', fontSize: '14px' }}>(Strategy)</span></h4>
                      </div>

                      {/* Experiments List (Leaf Nodes) */}
                      <div style={{ paddingLeft: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {strategyExperiments.map(exp => (
                          <div 
                            key={exp.id} 
                            onClick={() => onSelectExperiment(exp)}
                            style={{ 
                              padding: '12px 16px', 
                              background: '#f8fafc',
                              border: '1px solid var(--border-subtle)', 
                              borderRadius: '8px', 
                              cursor: 'pointer',
                              display: 'flex', 
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              transition: 'all 0.2s',
                            }}
                            className="strategy-experiment-item"
                          >
                            <span style={{ fontSize: '14px', fontWeight: 500 }}>{exp.title}</span>
                            <span 
                              className="badge" 
                              style={{ 
                                backgroundColor: getStatusColor(exp.status) + '20', 
                                color: getStatusColor(exp.status), 
                                fontSize: '11px',
                                padding: '2px 8px' 
                              }}
                            >
                              {exp.status}
                            </span>
                          </div>
                        ))}
                        {strategyExperiments.length === 0 && (
                           <div style={{ padding: '8px', fontSize: '13px', color: 'var(--text-subtle)', fontStyle: 'italic' }}>No experiments linked.</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
"""

with open(file_path, 'w') as f:
    f.write(content)

print(f"Successfully overwrote {file_path}")
