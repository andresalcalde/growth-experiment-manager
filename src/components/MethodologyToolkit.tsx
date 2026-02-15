import React from 'react';
import { X, Target, Zap, TrendingUp } from 'lucide-react';

interface MethodologyToolkitProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MethodologyToolkit: React.FC<MethodologyToolkitProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="modal-overlay"
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(4px)',
          zIndex: 1000,
          animation: 'fadeIn 0.2s ease-out'
        }}
      />

      {/* Drawer */}
      <div
        className="methodology-drawer"
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '520px',
          maxWidth: '90vw',
          background: 'white',
          boxShadow: '-4px 0 24px rgba(0, 0, 0, 0.15)',
          zIndex: 1001,
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideInRight 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '24px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)',
          color: 'white'
        }}>
          <div>
            <h2 style={{
              fontSize: '22px',
              fontWeight: 700,
              marginBottom: '4px',
              letterSpacing: '-0.5px'
            }}>
              Reforge Growth Framework
            </h2>
            <p style={{
              fontSize: '13px',
              opacity: 0.9,
              fontWeight: 400
            }}>
              Metodología respaldada por ciencia para growth
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              borderRadius: '8px',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s',
              color: 'white'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '32px 24px'
        }}>

          {/* Section 1: North Star */}
          <div style={{ marginBottom: '32px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '16px'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white'
              }}>
                <Target size={20} />
              </div>
              <h3 style={{
                fontSize: '18px',
                fontWeight: 700,
                color: '#1F2937'
              }}>
                1. The North Star Metric
              </h3>
            </div>

            <div style={{
              background: '#F9FAFB',
              border: '1px solid #E5E7EB',
              borderRadius: '12px',
              padding: '20px'
            }}>
              <p style={{
                fontSize: '14px',
                lineHeight: '1.7',
                color: '#374151',
                marginBottom: '16px'
              }}>
                Tu <strong style={{ color: '#4F46E5' }}>North Star Metric</strong> es la métrica de output más importante que representa el core value de tu compañía. En este caso, <strong>$10M ARR</strong> (Annual Recurring Revenue).
              </p>

              <div style={{
                background: 'white',
                borderLeft: '3px solid #4F46E5',
                padding: '16px',
                borderRadius: '8px',
                marginBottom: '12px'
              }}>
                <div style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#6B7280',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '8px'
                }}>
                  Principio Clave
                </div>
                <p style={{
                  fontSize: '14px',
                  color: '#1F2937',
                  margin: 0,
                  lineHeight: '1.6'
                }}>
                  No mueves directamente la North Star. En cambio, te enfocas en <strong>Input Metrics</strong> (palancas) que se componen para impulsar el output.
                </p>
              </div>

              <p style={{
                fontSize: '13px',
                color: '#6B7280',
                margin: 0,
                fontStyle: 'italic'
              }}>
                Piénsalo como una ecuación de growth: North Star = f(Input₁, Input₂, Input₃...)
              </p>
            </div>
          </div>

          {/* Section 2: Levers & Initiatives */}
          <div style={{ marginBottom: '32px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '16px'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white'
              }}>
                <Zap size={20} />
              </div>
              <h3 style={{
                fontSize: '18px',
                fontWeight: 700,
                color: '#1F2937'
              }}>
                2. Levers & Initiatives
              </h3>
            </div>

            <div style={{
              background: '#F9FAFB',
              border: '1px solid #E5E7EB',
              borderRadius: '12px',
              padding: '20px'
            }}>
              <div style={{ marginBottom: '20px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '10px'
                }}>
                  <div style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: '#4F46E5'
                  }} />
                  <h4 style={{
                    fontSize: '15px',
                    fontWeight: 700,
                    color: '#4F46E5',
                    margin: 0
                  }}>
                    Growth Objectives (Levers)
                  </h4>
                </div>
                <p style={{
                  fontSize: '14px',
                  lineHeight: '1.7',
                  color: '#374151',
                  margin: 0,
                  paddingLeft: '14px'
                }}>
                  Áreas de alto impacto que influyen significativamente en tu North Star. Son apuestas estratégicas que pueden mover la aguja de tu métrica de output.
                </p>
              </div>

              <div style={{
                height: '1px',
                background: '#E5E7EB',
                margin: '16px 0'
              }} />

              <div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '10px'
                }}>
                  <div style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: '#8B5CF6'
                  }} />
                  <h4 style={{
                    fontSize: '15px',
                    fontWeight: 700,
                    color: '#8B5CF6',
                    margin: 0
                  }}>
                    Strategic Initiatives (Actions)
                  </h4>
                </div>
                <p style={{
                  fontSize: '14px',
                  lineHeight: '1.7',
                  color: '#374151',
                  margin: 0,
                  paddingLeft: '14px'
                }}>
                  Estrategias específicas y accionables para activar una palanca. Ejemplos: "AEO Optimization", "Persona Landing Pages", "Content Velocity Program".
                </p>
              </div>

              <div style={{
                background: 'white',
                borderRadius: '8px',
                padding: '14px',
                marginTop: '16px',
                border: '1px dashed #D1D5DB'
              }}>
                <p style={{
                  fontSize: '13px',
                  color: '#6B7280',
                  margin: 0,
                  lineHeight: '1.6'
                }}>
                  <strong>Ejemplo:</strong> Lever = "Search Intent Dominance" → Initiative = "SEO for LLM Answers"
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: ICE Score */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '16px'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white'
              }}>
                <TrendingUp size={20} />
              </div>
              <h3 style={{
                fontSize: '18px',
                fontWeight: 700,
                color: '#1F2937'
              }}>
                3. The ICE Score Framework
              </h3>
            </div>

            <div style={{
              background: '#F9FAFB',
              border: '1px solid #E5E7EB',
              borderRadius: '12px',
              padding: '20px'
            }}>
              <p style={{
                fontSize: '14px',
                lineHeight: '1.7',
                color: '#374151',
                marginBottom: '20px'
              }}>
                <strong style={{ color: '#4F46E5' }}>ICE Scoring</strong> te ayuda a priorizar experimentos científicamente, no por instinto. Cada experimento se califica del 1 al 10 en tres dimensiones:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Impact */}
                <div style={{
                  background: 'white',
                  borderRadius: '10px',
                  padding: '16px',
                  border: '1px solid #E5E7EB'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    marginBottom: '8px'
                  }}>
                    <span style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '6px',
                      background: '#4F46E5',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '13px'
                    }}>
                      I
                    </span>
                    <strong style={{ fontSize: '14px', color: '#1F2937' }}>Impact</strong>
                  </div>
                  <p style={{
                    fontSize: '13px',
                    color: '#6B7280',
                    margin: 0,
                    paddingLeft: '38px',
                    lineHeight: '1.6'
                  }}>
                    ¿Cuánto moverá esto la aguja de tu North Star?
                  </p>
                </div>

                {/* Confidence */}
                <div style={{
                  background: 'white',
                  borderRadius: '10px',
                  padding: '16px',
                  border: '1px solid #E5E7EB'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    marginBottom: '8px'
                  }}>
                    <span style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '6px',
                      background: '#6366F1',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '13px'
                    }}>
                      C
                    </span>
                    <strong style={{ fontSize: '14px', color: '#1F2937' }}>Confidence</strong>
                  </div>
                  <p style={{
                    fontSize: '13px',
                    color: '#6B7280',
                    margin: 0,
                    paddingLeft: '38px',
                    lineHeight: '1.6'
                  }}>
                    ¿Qué tan seguro estás de que funcionará? (datos, investigación, precedentes)
                  </p>
                </div>

                {/* Ease */}
                <div style={{
                  background: 'white',
                  borderRadius: '10px',
                  padding: '16px',
                  border: '1px solid #E5E7EB'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    marginBottom: '8px'
                  }}>
                    <span style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '6px',
                      background: '#8B5CF6',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '13px'
                    }}>
                      E
                    </span>
                    <strong style={{ fontSize: '14px', color: '#1F2937' }}>Ease</strong>
                  </div>
                  <p style={{
                    fontSize: '13px',
                    color: '#6B7280',
                    margin: 0,
                    paddingLeft: '38px',
                    lineHeight: '1.6'
                  }}>
                    ¿Qué tan fácil es de implementar? (tiempo, recursos, complejidad)
                  </p>
                </div>
              </div>

              <div style={{
                background: 'linear-gradient(135deg, #4F46E5 0%, #8B5CF6 100%)',
                borderRadius: '10px',
                padding: '16px',
                marginTop: '20px',
                color: 'white'
              }}>
                <div style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '8px',
                  opacity: 0.9
                }}>
                  Fórmula
                </div>
                <p style={{
                  fontSize: '16px',
                  fontWeight: 700,
                  margin: 0,
                  fontFamily: 'monospace',
                  letterSpacing: '0.5px'
                }}>
                  ICE Score = (I + C + E) / 3
                </p>
                <p style={{
                  fontSize: '12px',
                  margin: '8px 0 0 0',
                  opacity: 0.85,
                  lineHeight: '1.5'
                }}>
                  Scores más altos = mayor prioridad en tu backlog
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div style={{
          padding: '20px 24px',
          borderTop: '1px solid var(--border)',
          background: '#F9FAFB'
        }}>
          <p style={{
            fontSize: '12px',
            color: '#6B7280',
            margin: 0,
            textAlign: 'center',
            lineHeight: '1.5'
          }}>
            Basado en la metodología de <strong style={{ color: '#4F46E5' }}>Reforge Growth Series</strong>
          </p>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideInRight {
          from { 
            transform: translateX(100%);
            opacity: 0;
          }
          to { 
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
};
