import React, { useState } from 'react';
import { 
  Plus, 
  LayoutDashboard, 
  Table as TableIcon, 
  Search, 
  Target,
  Book,
  GitBranch,
  X,
  CheckCircle2,
  Calendar,
  ExternalLink,
  ImageIcon,
  Lightbulb,
  Image as ImageIcon2, 
  TrendingUp,
  HelpCircle,
  Settings
} from 'lucide-react';
import { MethodologyToolkit } from './components/MethodologyToolkit';
import { 
  DndContext, 
  closestCorners, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors, 
  DragOverlay,
  defaultDropAnimationSideEffects,
  useDroppable
} from '@dnd-kit/core';
import type { 
  DragStartEvent, 
  DragOverEvent, 
  DragEndEvent
} from '@dnd-kit/core';
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy,
  useSortable 
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Status, Experiment, Objective, Strategy, NorthStarMetric, FunnelStage, Project, TeamMember } from './types';
import { CreateProjectModal } from './CreateProjectModal';
import { SettingsView } from './SettingsView';
import { PortfolioView } from './PortfolioView';
import { ExperimentDrawer } from './ExperimentDrawer';
import { RoadmapView } from './RoadmapView';
import { ExperimentModal } from './ExperimentModal';
import type { ExperimentFormData } from './ExperimentModal';
import { KeyLearningModal } from './KeyLearningModal';
import { POLANCO_NORTH_STAR, POLANCO_OBJECTIVES, POLANCO_STRATEGIES, POLANCO_EXPERIMENTS } from './laboratorioPolancoData';


// Original MOCK_EXPERIMENTS replaced with Laboratorio Polanco data
// See laboratorioPolancoData.ts for the data source

// Board only shows these columns
const BOARD_COLUMNS: Status[] = ['Prioritized', 'Building', 'Live Testing', 'Analysis'];

const ALL_STATUSES: Status[] = [
  'Idea', 'Prioritized', 'Building', 'Live Testing', 'Analysis', 
  'Finished - Winner', 'Finished - Loser', 'Finished - Inconclusive'
];

const getStatusColor = (status: Status) => {
  switch (status) {
    case 'Idea': return 'var(--status-idea)';
    case 'Prioritized': return 'var(--status-prioritized)';
    case 'Live Testing': return 'var(--status-testing)';
    case 'Building': return 'var(--status-dev)';
    case 'Finished - Winner': return 'var(--status-winner)';
    case 'Finished - Loser': return 'var(--status-loser)';
    default: return 'var(--status-inconclusive)';
  }
};


const IceBadge = ({ impact, confidence, ease, score }: { impact: number, confidence: number, ease: number, score: number }) => {
  const getICEColor = (s: number) => {
    if (s >= 500) return 'ice-high';
    if (s >= 250) return 'ice-medium';
    return 'ice-low';
  };

  return (
    <div className={'ice-badge ' + getICEColor(score)}>
      <span title="Impact">{impact}</span>
      <span>•</span>
      <span title="Confidence">{confidence}</span>
      <span>•</span>
      <span title="Ease">{ease}</span>
      <span style={{ marginLeft: '4px', opacity: 0.6 }}>({score})</span>
    </div>
  );
};


const ExperimentCard = ({ 
  experiment, 
  onClick, 
  isOverlay,
  style 
}: { 
  experiment: Experiment; 
  onClick?: () => void; 
  isOverlay?: boolean;
  style?: React.CSSProperties;
}) => (
  <div 
    className="experiment-card" 
    onClick={onClick}
    style={{
      ...style,
      cursor: isOverlay ? 'grabbing' : 'grab',
      boxShadow: isOverlay ? 'var(--shadow-md)' : undefined,
      transform: isOverlay ? 'scale(1.05)' : style?.transform,
    }}
  >
    <div className="card-title">{experiment.title}</div>
    <div className="card-footer">
      <IceBadge impact={experiment.impact} confidence={experiment.confidence} ease={experiment.ease} score={experiment.iceScore} />
      <img src={experiment.owner.avatar} alt="" style={{ width: '20px', height: '20px', borderRadius: '50%' }} />
    </div>
  </div>
);

const SortableExperimentCard = ({ experiment, onClick }: { experiment: Experiment; onClick: () => void }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: experiment.id, data: { experiment } });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };


  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <ExperimentCard experiment={experiment} onClick={onClick} />
    </div>
  );
};


const KanbanColumn = ({ 
  status, 
  experiments, 
  onClickExperiment 
}: { 
  status: Status; 
  experiments: Experiment[]; 
  onClickExperiment: (e: Experiment) => void;
}) => {
  const { setNodeRef } = useDroppable({
    id: status,
  });

  return (
    <div ref={setNodeRef} className="kanban-column" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="column-header">
        <span>{status}</span>
        <span style={{ opacity: 0.5 }}>{experiments.length}</span>
      </div>
      <SortableContext
        id={status}
        items={experiments.map(e => e.id)}
        strategy={verticalListSortingStrategy}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minHeight: '150px', flex: 1 }}>
          {experiments.map(exp => (
            <SortableExperimentCard 
              key={exp.id} 
              experiment={exp} 
              onClick={() => onClickExperiment(exp)} 
            />
          ))}
        </div>
      </SortableContext>
    </div>
  );
};



