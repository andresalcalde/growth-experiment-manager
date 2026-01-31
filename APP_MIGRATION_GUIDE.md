# 🔧 App.tsx Migration to Supabase - EXACT CHANGES

## ✅ SQL Schema Executed Successfully

Tables created in Supabase Enterprise instance.

---

## 📝 CHANGES NEEDED IN App.tsx

### CHANGE 1: Update Imports (Lines 1-54)

**REPLACE:**
```typescript
import React, { useState } from 'react';
```

**WITH:**
```typescript
import React, { useState, useEffect } from 'react';
import { useProjects } from './hooks/useProjects';
import { useExperiments } from './hooks/useExperiments';
import { useNorthStar } from './hooks/useNorthStar';
```

### CHANGE 2: Remove Mock Data Import (Line 54)

**DELETE:**
```typescript
import { POLANCO_NORTH_STAR, POLANCO_OBJECTIVES, POLANCO_STRATEGIES, POLANCO_EXPERIMENTS } from './laboratorioPolancoData';
```

---

### CHANGE 3: Replace State Management (Lines 441-522)

**FIND THIS (Around line 441):**
```typescript
const App: React.FC = () => { console.log("App rendering");
  const [view, setView] = useState<'board' | 'table' | 'library' | 'roadmap'>('board');
  
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
```

**REPLACE WITH:**
```typescript
const App: React.FC = () => { 
  console.log("🚀 App rendering with Supabase");
  
  const [view, setView] = useState<'board' | 'table' | 'library' | 'roadmap'>('board');
  
  // SUPABASE HOOKS - Replace mock data
  const { projects, loading: projectsLoading, createProject } = useProjects();
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  
  // Auto-select first project when loaded
  useEffect(() => {
    if (projects.length > 0 && !activeProjectId) {
      console.log('📌 Auto-selecting first project:', projects[0].id);
      setActiveProjectId(projects[0].id);
    }
  }, [projects, activeProjectId]);
  
  const { experiments, loading: experimentsLoading, updateExperiment, createExperiment, deleteExperiment } = useExperiments(activeProjectId);
  const { northStar, loading: northStarLoading, updateNorthStar } = useNorthStar(activeProjectId);
  
  // Global Team Members State (TODO: Move to Supabase later)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(INITIAL_TEAM_MEMBERS);
  
  // Modal States
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Temporary objectives/strategies state (TODO: Create hooks for these)
  const objectives: Objective[] = [];
  const strategies: Strategy[] = [];
  
  // Loading state
  const isLoading = projectsLoading || experimentsLoading || northStarLoading;
  
  // Update functions REMOVED - hooks handle this now
```

---

### CHANGE 4: Update Status Change Handler (Around line 655)

**FIND:**
```typescript
const handleStatusChange = (id: string, newStatus: Status) => {
  setExperiments((prev) =>
    prev.map((exp) => (exp.id === id ? { ...exp, status: newStatus } : exp))
  );
};
```

**REPLACE WITH:**
```typescript
const handleStatusChange = async (id: string, newStatus: Status) => {
  console.log(`🔄 Updating experiment ${id} status to: ${newStatus}`);
  try {
    await updateExperiment(id, { status: newStatus });
  } catch (error) {
    console.error('❌ Failed to update status:', error);
    alert('Failed to update experiment status.  Check console for details.');
  }
};
```

---

### CHANGE 5: Update North Star Handler (Around line 745)

**FIND:**
```typescript
const handleUpdateNorthStar = (updated: NorthStarMetric) => {
  setNorthStar(updated);
};
```

**REPLACE WITH:**
```typescript
const handleUpdateNorthStar = async (updated: NorthStarMetric) => {
  console.log('🎯 Updating North Star:', updated);
  try {
    await updateNorthStar({
      name: updated.name,
      current_value: updated.currentValue,
      target_value: updated.targetValue,
      unit: updated.unit,
      type: updated.type
    });
  } catch (error) {
    console.error('❌ Failed to update North Star:', error);
    alert('Failed to update North Star metric. Check console for details.');
  }
};
```

---

### CHANGE 6: Update Add Experiment Handler

**FIND:**
```typescript
const handleAddExperiment = (formData: ExperimentFormData) => {
  const newExperiment: Experiment = {
    id: crypto.randomUUID(),
    title: formData.title,
    status: 'Idea',
    owner: formData.owner,
    hypothesis: formData.hypothesis,
    observation: formData.observation,
    problem: formData.problem,
    impact: formData.impact,
    confidence: formData.confidence,
    ease: formData.ease,
    iceScore: formData.impact * formData.confidence * formData.ease,
    funnelStage: formData.funnelStage,
    northStarMetric: formData.northStarMetric,
    linkedStrategy: formData.linkedStrategy || null,
  };

  setExperiments((prev) => [...prev, newExperiment]);
  setIsNewModalOpen(false);
};
```

**REPLACE WITH:**
```typescript
const handleAddExperiment = async (formData: ExperimentFormData) => {
  console.log('➕ Creating new experiment:', formData);
  
  if (!activeProjectId) {
    alert('Please select a project first');
    return;
  }
  
  try {
    const newExperiment = {
      project_id: activeProjectId,
      title: formData.title,
      status: 'Idea',
      owner_id: formData.owner.avatar, // TODO: Map to actual team member ID
      hypothesis: formData.hypothesis,
      observation: formData.observation,
      problem: formData.problem,
      impact: formData.impact,
      confidence: formData.confidence,
      ease: formData.ease,
      ice_score: formData.impact * formData.confidence * formData.ease,
      funnel_stage: formData.funnelStage,
      north_star_metric: formData.northStarMetric,
      linked_strategy_id: formData.linkedStrategy || null,
    };

    await createExperiment(newExperiment);
    setIsNewModalOpen(false);
  } catch (error) {
    console.error('❌ Failed to create experiment:', error);
    alert('Failed to create experiment. Check console for details.');
  }
};
```

---

## 🎯 AFTER THESE CHANGES:

1. Save the file
2. Check browser console at http://localhost:5173/
3. You should see Supabase connection logs
4. Data should now come from database!

---

## ⚡ Quick Test:

1. Open app
2. Check console for: "🔄 Fetching experiments for project: ..."
3. Try creating an experiment
4. Check Supabase Table Editor - experiment should appear!

