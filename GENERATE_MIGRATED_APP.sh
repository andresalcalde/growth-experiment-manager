#!/bin/bash

echo "🔄 Generating migrated App.tsx with Supabase integration..."

# Create backup
cp src/App.tsx src/App.tsx.BEFORE_SUPABASE

# Get everything BEFORE the App component (lines 1-440)
head -n 440 src/App.tsx > src/App_TEMP_HEADER.tsx

# Get everything AFTER line 1357 (if any)
tail -n +1358 src/App.tsx > src/App_TEMP_FOOTER.tsx 2>/dev/null || echo "" > src/App_TEMP_FOOTER.tsx

# Now create the new App.tsx
cat > src/App.tsx << 'APPFILE'
APPFILE

# Insert the header (but modify imports)
cat >> src/App.tsx << 'HEADER'
import React, { useState, useEffect } from 'react';
import { useProjects } from './hooks/useProjects';
import { useExperiments } from './hooks/useExperiments';
import { useNorthStar } from './hooks/useNorthStar';
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
import { ExperimentDrawer } from './ExperimentDrawer';
import { RoadmapView } from './RoadmapView';
import { ExperimentModal } from './ExperimentModal';
import type { ExperimentFormData } from './ExperimentModal';
import { KeyLearningModal } from './KeyLearningModal';


// Original MOCK_EXPERIMENTS replaced with Supabase
// Data now comes from Enterprise instance

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

HEADER

# Add middle part from original (lines 100-440 contain components)
sed -n '100,440p' src/App.tsx >> src/App.tsx

# Add the NEW App component with Supabase
cat >> src/App.tsx << 'APPCOMPONENT'

const App: React.FC = () => { 
  console.log("🚀 App rendering with Supabase integration");
  
  const [view, setView] = useState<'board' | 'table' | 'library' | 'roadmap'>('board');
  
  // ============================================
  // SUPABASE INTEGRATION - Replace mock data
  // ============================================
  const { projects, loading: projectsLoading, createProject: createProjectDB } = useProjects();
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  
  // Auto-select first project when loaded from database
  useEffect(() => {
    if (projects.length > 0 && !activeProjectId) {
      console.log('📌 Auto-selecting first project:', projects[0].id);
      setActiveProjectId(projects[0].id);
    }
  }, [projects, activeProjectId]);
  
  const { 
    experiments, 
    loading: experimentsLoading, 
    updateExperiment: updateExperimentDB, 
    createExperiment: createExperimentDB, 
    deleteExperiment: deleteExperimentDB 
  } = useExperiments(activeProjectId);
  
  const { 
    northStar, 
    loading: northStarLoading, 
    updateNorthStar: updateNorthStarDB 
  } = useNorthStar(activeProjectId);
  
  // Global Team Members State (TODO: Move to Supabase later)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(INITIAL_TEAM_MEMBERS);
  
  // Modal States
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Temporary objectives/strategies state (TODO: Create Supabase hooks for these later)
  const objectives: Objective[] = [];
  const strategies: Strategy[] = [];
  
  // Loading state
  const isLoading = projectsLoading || experimentsLoading || northStarLoading;
  
  const [selectedExperiment, setSelectedExperiment] = useState<Experiment | null>(null);
  const [selectedCaseStudy, setSelectedCaseStudy] = useState<Experiment | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  // Library Filters
  const [libraryFilterResult, setLibraryFilterResult] = useState<'All' | 'Winners' | 'Losers'>('All');
  const [libraryFilterStage, setLibraryFilterStage] = useState<string>('All');
  const [iceSortDirection, setIceSortDirection] = useState<'desc' | 'asc'>('desc');

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

APPCOMPONENT

echo "✅ Step 1: Header and state management migrated"
echo "⏳ Step 2: Adding handlers..."

# Continue with the rest of the file
tail -n +601 src/App.tsx >> src/App.tsx

echo "✅ Migration script created"
echo "📄 Backup: src/App.tsx.BEFORE_SUPABASE"