// Initial Team Members (Multi-User Support)
const INITIAL_TEAM_MEMBERS: TeamMember[] = [
  { id: '1', name: 'Me (Admin)', email: 'me@growthlab.com', avatar: '👤', role: 'Admin', projectIds: ['lab-polanco', 'demo-project'] },
  { id: '2', name: 'Alice Smith', email: 'alice@growthlab.com', avatar: '👩', role: 'Lead', projectIds: ['lab-polanco'] },
  { id: '3', name: 'Carlos Ruiz', email: 'carlos@growthlab.com', avatar: '👨', role: 'Lead', projectIds: ['demo-project'] },
];

const EditableCell = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value);

  const handleBlur = () => {
    setIsEditing(false);
    onChange(tempValue);
  };


  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur();
    }
  };


  if (isEditing) {
    return (
      <input 
        type="number" 
        value={tempValue} 
        onChange={(e) => setTempValue(Number(e.target.value))}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        autoFocus
        style={{ width: '40px', padding: '4px', borderRadius: '4px', border: '1px solid var(--accent)' }}
        onClick={(e) => e.stopPropagation()}
      />
    );
  }

  return (
    <div 
      onClick={(e) => { e.stopPropagation(); setIsEditing(true); }} 
      style={{ cursor: 'text', padding: '4px', border: '1px solid transparent', display: 'inline-block' }}
      title="Click to edit"
    >
      {value}
    </div>
  );
};





