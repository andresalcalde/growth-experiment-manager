import React, { useState } from 'react';
import { Info } from 'lucide-react';

interface InfoTooltipProps {
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export const InfoTooltip: React.FC<InfoTooltipProps> = ({ content, position = 'bottom' }) => {
  const [isVisible, setIsVisible] = useState(false);

  const getPositionStyles = () => {
    const base = {
      position: 'absolute' as const,
      zIndex: 1000,
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      padding: '12px 16px',
      borderRadius: '8px',
      fontSize: '13px',
      lineHeight: '1.6',
      width: '280px',
      boxShadow: '0 10px 30px rgba(102, 126, 234, 0.3)',
      pointerEvents: 'none' as const,
      opacity: isVisible ? 1 : 0,
      transform: isVisible ? 'translateY(0)' : 'translateY(-4px)',
      transition: 'opacity 0.2s ease, transform 0.2s ease'
    };

    switch (position) {
      case 'bottom':
        return { ...base, top: 'calc(100% + 8px)', left: '50%', transform: `translateX(-50%) ${isVisible ? 'translateY(0)' : 'translateY(-4px)'}` };
      case 'top':
        return { ...base, bottom: 'calc(100% + 8px)', left: '50%', transform: `translateX(-50%) ${isVisible ? 'translateY(0)' : 'translateY(4px)'}` };
      case 'right':
        return { ...base, left: 'calc(100% + 8px)', top: '50%', transform: `translateY(-50%) ${isVisible ? 'translateX(0)' : 'translateX(-4px)'}` };
      case 'left':
        return { ...base, right: 'calc(100% + 8px)', top: '50%', transform: `translateY(-50%) ${isVisible ? 'translateX(0)' : 'translateX(4px)'}` };
      default:
        return base;
    }
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block', marginLeft: '8px' }}>
      <button
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
        onClick={(e) => {
          e.preventDefault();
          setIsVisible(!isVisible);
        }}
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          border: 'none',
          borderRadius: '50%',
          width: '20px',
          height: '20px',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          boxShadow: isVisible ? '0 4px 12px rgba(102, 126, 234, 0.4)' : '0 2px 6px rgba(102, 126, 234, 0.2)',
          transform: isVisible ? 'scale(1.1)' : 'scale(1)',
          padding: 0,
          outline: 'none'
        }}
        aria-label="More information"
      >
        <Info size={12} color="white" strokeWidth={2.5} />
      </button>

      <div style={getPositionStyles()}>
        {content}
        {/* Arrow */}
        <div
          style={{
            position: 'absolute',
            width: 0,
            height: 0,
            borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent',
            borderBottom: position === 'top' ? 'none' : '6px solid #667eea',
            borderTop: position === 'bottom' ? 'none' : '6px solid #667eea',
            left: position.includes('left') || position.includes('right') ? 'auto' : '50%',
            top: position === 'bottom' ? '-6px' : position === 'top' ? 'auto' : '50%',
            bottom: position === 'top' ? '-6px' : 'auto',
            right: position === 'left' ? '-6px' : 'auto',
            transform: position.includes('left') || position.includes('right') 
              ? 'translateY(-50%) rotate(90deg)' 
              : 'translateX(-50%)'
          }}
        />
      </div>
    </div>
  );
};
