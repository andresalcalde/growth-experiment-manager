import React, { useState } from 'react';
import { X, Lightbulb, Upload, Plus } from 'lucide-react';
import type { Strategy, Status, FunnelStage, TeamMember } from './types';

export interface ExperimentFormData {
  title: string;
  status: Status;
  hypothesis: string;
  observation: string;
  problem: string;
  source: string;
  labels: string[];
  impact: number;
  confidence: number;
  ease: number;
  iceScore?: number;
  funnelStage: FunnelStage;
  linkedStrategyId?: string;
  ownerId?: string; // Team member ID
}

interface ExperimentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ExperimentFormData) => void;
  strategies: Strategy[];
  teamMembers: TeamMember[];
}

const ScoreSlider = ({ label, value, onChange }: { label: string, value: number, onChange: (v: number) => void }) => (
  <div style={{ marginBottom: '24px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
      <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
        {label}
      </div>
      <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent)' }}>
        {value} <span style={{ color: 'var(--text-subtle)', fontWeight: 400 }}>/ 10</span>
      </div>
    </div>
    <input 
      type="range" 
      min="1" 
      max="10" 
      step="1"
      value={value} 
      onChange={(e) => onChange(parseInt(e.target.value))}
      style={{ 
        width: '100%', 
        accentColor: 'var(--accent)',
        cursor: 'pointer' 
      }} 
    />
  </div>
);

export const ExperimentModal: React.FC<ExperimentModalProps> = ({ isOpen, onClose, onSave, strategies, teamMembers }) => {
  const [formData, setFormData] = useState<ExperimentFormData>({
    title: '',
    status: 'Idea',
    hypothesis: '',
    observation: '',
    problem: '',
    source: '',
    labels: [],
    impact: 5,
    confidence: 5,
    ease: 5,
    funnelStage: 'Acquisition',
    linkedStrategyId: '',
    ownerId: teamMembers[0]?.id || ''
  });

  if (!isOpen) return null;

  const handleSave = () => {
    // Basic validation
    if (!formData.title) formData.title = "Untitled Hypothesis"; 
    
    // ICE Score Logic: Impact * Confidence * Ease
    const calculatedIce = formData.impact * formData.confidence * formData.ease;
    onSave({ ...formData, iceScore: calculatedIce });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '800px', padding: '0', borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'white' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: 'var(--accent)', padding: '8px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
               <Lightbulb size={20} color="white" />
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>New Hypothesis</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
            <X size={24} color="var(--text-subtle)" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div style={{ padding: '32px', overflowY: 'auto', flex: 1 }}>
          
           {/* Title Input */}
           <div className="form-group" style={{ marginBottom: '24px' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-subtle)', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Hypothesis Title</label>
            <input 
              value={formData.title} 
              onChange={e => setFormData({...formData, title: e.target.value})}
              placeholder="E.g. One-Click Checkout"
              style={{ fontSize: '16px', fontWeight: 500 }}
            />
          </div>

          {/* Observation */}
          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-subtle)', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Based on Observation</label>
            <input 
              value={formData.observation} 
              onChange={e => setFormData({...formData, observation: e.target.value})}
              placeholder="Type to search observations..."
            />
          </div>

          {/* Hypothesis */}
          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-subtle)', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>I Expect That (Hypothesis)</label>
            <textarea 
              rows={3}
              value={formData.hypothesis} 
              onChange={e => setFormData({...formData, hypothesis: e.target.value})}
              placeholder="What is the solution to the problem? E.g. Reduce number of form fields..."
              style={{ resize: 'vertical', width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', outline: 'none' }}
            />
          </div>

          {/* Problem */}
          <div className="form-group" style={{ marginBottom: '32px' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-subtle)', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>Will Address (Problem)</label>
            <textarea 
              rows={3}
              value={formData.problem} 
              onChange={e => setFormData({...formData, problem: e.target.value})}
              placeholder="What is the problem that you are trying to solve? E.g. visitors are not completing..."
              style={{ resize: 'vertical', width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', outline: 'none' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px' }}>
            {/* ICE Scores - SLIDERS 1-10 */}
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-subtle)', textTransform: 'uppercase', marginBottom: '16px' }}>Prioritization Score (ICE)</div>
              <div style={{ background: 'var(--bg-app)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                 <ScoreSlider label="Confidence" value={formData.confidence} onChange={(v) => setFormData({...formData, confidence: v})} />
                 <ScoreSlider label="Importance (Impact)" value={formData.impact} onChange={(v) => setFormData({...formData, impact: v})} />
                 <ScoreSlider label="Ease" value={formData.ease} onChange={(v) => setFormData({...formData, ease: v})} />
                 
                 <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-strong)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, fontSize: '14px' }}>Total ICE Score</span>
                    <span style={{ fontWeight: 800, fontSize: '18px', color: 'var(--accent)' }}>{formData.confidence * formData.impact * formData.ease}</span>
                 </div>
              </div>
            </div>

            {/* Meta Data */}
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-subtle)', textTransform: 'uppercase', marginBottom: '16px' }}>Meta Data</div>
              
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px', display: 'block' }}>Strategic Context</label>
                <select 
                  value={formData.linkedStrategyId}
                  onChange={e => setFormData({...formData, linkedStrategyId: e.target.value})}
                  style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}
                >
                  <option value="">Select Strategy...</option>
                  {strategies.map(s => (
                    <option key={s.id} value={s.id}>{s.title}</option>
                  ))}
                </select>
              </div>

              {/* Experiment Lead */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px', display: 'block' }}>Experiment Lead</label>
                <select 
                  value={formData.ownerId}
                  onChange={e => setFormData({...formData, ownerId: e.target.value})}
                  style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}
                >
                  {teamMembers.map(member => (
                    <option key={member.id} value={member.id}>
                      {member.avatar} {member.name}
                    </option>
                  ))}
                </select>
              </div>

               {/* Funnel Stage */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px', display: 'block' }}>Funnel Stage</label>
                <select 
                  value={formData.funnelStage}
                  onChange={e => setFormData({...formData, funnelStage: e.target.value as FunnelStage})}
                  style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}
                >
                  {['Acquisition', 'Activation', 'Retention', 'Referral', 'Revenue'].map(stage => (
                    <option key={stage} value={stage}>{stage}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px', display: 'block' }}>Source</label>
                <input 
                  value={formData.source} 
                  onChange={e => setFormData({...formData, source: e.target.value})}
                  placeholder="E.g. https://app.vwo.com"
                />
              </div>

               <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px', display: 'block' }}>Attachments</label>
                <button style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', padding: 0 }}>
                   <Upload size={16} />
                   Upload files
                </button>
                <p style={{ fontSize: '11px', color: 'var(--text-subtle)', marginTop: '8px', lineHeight: '1.4' }}>
                  Supported: png, jpg, pdf, docx. Max 5MB.
                </p>
              </div>
              
               <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px', display: 'block' }}>Labels</label>
                <input 
                  value={formData.labels.join(', ')} 
                  onChange={e => setFormData({...formData, labels: e.target.value.split(',').map(s => s.trim())})}
                  placeholder="E.g. Homepage, Mobile"
                />
              </div>

            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '20px 24px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'flex-end', gap: '12px', background: '#f9fafb' }}>
           <button 
             onClick={onClose}
             style={{ 
               padding: '10px 16px', 
               background: 'white', 
               border: '1px solid var(--border-subtle)', 
               borderRadius: '8px', 
               fontWeight: 600, 
               color: 'var(--text-primary)',
               cursor: 'pointer'
             }}
           >
             Cancel
           </button>
           <button 
             onClick={handleSave}
             style={{ 
               padding: '10px 16px', 
               background: 'var(--accent)', 
               border: 'none', 
               borderRadius: '8px', 
               fontWeight: 600, 
               color: 'white',
               cursor: 'pointer',
               display: 'flex',
               alignItems: 'center',
               gap: '8px',
               boxShadow: 'var(--shadow-sm)'
             }}
           >
             <Plus size={18} />
             Create
           </button>
        </div>

      </div>
    </div>
  );
};