const LibraryCard = ({ experiment, onClick }: { experiment: Experiment; onClick: () => void }) => {
  const isWinner = experiment.status === 'Finished - Winner';
  const isLoser = experiment.status === 'Finished - Loser';
  const isInconclusive = experiment.status === 'Finished - Inconclusive';

  let badgeColor = '#9CA3AF'; // gray
  let badgeText = 'INCONCLUSIVE';
  let badgeBg = '#F3F4F6';
  
  if (isWinner) {
    badgeColor = 'white';
    badgeText = 'WINNER';
    badgeBg = 'var(--status-winner)';
  } else if (isLoser) {
    badgeColor = '#991B1B';
    badgeText = 'LOSER';
    badgeBg = '#FEE2E2';
  }

  const hasImage = experiment.visualProof && experiment.visualProof.length > 0;

  return (
    <div 
      onClick={onClick}
      style={{
        background: 'white',
        borderRadius: '12px',
        border: '1px solid var(--border-subtle)',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'transform 0.2s, box-shadow 0.2s',
        display: 'flex',
        flexDirection: 'column',
        height: '100%'
      }}
      className="library-card"
    >
      {/* Hero Image */}
      <div style={{ height: '160px', background: '#f3f4f6', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {hasImage ? (
           <div style={{ width: '100%', height: '100%', background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
             <ImageIcon2 size={32} />
           </div>
        ) : (
           <div style={{ width: '100%', height: '100%', background: 'linear-gradient(45deg, #f3f4f6, #e5e7eb)' }} />
        )}
        
        {/* Result Badge */}
        <div style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          background: badgeBg,
          color: badgeColor,
          padding: '4px 8px',
          borderRadius: '99px',
          fontSize: '11px',
          fontWeight: 700,
          letterSpacing: '0.5px'
        }}>
          {badgeText}
        </div>
      </div>

      {/* Card Body */}
      <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px', lineHeight: '1.4', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          {experiment.title}
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', marginBottom: '16px' }}>
          {experiment.keyLearnings || experiment.hypothesis}
        </p>

        <div style={{ marginTop: 'auto', display: 'flex', items: 'center', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-subtle)', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Target size={14} />
            {experiment.funnelStage}
          </div>
          <div>{experiment.endDate ? experiment.endDate.split('-').slice(1).join('/') : 'N/A'}</div>
        </div>
      </div>
    </div>
  );
};


const CaseStudyModal = ({ experiment, onClose }: { experiment: Experiment; onClose: () => void }) => {
  const isWinner = experiment.status === 'Finished - Winner';
  const isLoser = experiment.status === 'Finished - Loser';
  
  let highlightColor = '#F3F4F6'; // gray
  if (isWinner) highlightColor = 'rgba(74, 222, 128, 0.2)';
  if (isLoser) highlightColor = '#FEE2E2';

  return (
    <div className="drawer-overlay" style={{ alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div style={{ background: 'white', borderRadius: '16px', width: '800px', maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--shadow-lg)' }} onClick={e => e.stopPropagation()}>
         <div style={{ padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
               <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                     <span style={{ 
                        fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px',
                        color: isWinner ? 'var(--status-winner)' : isLoser ? 'var(--status-loser)' : 'var(--text-subtle)'
                     }}>
                        {experiment.status.replace('Finished - ', '')}
                     </span>
                     <span style={{ color: 'var(--text-subtle)', fontSize: '13px' }}>EXP-{experiment.id}</span>
                  </div>
                  <h1 style={{ fontSize: '28px', lineHeight: '1.2' }}>{experiment.title}</h1>
               </div>
               <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}><X size={24} color="var(--text-subtle)" /></button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '48px' }}>
               <div>
                  <div style={{ marginBottom: '32px' }}>
                     <h3 style={{ fontSize: '14px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-subtle)', marginBottom: '12px' }}>The Context</h3>
                     <div className="rich-text" style={{ fontSize: '16px', lineHeight: '1.6' }}>
                        {experiment.problem ? (
                           <p style={{ marginBottom: '12px' }}><strong>Problem:</strong> {experiment.problem}</p>
                        ) : null}
                        <p><strong>Hypothesis:</strong> {experiment.hypothesis}</p>
                     </div>
                  </div>

                  <div style={{ marginBottom: '32px' }}>
                     <h3 style={{ fontSize: '14px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-subtle)', marginBottom: '12px' }}>The Evidence</h3>
                     <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                         {experiment.visualProof?.map((proof, i) => (
                            <div key={i} style={{ aspectRatio: '16/9', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
                               {proof.startsWith('data:') ? (
                                  <img src={proof} alt={'Evidence ' + (i+1)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                               ) : (
                                  <div style={{ width: '100%', height: '100%', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                     <span style={{ fontSize: '12px', color: 'var(--text-subtle)' }}>{proof}</span>
                                  </div>
                               )}
                            </div>
                         ))}
                        {(!experiment.visualProof || experiment.visualProof.length === 0) && (
                           <div style={{ aspectRatio: '16/9', background: '#f3f4f6', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed var(--border-subtle)', gridColumn: 'span 2' }}>
                              <span style={{ fontSize: '12px', color: 'var(--text-subtle)' }}>No visual evidence attached</span>
                           </div>
                        )}
                     </div>
                  </div>

                  <div>
                      <h3 style={{ fontSize: '14px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-subtle)', marginBottom: '12px' }}>Key Learnings</h3>
                      <div style={{ background: highlightColor, padding: '24px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.05)' }}>
                         {experiment.keyLearnings ? (
                            <p style={{ fontSize: '18px', fontWeight: 500, lineHeight: '1.5', margin: 0 }}>
                               {experiment.keyLearnings}
                            </p>
                         ) : (
                            <p style={{ fontSize: '16px', color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>
                               No key learnings recorded yet.
                            </p>
                         )}
                      </div>
                  </div>
               </div>

               {/* Sidebar Meta */}
               <div style={{ borderLeft: '1px solid var(--border-subtle)', paddingLeft: '32px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                     <div>
                        <div className="label">Owner</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                           <img src={experiment.owner.avatar} style={{ width: '24px', height: '24px', borderRadius: '50%' }} />
                           <span style={{ fontSize: '14px', fontWeight: 500 }}>{experiment.owner.name}</span>
                        </div>
                     </div>
                     <div>
                        <div className="label">Metric Impact</div>
                        <div style={{ fontSize: '14px', fontWeight: 500, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                           <CheckCircle2 size={16} color="var(--text-subtle)" />
                           {experiment.northStarMetric}
                        </div>
                     </div>
                     <div>
                        <div className="label">Funnel Stage</div>
                        <div style={{ fontSize: '14px', fontWeight: 500, marginTop: '4px' }}>
                           {experiment.funnelStage}
                        </div>
                     </div>
                     <div>
                        <div className="label">Concluded</div>
                         <div style={{ fontSize: '14px', fontWeight: 500, marginTop: '4px' }}>
                           {experiment.endDate || "N/A"}
                        </div>
                     </div>
                  </div>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
};



const App: React.FC = () => {
  const [view, setView] = useState<'portfolio' | 'board' | 'table' | 'library' | 'roadmap'>('roadmap');
  
  // Multi-Project State Management
  const [activeProjectId, setActiveProjectId] = useState<string>('lab-polanco');
  
  // Global Team Members State
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(INITIAL_TEAM_MEMBERS);
  
  // Modal States
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([
    {
      metadata: {
        id: 'lab-polanco',
        name: 'Laboratorio Polanco',
        createdAt: new Date().toISOString(),
      },
      northStar: POLANCO_NORTH_STAR,
      objectives: POLANCO_OBJECTIVES,
      strategies: POLANCO_STRATEGIES,
      experiments: POLANCO_EXPERIMENTS,
    },
    {
      metadata: {
        id: 'demo-project',
        name: 'Demo Project',
        createdAt: new Date().toISOString(),
      },
      northStar: {
        name: 'Revenue',
        currentValue: 0,
        targetValue: 0,
        unit: '$',
        type: 'currency'
      },
      objectives: [],
      strategies: [],
      experiments: [],
    }
  ]);

  // Derived state from active project
  const activeProject = projects.find(p => p.metadata.id === activeProjectId) || projects[0];
  const northStar = activeProject.northStar;
  const objectives = activeProject.objectives;
  const strategies = activeProject.strategies;
  const experiments = activeProject.experiments;

  // Update functions now modify the active project
  const setNorthStar = (updater: NorthStarMetric | ((prev: NorthStarMetric) => NorthStarMetric)) => {
    setProjects(prev => prev.map(p =>
      p.metadata.id === activeProjectId
        ? { ...p, northStar: typeof updater === 'function' ? updater(p.northStar) : updater }
        : p
    ));
  };

  const setObjectives = (updater: Objective[] | ((prev: Objective[]) => Objective[])) => {
    setProjects(prev => prev.map(p =>
      p.metadata.id === activeProjectId
        ? { ...p, objectives: typeof updater === 'function' ? updater(p.objectives) : updater }
        : p
    ));
  };

  const setStrategies = (updater: Strategy[] | ((prev: Strategy[]) => Strategy[])) => {
    setProjects(prev => prev.map(p =>
      p.metadata.id === activeProjectId
        ? { ...p, strategies: typeof updater === 'function' ? updater(p.strategies) : updater }
        : p
    ));
  };

  const setExperiments = (updater: Experiment[] | ((prev: Experiment[]) => Experiment[])) => {
    setProjects(prev => prev.map(p =>
      p.metadata.id === activeProjectId
        ? { ...p, experiments: typeof updater === 'function' ? updater(p.experiments) : updater }
        : p
    ));
  };
  const [selectedExperiment, setSelectedExperiment] = useState<Experiment | null>(null);
  const [selectedCaseStudy, setSelectedCaseStudy] = useState<Experiment | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  // Library Filters
  const [libraryFilterResult, setLibraryFilterResult] = useState<'All' | 'Winners' | 'Losers'>('All');
  const [libraryFilterStage, setLibraryFilterStage] = useState<string>('All');
  const [iceSortDirection, setIceSortDirection] = useState<'desc' | 'asc'>('desc'); // Default: highest first

  const [activeId, setActiveId] = useState<string | null>(null);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  
  const [isMethodologyOpen, setIsMethodologyOpen] = useState(false);
  // Learning Modal State
  const [isLearningModalOpen, setIsLearningModalOpen] = useState(false);
  const [pendingExperimentId, setPendingExperimentId] = useState<string | null>(null);
  const [pendingStatus, setPendingStatus] = useState<Status | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );


  // COMMITMENT FILTER IMPLEMENTATION
  
  // 02. Explore (Table): Show Idea, Prioritized, Live Testing, Analysis
  const exploreExperiments = experiments.filter(e => 
    (e.status === 'Idea' || e.status === 'Prioritized' || e.status === 'Live Testing' || e.status === 'Analysis') &&
    e.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 03. Be Agile (Board): Show ONLY committed experiments (Prioritized, Building, Live Testing, Analysis - NO Idea)
  const boardExperiments = experiments.filter(e => 
    BOARD_COLUMNS.includes(e.status) &&
    e.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 04. Learning (Library): Show ONLY Finished experiments
  const libraryExperiments = experiments
    .filter(e => e.status.includes('Finished'))
    .filter(e => {
       if (libraryFilterResult === 'Winners') return e.status === 'Finished - Winner';
       if (libraryFilterResult === 'Losers') return e.status === 'Finished - Loser';
       return true;
    })
    .filter(e => {
       if (libraryFilterStage === 'All') return true;
       return e.funnelStage === libraryFilterStage;
    })
    .filter(e => 
       e.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
       (e.keyLearnings && e.keyLearnings.toLowerCase().includes(searchQuery.toLowerCase()))
    )
    .sort((a, b) => {
       if (a.endDate && b.endDate) return b.endDate.localeCompare(a.endDate);
       return 0;
    });

  // Sort Explore table by ICE Score
  const tableExperiments = [...exploreExperiments].sort((a, b) => 
    iceSortDirection === 'desc' ? b.iceScore - a.iceScore : a.iceScore - b.iceScore
  );


  const updateFunnelStage = (id: string, stage: FunnelStage) => {
    setExperiments(prev => prev.map(e => e.id === id ? { ...e, funnelStage: stage } : e));
  };
  const updateIceScore = (id: string, field: 'impact' | 'confidence' | 'ease', val: number) => {
    setExperiments(prev => prev.map(e => {
      if (e.id !== id) return e;
      const updated = { ...e, [field]: val };

      updated.iceScore = updated.impact * updated.confidence * updated.ease;
      return updated;
    }));

    if (selectedExperiment && selectedExperiment.id === id) {
       setSelectedExperiment(prev => {
          if (!prev) return null;
          const updated = { ...prev, [field]: val };
          updated.iceScore = updated.impact * updated.confidence * updated.ease;
          return updated;
       });
    }
  };

  const handleStatusChangeAttempt = (id: string, newStatus: Status) => {
    if (newStatus.includes('Finished')) {
      // Trigger Modal
      setPendingExperimentId(id);
      setPendingStatus(newStatus);
      setIsLearningModalOpen(true);
    } else {
      // Just update
      setExperiments(prev => prev.map(e => e.id === id ? { ...e, status: newStatus } : e));
    }
  };

  const handleLearningSave = (learning: string) => {
    if (pendingExperimentId && pendingStatus) {
       setExperiments(prev => prev.map(e => 
         e.id === pendingExperimentId 
         ? { 
             ...e, 
             status: pendingStatus, 
             keyLearnings: learning,
             endDate: new Date().toISOString().split('T')[0]
           } 
         : e
       ));
       setIsLearningModalOpen(false);
       setPendingExperimentId(null);
       setPendingStatus(null);
       setSelectedExperiment(null); 
    }
  };

  const handleExperimentUpdate = (id: string, updates: Partial<Experiment>) => {
    setExperiments(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
    if (selectedExperiment && selectedExperiment.id === id) {
      setSelectedExperiment(prev => prev ? { ...prev, ...updates } : null);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };


  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const isActiveTask = active.data.current?.type !== 'Column';
    const isOverTask = over.data.current?.type !== 'Column';

    if (!isActiveTask) return;

    // Dropping a Task over another Task
    if (isActiveTask && isOverTask) {
      setExperiments((prev) => {
        const activeIndex = prev.findIndex((t) => t.id === activeId);
        const overIndex = prev.findIndex((t) => t.id === overId);

        if (activeIndex === -1 || overIndex === -1) return prev;

        const newExperiments = [...prev];
        if (newExperiments[activeIndex].status !== newExperiments[overIndex].status) {
          newExperiments[activeIndex] = { ...newExperiments[activeIndex], status: newExperiments[overIndex].status };
        }

        return arrayMove(newExperiments, activeIndex, overIndex);
      });
    }

    const isOverColumn = BOARD_COLUMNS.includes(overId as Status);
    if (isOverColumn) {
       setExperiments((prev) => {
        const activeIndex = prev.findIndex((t) => t.id === activeId);
        if (activeIndex === -1) return prev; 
        
        if (prev[activeIndex].status !== overId) {
          const newExperiments = [...prev];
          newExperiments[activeIndex] = { ...newExperiments[activeIndex], status: overId as Status };
          // Don't move index here, usually wait for drop, but dnd-kit sortable needs it for visual
          return arrayMove(newExperiments, activeIndex, activeIndex);
        }
        return prev;
      });
    }
  };


  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
  };


  const handleCreateExperiment = (formData: ExperimentFormData) => {
    // Find the selected team member
    const selectedMember = teamMembers.find(m => m.id === formData.ownerId) || teamMembers[0];
    
    const newExperiment: Experiment = {
      id: Date.now().toString(),
      title: formData.title,
      status: formData.status,
      owner: { name: selectedMember.name, avatar: selectedMember.avatar },
      hypothesis: formData.hypothesis,
      observation: formData.observation,
      problem: formData.problem,
      source: formData.source,
      labels: formData.labels,
      impact: formData.impact,
      confidence: formData.confidence,
      ease: formData.ease,
      iceScore: formData.impact * formData.confidence * formData.ease,
      funnelStage: formData.funnelStage,
      northStarMetric: northStar.name,
      linkedStrategyId: formData.linkedStrategyId,
      startDate: new Date().toISOString().split('T')[0]
    };


    setExperiments(prev => [...prev, newExperiment]);
  };

  const handleAddObjective = (title: string) => {
    const newObj: Objective = { 
        id: Date.now().toString(), 
        title, 
        status: 'Active', 
        progress: 0 
    };
    setObjectives(prev => [...prev, newObj]);
  };

  const handleUpdateNorthStar = (updatedNorthStar: NorthStarMetric) => {
    setNorthStar(updatedNorthStar);
  };

  const handleAddStrategy = (objectiveId: string, title: string) => {
    const newStrategy: Strategy = {
      id: `strat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title,
      parentObjectiveId: objectiveId
    };
    
    setStrategies(prev => [...prev, newStrategy]);
  };

  const handleDeleteObjective = (objectiveId: string) => {
    // Count linked strategies
    const linkedStrategies = strategies.filter(s => s.parentObjectiveId === objectiveId);
    
    // Count experiments linked to those strategies
    const linkedExperiments = experiments.filter(exp => 
      linkedStrategies.some(strat => strat.id === exp.linkedStrategyId)
    );
    
    // Build confirmation message
    let message = `Are you sure you want to delete this objective?`;
    if (linkedStrategies.length > 0) {
      message += `\n\nThis will also delete ${linkedStrategies.length} strateg${linkedStrategies.length === 1 ? 'y' : 'ies'}.`;
    }
    if (linkedExperiments.length > 0) {
      message += `\n\n⚠️ Warning: ${linkedExperiments.length} experiment${linkedExperiments.length === 1 ? ' is' : 's are'} linked to ${linkedExperiments.length === 1 ? 'this strategy' : 'these strategies'}. The link will be removed.`;
    }
    
    if (!window.confirm(message)) {
      return;
    }
    
    // Delete the objective
    setObjectives(prev => prev.filter(obj => obj.id !== objectiveId));
    
    // Delete associated strategies
    setStrategies(prev => prev.filter(s => s.parentObjectiveId !== objectiveId));
    
    // Unlink experiments (remove linkedStrategyId)
    if (linkedExperiments.length > 0) {
      setExperiments(prev => prev.map(exp => {
        if (linkedStrategies.some(strat => strat.id === exp.linkedStrategyId)) {
          const { linkedStrategyId, ...rest } = exp;
          return rest as Experiment;
        }
        return exp;
      }));
    }
  };

  const handleEditObjective = (objectiveId: string, newTitle: string, newDescription?: string) => {
    setObjectives(prev => prev.map(obj => 
      obj.id === objectiveId ? { 
        ...obj, 
        title: newTitle,
        ...(newDescription !== undefined && { description: newDescription })
      } : obj
    ));
  };

  const handleEditStrategy = (strategyId: string, newTitle: string) => {
    setStrategies(prev => prev.map(strat => 
      strat.id === strategyId ? { ...strat, title: newTitle } : strat
    ));
  };

  // ============================================================================
  // PORTFOLIO NAVIGATION HANDLERS
  // ============================================================================
  
  const handleSelectProjectFromPortfolio = (projectId: string) => {
    console.log('📂 Selected project from portfolio:', projectId);
    setActiveProjectId(projectId);
    setView('roadmap'); // Navigate to Design/Roadmap view
    
    // Persist to localStorage for session continuity
    try {
      localStorage.setItem('lastActiveProjectId', projectId);
    } catch (error) {
      console.warn('Failed to save to localStorage:', error);
    }
  };
  
  const handleBackToPortfolio = () => {
    console.log('🏠 Returning to portfolio');
    setView('roadmap');
    
    try {
      localStorage.removeItem('lastActiveProjectId');
    } catch (error) {
      console.warn('Failed to clear localStorage:', error);
    }
  };

  // Project Management Handlers
  const handleCreateProject = (newProject: Project) => {
    setProjects(prev => [...prev, newProject]);
    setActiveProjectId(newProject.metadata.id);
  };

  // Team Management Handlers
  const handleAddTeamMember = (member: TeamMember) => {
    setTeamMembers(prev => [...prev, member]);
  };

  const handleRemoveTeamMember = (memberId: string) => {
    setTeamMembers(prev => prev.filter(m => m.id !== memberId));
  };

  const handleUpdateTeamMember = (memberId: string, updates: Partial<TeamMember>) => {
    setTeamMembers(prev => prev.map(m => 
      m.id === memberId ? { ...m, ...updates } : m
    ));
  };



  // ============================================================================
  // RENDER
  // ============================================================================
  
  // Portfolio View - Show when no project is selected or view is 'portfolio'
  if (view === 'portfolio') {
    return (
      <PortfolioView
        projects={projects.map(p => ({ id: p.metadata.id, name: p.metadata.name, created_at: p.metadata.createdAt }))}
        onSelectProject={handleSelectProjectFromPortfolio}
        onCreateProject={() => setIsCreateProjectOpen(true)}
        loading={false}
      />
    );
  }

  // Main App View - Show when project is selected
  return (
    <div className="app-container">
      {/* Sidebar - Simplified for brevity in this view */}
      <nav className="sidebar">
        <div className="logo-area" style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
           <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
             <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" fill="#4F46E5" stroke="#4F46E5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
             <circle cx="12" cy="12" r="10" stroke="#4F46E5" strokeWidth="1" strokeDasharray="2 2"/>
           </svg>
           <span style={{ fontWeight: 800, fontSize: '18px', letterSpacing: '-0.5px', fontFamily: 'var(--font-sans)' }}>Growth Lab</span>
        </div>

        {/* Project Switcher */}
        <div style={{ 
          marginBottom: '20px', 
          padding: '12px',
          background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
          borderRadius: '12px',
          border: '1px solid #e9d5ff'
        }}>
          <label style={{ 
            display: 'block', 
            fontSize: '11px', 
            fontWeight: 600, 
            color: '#6b7280', 
            marginBottom: '8px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            Active Project
          </label>
          <select
            value={activeProjectId}
            onChange={(e) => {
              if (e.target.value === '__create_new__') {
                setIsCreateProjectOpen(true);
                // Reset to current project
                setTimeout(() => e.target.value = activeProjectId, 0);
              } else {
                setActiveProjectId(e.target.value);
              }
            }}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '8px',
              border: '1px solid #d1d5db',
              background: 'white',
              fontSize: '14px',
              fontWeight: 600,
              color: '#111827',
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            {projects.map(project => (
              <option key={project.metadata.id} value={project.metadata.id}>
                {project.metadata.logo || '📁'} {project.metadata.name}
              </option>
            ))}
            <option value="__create_new__" style={{ color: '#4F46E5', fontWeight: 700 }}>
              + Create New Project
            </option>
          </select>
        </div>


        {/* Primary CTA */}
        <button 
          className="btn-primary" 
          style={{ 
            width: '100%', 
            justifyContent: 'center',
            marginBottom: '24px',
            padding: '12px 16px',
            fontSize: '14px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
          onClick={() => setIsNewModalOpen(true)}
        >
          <Plus size={18} />
          New Experiment
        </button>

        <button 
          className={'tab ' + (view === 'roadmap' ? 'active' : '')} 
          onClick={() => setView('roadmap')}
          style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '8px', width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer', background: view === 'roadmap' ? 'var(--accent-soft)' : 'transparent', color: view === 'roadmap' ? 'var(--accent)' : 'inherit' }}
        >
          <GitBranch size={18} />
          <span style={{ fontWeight: 500 }}>01. Design</span>
        </button>

        <button 
          className={'tab ' + (view === 'table' ? 'active' : '')} 
          onClick={() => setView('table')}
          style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '8px', width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer', background: view === 'table' ? 'var(--accent-soft)' : 'transparent', color: view === 'table' ? 'var(--accent)' : 'inherit' }}
        >
          <TableIcon size={18} />
          <span style={{ fontWeight: 500 }}>02. Explore</span>
        </button>

        <button 
          className={'tab ' + (view === 'board' ? 'active' : '')} 
          onClick={() => setView('board')}
          style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '8px', width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer', background: view === 'board' ? 'var(--accent-soft)' : 'transparent', color: view === 'board' ? 'var(--accent)' : 'inherit' }}
        >
          <LayoutDashboard size={18} />
          <span style={{ fontWeight: 500 }}>03. Be Agile</span>
        </button>

        <button 
          className={'tab ' + (view === 'library' ? 'active' : '')} 
          onClick={() => setView('library')}
          style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '8px', width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer', background: view === 'library' ? 'var(--accent-soft)' : 'transparent', color: view === 'library' ? 'var(--accent)' : 'inherit' }}
        >
          <Book size={18} />
          <span style={{ fontWeight: 500 }}>04. Learning</span>
        </button>

        <div style={{ marginTop: 'auto' }}>
           <button 
             onClick={() => setIsSettingsOpen(true)}
             style={{ 
               display: 'flex', 
               alignItems: 'center', 
               justifyContent: 'center',
               gap: '8px', 
               padding: '10px 12px', 
               background: 'transparent',
               border: '1px solid #e5e7eb',
               borderRadius: '8px', 
               width: '100%', 
               cursor: 'pointer',
               color: '#6b7280',
               fontWeight: 500,
               fontSize: '13px',
               transition: 'all 0.2s',
               marginBottom: '8px'
             }}
             onMouseEnter={(e) => {
               e.currentTarget.style.borderColor = '#4F46E5';
               e.currentTarget.style.color = '#4F46E5';
               e.currentTarget.style.background = '#eff6ff';
             }}
             onMouseLeave={(e) => {
               e.currentTarget.style.borderColor = '#e5e7eb';
               e.currentTarget.style.color = '#6b7280';
               e.currentTarget.style.background = 'transparent';
             }}
           >
             <Settings size={16} />
             Settings
           </button>

           <button 
             onClick={() => setIsMethodologyOpen(true)}
             style={{ 
               display: 'flex', 
               alignItems: 'center', 
               justifyContent: 'center',
               gap: '8px', 
               padding: '10px 12px', 
               background: 'transparent',
               border: '1px solid #e5e7eb',
               borderRadius: '8px', 
               width: '100%', 
               cursor: 'pointer',
               color: '#6b7280',
               fontWeight: 500,
               fontSize: '13px',
               transition: 'all 0.2s'
             }}
             onMouseEnter={(e) => {
               e.currentTarget.style.borderColor = '#4F46E5';
               e.currentTarget.style.color = '#4F46E5';
               e.currentTarget.style.background = '#eff6ff';
             }}
             onMouseLeave={(e) => {
               e.currentTarget.style.borderColor = '#e5e7eb';
               e.currentTarget.style.color = '#6b7280';
               e.currentTarget.style.background = 'transparent';
             }}
           >
             <HelpCircle size={16} />
             Methodology Guide
           </button>
        </div>
      </nav>

      <main className="main-content">
        <header className="header">
           <h2 style={{ fontSize: '18px' }}>
              {view === 'roadmap' && '01. Design'}
              {view === 'table' && '02. Explore'}
              {view === 'board' && '03. Be Agile'}
              {view === 'library' && '04. Learning'}
           </h2>
           
           <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
             <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  className="input" 
                  placeholder="Search experiments..." 
                  style={{ paddingLeft: '36px', width: '240px' }}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
             </div>
             <div style={{ width: '32px', height: '32px', background: 'var(--accent)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 600, fontSize: '14px' }}>
               ME
             </div>
           </div>
        </header>

        {view === 'board' ? (
          <div className="kanban-board">
            <DndContext 
              sensors={sensors} 
              collisionDetection={closestCorners}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
            >
              {BOARD_COLUMNS.map(status => (
                <KanbanColumn 
                  key={status} 
                  status={status} 
                  experiments={boardExperiments.filter(e => e.status === status)}
                  onClickExperiment={setSelectedExperiment}
                />
              ))}
              <DragOverlay>
                {activeId ? (
                   <ExperimentCard 
                      experiment={experiments.find(e => e.id === activeId)!} 
                      isOverlay 
                   />
                ) : null}
              </DragOverlay>
            </DndContext>
          </div>
        ) : view === 'table' ? (
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '35%' }}>Title</th>
                  <th style={{ width: '12%' }}>Status</th>
                  <th style={{ width: '8%' }}>Impact</th>
                  <th style={{ width: '8%' }}>Confidence</th>
                  <th style={{ width: '8%' }}>Ease</th>
                  <th 
                    style={{ 
                      width: '12%', 
                      cursor: 'pointer',
                      userSelect: 'none'
                    }}
                    onClick={() => setIceSortDirection(prev => prev === 'desc' ? 'asc' : 'desc')}
                  >
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '6px',
                      justifyContent: 'center'
                    }}>
                      ICE Score
                      <span style={{ 
                        fontSize: '10px',
                        opacity: 0.6
                      }}>
                        {iceSortDirection === 'desc' ? '▼' : '▲'}
                      </span>
                    </div>
                  </th>
                  <th style={{ width: '15%' }}>Stage</th>
                </tr>
              </thead>
              <tbody>
                {tableExperiments.map(exp => {
                  const linkedStrategy = strategies.find(s => s.id === exp.linkedStrategyId);
                  
                  return (
                    <tr key={exp.id} onClick={() => setSelectedExperiment(exp)} style={{ cursor: 'pointer' }}>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div style={{ fontWeight: 500 }}>{exp.title}</div>
                          {linkedStrategy && (
                            <div style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '11px',
                              padding: '3px 8px',
                              borderRadius: '4px',
                              background: '#eff6ff',
                              color: '#4F46E5',
                              fontWeight: 600,
                              width: 'fit-content'
                            }}>
                              <span style={{ fontSize: '10px' }}>⚡</span>
                              {linkedStrategy.title}
                            </div>
                          )}
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            {exp.northStarMetric}
                          </div>
                        </div>
                      </td>
                      <td>
                        <select
                          value={exp.status}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleStatusChangeAttempt(exp.id, e.target.value as Status);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            padding: '6px 10px',
                            borderRadius: '6px',
                            border: 'none',
                            background: getStatusColor(exp.status) + '15',
                            color: getStatusColor(exp.status),
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            outline: 'none',
                            width: '100%'
                          }}
                        >
                          <option value="Idea">Idea</option>
                          <option value="Prioritized">Prioritized</option>
                          <option value="Building">Building</option>
                          <option value="Live Testing">Live Testing</option>
                          <option value="Analysis">Analysis</option>
                        </select>
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 600, color: '#374151' }}>
                        {exp.impact}
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 600, color: '#374151' }}>
                        {exp.confidence}
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 600, color: '#374151' }}>
                        {exp.ease}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div 
                          className={'ice-badge ' + (exp.iceScore >= 500 ? 'ice-high' : exp.iceScore >= 250 ? 'ice-medium' : 'ice-low')}
                          style={{ 
                            display: 'inline-block',
                            minWidth: '60px'
                          }}
                        >
                          {exp.iceScore}
                        </div>
                      </td>
                      <td>
                        <select 
                          value={exp.funnelStage} 
                          onChange={(e) => {
                            e.stopPropagation();
                            updateFunnelStage(exp.id, e.target.value as FunnelStage);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          style={{ 
                            padding: "6px 12px", 
                            borderRadius: "6px", 
                            border: "1px solid var(--border-subtle)",
                            background: "white",
                            fontSize: "13px",
                            color: "var(--text-main)",
                            cursor: "pointer",
                            outline: "none",
                            width: '100%'
                          }}
                        >
                          {["Acquisition", "Activation", "Retention", "Referral", "Revenue"].map(stage => (
                            <option key={stage} value={stage}>{stage}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : view === 'library' ? (
          <div style={{ padding: '0 32px 32px 32px', overflowY: 'auto', height: '100%' }}>
             {/* Filter Tabs */}
             <div style={{ display: 'flex', gap: '16px', margin: '24px 0', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px' }}>
                {['All', 'Winners', 'Losers'].map(f => (
                   <button 
                      key={f}
                      onClick={() => setLibraryFilterResult(f as any)}
                      style={{ 
                         fontWeight: 600, 
                         color: libraryFilterResult === f ? 'var(--accent)' : 'var(--text-muted)',
                         background: 'none', border: 'none'
                      }}
                   >
                     {f}
                   </button>
                ))}
                <div style={{ width: '1px', background: 'var(--border-subtle)', margin: '0 8px' }}></div>
                {/* Stage Filter */}
                <select 
                   value={libraryFilterStage}
                   onChange={e => setLibraryFilterStage(e.target.value)}
                   style={{ border: 'none', background: 'none', color: 'var(--text-muted)', fontWeight: 600, outline: 'none' }}
                >
                   <option value="All">All Stages</option>
                   <option value="Acquisition">Acquisition</option>
                   <option value="Activation">Activation</option>
                   <option value="Revenue">Revenue</option>
                </select>
             </div>

             {libraryExperiments.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--text-subtle)' }}>
                   <Book size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
                   <h3>No finished experiments found</h3>
                   <p>Try adjusting your filters or search query.</p>
                </div>
             ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px', paddingBottom: '32px' }}>
                   {libraryExperiments.map(exp => (
                      <LibraryCard 
                         key={exp.id} 
                         experiment={exp} 
                         onClick={() => setSelectedCaseStudy(exp)} 
                      />
                   ))}
                </div>
             )}
          </div>
        ) : view === 'roadmap' ? (
           <RoadmapView 
             northStar={northStar}
             onUpdateNorthStar={handleUpdateNorthStar}
             objectives={objectives}
             strategies={strategies}
             experiments={experiments}
             onAddObjective={handleAddObjective}
             onAddStrategy={handleAddStrategy}
              onEditObjective={handleEditObjective}
              onEditStrategy={handleEditStrategy}
              onDeleteObjective={handleDeleteObjective}
             onSelectExperiment={setSelectedExperiment}
           />
        ) : (
          <div>Invalid view</div>
        )}
      </main>

      {selectedExperiment && !selectedCaseStudy && (
        <ExperimentDrawer 
            experiment={selectedExperiment} 
            onClose={() => setSelectedExperiment(null)} 
            onStatusChange={handleStatusChangeAttempt}
            onIceUpdate={(field, val) => updateIceScore(selectedExperiment.id, field, val)}
            objectives={objectives}
            strategies={strategies}
            onExperimentUpdate={handleExperimentUpdate}
            teamMembers={teamMembers}
        />
      )}

      {selectedCaseStudy && (
         <CaseStudyModal experiment={selectedCaseStudy} onClose={() => setSelectedCaseStudy(null)} />
      )}

      <ExperimentModal 
        isOpen={isNewModalOpen} 
        onClose={() => setIsNewModalOpen(false)} 
        onSave={(data) => {
           handleCreateExperiment(data);
           setIsNewModalOpen(false);
        }}
        strategies={strategies}
        teamMembers={teamMembers}
      />

      <KeyLearningModal 
        isOpen={isLearningModalOpen}
        onClose={() => setIsLearningModalOpen(false)}
        onSave={handleLearningSave}
      />

      <MethodologyToolkit 
        isOpen={isMethodologyOpen}
        onClose={() => setIsMethodologyOpen(false)}
      />

      <CreateProjectModal 
        isOpen={isCreateProjectOpen}
        onClose={() => setIsCreateProjectOpen(false)}
        onSave={handleCreateProject}
      />

      <SettingsView 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        teamMembers={teamMembers}
        projects={projects}
        onAddMember={handleAddTeamMember}
        onRemoveMember={handleRemoveTeamMember}
        onUpdateMember={handleUpdateTeamMember}
      />
    </div>
  );
};

export default App;
