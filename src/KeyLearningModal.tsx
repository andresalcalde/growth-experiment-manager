import React, { useState } from 'react';
import { X, Lightbulb } from 'lucide-react';

interface KeyLearningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (learning: string) => void;
}

export const KeyLearningModal: React.FC<KeyLearningModalProps> = ({ isOpen, onClose, onSave }) => {
  const [learning, setLearning] = useState('');

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
       <div className="modal-content" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
         <div style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
               <div style={{ background: '#fef3c7', padding: '8px', borderRadius: '50%' }}>
                  <Lightbulb size={24} color="#d97706" />
               </div>
               <div>
                 <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>Key Insight Required</h2>
                 <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '14px' }}>What did we learn from this experiment?</p>
               </div>
            </div>
            
            <textarea 
               value={learning}
               onChange={(e) => setLearning(e.target.value)}
               placeholder="E.g. We found that users prefer..."
               rows={4}
               style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-strong)', marginBottom: '24px', fontSize: '14px' }}
               autoFocus
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
               <button onClick={onClose} style={{ background: 'transparent', color: 'var(--text-muted)' }}>Cancel</button>
               <button 
                 onClick={() => {
                    if (learning.trim().length > 0) {
                       onSave(learning);
                       setLearning('');
                    } else {
                       alert("Please provide a key learning to finish the experiment.");
                    }
                 }} 
                 style={{ 
                    background: 'var(--accent)', 
                    color: 'white', 
                    fontWeight: 600, 
                    border: 'none' 
                 }}
               >
                 Complete & Archive
               </button>
            </div>
         </div>
       </div>
    </div>
  );
};
