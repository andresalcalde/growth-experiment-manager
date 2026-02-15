import React, { useState } from 'react';
import { X, ChevronRight, ChevronLeft, Check, Target, Building2 } from 'lucide-react';
import type { Project, NorthStarMetric } from './types';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (project: Project) => void;
}

type Step = 1 | 2 | 3;

const INDUSTRIES = [
  'E-commerce',
  'SaaS',
  'Marketplace',
  'FinTech',
  'HealthTech',
  'Education',
  'Media',
  'Other'
];

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({ isOpen, onClose, onSave }) => {
  const [step, setStep] = useState<Step>(1);

  // Step 1: Basic Info
  const [projectName, setProjectName] = useState('');
  const [projectLogo, setProjectLogo] = useState('🚀');
  const [industry, setIndustry] = useState(INDUSTRIES[0]);

  // Step 2: North Star
  const [metricName, setMetricName] = useState('Revenue');
  const [targetValue, setTargetValue] = useState(1000000);
  const [unit, setUnit] = useState('$');

  // Step 3: Template
  const [useTemplate, setUseTemplate] = useState(true);

  const handleReset = () => {
    setStep(1);
    setProjectName('');
    setProjectLogo('🚀');
    setIndustry(INDUSTRIES[0]);
    setMetricName('Revenue');
    setTargetValue(1000000);
    setUnit('$');
    setUseTemplate(true);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleNext = () => {
    if (step < 3) {
      setStep((step + 1) as Step);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((step - 1) as Step);
    }
  };

  const handleFinish = () => {
    // ✅ NO generar ID aquí - Supabase lo generará automáticamente

    const northStar: NorthStarMetric = {
      name: metricName,
      currentValue: 0,
      targetValue: targetValue,
      unit: unit,
      type: unit === '$' || unit === '€' ? 'currency' : unit === '%' ? 'percentage' : 'count'
    };

    let objectives: any[] = [];
    let strategies: any[] = [];
    let experiments: any[] = [];

    // Reforge Standard Template (E-commerce Growth Model)
    if (useTemplate) {
      objectives = [
        {
          id: `obj-${Date.now()}-1`,
          title: 'Acquisition Excellence',
          description: 'Drive qualified traffic from high-intent channels',
          status: 'Active',
          progress: 0
        },
        {
          id: `obj-${Date.now()}-2`,
          title: 'Activation & Onboarding',
          description: 'Convert visitors to first-time customers',
          status: 'Active',
          progress: 0
        },
        {
          id: `obj-${Date.now()}-3`,
          title: 'Retention & LTV',
          description: 'Maximize customer lifetime value through repeat purchases',
          status: 'Active',
          progress: 0
        }
      ];

      strategies = [
        {
          id: `strat-${Date.now()}-1`,
          title: 'SEO & Content Marketing',
          parentObjectiveId: objectives[0].id
        },
        {
          id: `strat-${Date.now()}-2`,
          title: 'Paid Acquisition Optimization',
          parentObjectiveId: objectives[0].id
        },
        {
          id: `strat-${Date.now()}-3`,
          title: 'Landing Page Optimization',
          parentObjectiveId: objectives[1].id
        },
        {
          id: `strat-${Date.now()}-4`,
          title: 'Checkout Flow Improvement',
          parentObjectiveId: objectives[1].id
        },
        {
          id: `strat-${Date.now()}-5`,
          title: 'Email & Lifecycle Marketing',
          parentObjectiveId: objectives[2].id
        },
        {
          id: `strat-${Date.now()}-6`,
          title: 'Loyalty & Referral Programs',
          parentObjectiveId: objectives[2].id
        }
      ];

      // Template Experiments
      experiments = [
        {
          id: `exp-${Date.now()}-1`,
          title: 'Test Homepage Hero CTA Copy',
          hypothesis: 'Changing the CTA from "Learn More" to "Start Free Trial" will increase signups by 15%',
          observation: 'Current CTA has low click-through rate',
          problem: 'Generic CTA not compelling enough for visitors',
          status: 'Prioritized',
          impact: 8,
          confidence: 7,
          ease: 9,
          iceScore: 84,
          funnelStage: 'Acquisition',
          northStarMetric: metricName,
          linkedStrategyId: strategies[2].id,
          owner: { id: 'template-owner', name: 'Growth Team', avatar: '👥' }
        },
        {
          id: `exp-${Date.now()}-2`,
          title: 'Reduce Checkout Steps from 3 to 2',
          hypothesis: 'Simplifying checkout will reduce cart abandonment by 20%',
          observation: 'High drop-off rate at payment step',
          problem: 'Checkout process too long and complex',
          status: 'Building',
          impact: 9,
          confidence: 8,
          ease: 5,
          iceScore: 88,
          funnelStage: 'Activation',
          northStarMetric: metricName,
          linkedStrategyId: strategies[3].id,
          owner: { id: 'template-owner', name: 'Growth Team', avatar: '👥' }
        },
        {
          id: `exp-${Date.now()}-3`,
          title: 'Post-Purchase Email Sequence',
          hypothesis: 'Automated 3-email follow-up will increase repeat purchases by 25%',
          observation: 'Only 15% of customers make a second purchase',
          problem: 'No follow-up engagement after first purchase',
          status: 'Prioritized',
          impact: 9,
          confidence: 9,
          ease: 7,
          iceScore: 91,
          funnelStage: 'Retention',
          northStarMetric: metricName,
          linkedStrategyId: strategies[4].id,
          owner: { id: 'template-owner', name: 'Growth Team', avatar: '👥' }
        }
      ];
    }

    const newProject: Project = {
      metadata: {
        id: '', // ✅ Vacío - Supabase generará el UUID
        name: projectName,
        logo: projectLogo,
        createdAt: new Date().toISOString(),
        industry: industry
      },
      northStar,
      objectives,
      strategies,
      experiments
    };

    onSave(newProject);
    handleClose();
  };

  const isStep1Valid = projectName.trim().length > 0;
  const isStep2Valid = metricName.trim().length > 0 && targetValue > 0;

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.6)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '600px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
      }}>
        {/* Header */}
        <div style={{
          padding: '24px 32px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>
              Create New Project
            </h2>
            <p style={{ fontSize: '14px', color: '#6b7280', margin: '4px 0 0 0' }}>
              Step {step} of 3
            </p>
          </div>
          <button
            onClick={handleClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
          >
            <X size={20} color="#6b7280" />
          </button>
        </div>

        {/* Progress Bar */}
        <div style={{
          height: '4px',
          background: '#e5e7eb',
          position: 'relative'
        }}>
          <div style={{
            height: '100%',
            background: 'linear-gradient(90deg, #4F46E5, #7C3AED)',
            width: `${(step / 3) * 100}%`,
            transition: 'width 0.3s ease'
          }} />
        </div>

        {/* Content */}
        <div style={{
          padding: '32px',
          flex: 1,
          overflowY: 'auto'
        }}>
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{
                padding: '20px',
                background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
                borderRadius: '12px',
                border: '1px solid #e9d5ff',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <Building2 size={24} color="#7C3AED" />
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0, color: '#4F46E5' }}>
                    Basic Information
                  </h3>
                  <p style={{ fontSize: '13px', color: '#6b7280', margin: '4px 0 0 0' }}>
                    Set up your project's identity
                  </p>
                </div>
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  Project Name *
                </label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g., My Growth Project"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'border-color 0.2s'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#4F46E5'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  Project Logo (Emoji)
                </label>
                <input
                  type="text"
                  value={projectLogo}
                  onChange={(e) => setProjectLogo(e.target.value)}
                  placeholder="🚀"
                  maxLength={2}
                  style={{
                    width: '100px',
                    padding: '12px 16px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '32px',
                    textAlign: 'center',
                    outline: 'none'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#4F46E5'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
                />
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  Industry
                </label>
                <select
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    cursor: 'pointer',
                    background: 'white'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#4F46E5'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
                >
                  {INDUSTRIES.map(ind => (
                    <option key={ind} value={ind}>{ind}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{
                padding: '20px',
                background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
                borderRadius: '12px',
                border: '1px solid #e9d5ff',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <Target size={24} color="#7C3AED" />
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0, color: '#4F46E5' }}>
                    North Star Metric
                  </h3>
                  <p style={{ fontSize: '13px', color: '#6b7280', margin: '4px 0 0 0' }}>
                    Define your primary success metric
                  </p>
                </div>
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  Metric Name *
                </label>
                <input
                  type="text"
                  value={metricName}
                  onChange={(e) => setMetricName(e.target.value)}
                  placeholder="e.g., Revenue, Active Users, GMV"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#4F46E5'}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#374151',
                    marginBottom: '8px'
                  }}>
                    Target Value *
                  </label>
                  <input
                    type="number"
                    value={targetValue}
                    onChange={(e) => setTargetValue(Number(e.target.value))}
                    min={0}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                    onFocus={(e) => e.currentTarget.style.borderColor = '#4F46E5'}
                    onBlur={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
                  />
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#374151',
                    marginBottom: '8px'
                  }}>
                    Unit
                  </label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      outline: 'none',
                      cursor: 'pointer',
                      background: 'white'
                    }}
                    onFocus={(e) => e.currentTarget.style.borderColor = '#4F46E5'}
                    onBlur={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
                  >
                    <option value="$">$ (Dollars)</option>
                    <option value="€">€ (Euros)</option>
                    <option value="#"># (Count)</option>
                    <option value="%">% (Percentage)</option>
                  </select>
                </div>
              </div>

              <div style={{
                padding: '16px',
                background: '#f9fafb',
                borderRadius: '8px',
                border: '1px solid #e5e7eb'
              }}>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>
                  Preview:
                </div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: '#4F46E5' }}>
                  {unit}{targetValue.toLocaleString()}
                </div>
                <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
                  Target {metricName}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{
                padding: '20px',
                background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
                borderRadius: '12px',
                border: '1px solid #e9d5ff',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <Check size={24} color="#7C3AED" />
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0, color: '#4F46E5' }}>
                    Initialize Your Project
                  </h3>
                  <p style={{ fontSize: '13px', color: '#6b7280', margin: '4px 0 0 0' }}>
                    Choose how to start your growth journey
                  </p>
                </div>
              </div>

              <div>
                <label style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '16px',
                  border: `2px solid ${useTemplate ? '#4F46E5' : '#e5e7eb'}`,
                  borderRadius: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  background: useTemplate ? '#eff6ff' : 'white'
                }}
                  onClick={() => setUseTemplate(true)}
                >
                  <input
                    type="radio"
                    checked={useTemplate}
                    onChange={() => setUseTemplate(true)}
                    style={{ marginTop: '2px', cursor: 'pointer' }}
                  />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>
                      🎯 Start with Reforge Standard Template
                    </div>
                    <div style={{ fontSize: '13px', color: '#6b7280' }}>
                      Pre-loaded with industry-standard growth levers:<br />
                      • 3 Core Objectives (Acquisition, Activation, Retention)<br />
                      • 6 High-Impact Strategies
                    </div>
                  </div>
                </label>
              </div>

              <div>
                <label style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '16px',
                  border: `2px solid ${!useTemplate ? '#4F46E5' : '#e5e7eb'}`,
                  borderRadius: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  background: !useTemplate ? '#eff6ff' : 'white'
                }}
                  onClick={() => setUseTemplate(false)}
                >
                  <input
                    type="radio"
                    checked={!useTemplate}
                    onChange={() => setUseTemplate(false)}
                    style={{ marginTop: '2px', cursor: 'pointer' }}
                  />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>
                      📋 Start from Scratch
                    </div>
                    <div style={{ fontSize: '13px', color: '#6b7280' }}>
                      Begin with a blank canvas and build your own framework
                    </div>
                  </div>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '20px 32px',
          borderTop: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <button
            onClick={handleBack}
            disabled={step === 1}
            style={{
              padding: '10px 20px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              background: 'white',
              color: step === 1 ? '#9ca3af' : '#374151',
              fontWeight: 600,
              fontSize: '14px',
              cursor: step === 1 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              opacity: step === 1 ? 0.5 : 1
            }}
          >
            <ChevronLeft size={16} />
            Back
          </button>

          {step < 3 ? (
            <button
              onClick={handleNext}
              disabled={(step === 1 && !isStep1Valid) || (step === 2 && !isStep2Valid)}
              style={{
                padding: '10px 20px',
                border: 'none',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
                color: 'white',
                fontWeight: 600,
                fontSize: '14px',
                cursor: ((step === 1 && !isStep1Valid) || (step === 2 && !isStep2Valid)) ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                opacity: ((step === 1 && !isStep1Valid) || (step === 2 && !isStep2Valid)) ? 0.5 : 1
              }}
            >
              Next
              <ChevronRight size={16} />
            </button>
          ) : (
            <button
              onClick={handleFinish}
              style={{
                padding: '10px 24px',
                border: 'none',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Check size={16} />
              Create Project
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
