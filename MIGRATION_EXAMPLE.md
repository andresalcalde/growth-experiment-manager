# 🔄 Migration Example: App.tsx

This file shows you **exactly** how to update `App.tsx` to use Supabase instead of localStorage.

---

## BEFORE (Current - localStorage based)

```typescript
// App.tsx - CURRENT STATE
import React, { useState } from 'react';
import { POLANCO_NORTH_STAR, POLANCO_OBJECTIVES, POLANCO_STRATEGIES, POLANCO_EXPERIMENTS } from './laboratorioPolancoData';

function App() {
  // ❌ OLD: Local state with mock data
  const [selectedProjectId, setSelectedProjectId] = useState('01. Laboratorio Polanco');
  const [experiments, setExperiments] = useState(POLANCO_EXPERIMENTS); 
  const [objectives, setObjectives] = useState(POLANCO_OBJECTIVES);
  const [strategies, setStrategies] = useState(POLANCO_STRATEGIES);
  const [northStar, setNorthStar] = useState(POLANCO_NORTH_STAR);

  const handleStatusChange = (id: string, newStatus: Status) => {
    setExperiments(prev => prev.map(e => 
      e.id === id ? { ...e, status: newStatus } : e
    ));
  };

  const handleUpdateNorthStar = (updated: NorthStarMetric) => {
    setNorthStar(updated);
  };

  // ...rest of component
}
```

---

## AFTER (Supabase-powered)

```typescript
// App.tsx - MIGRATED TO SUPABASE
import React, { useState, useEffect } from 'react';

// ✅ NEW: Import Supabase hooks
import { useProjects } from './hooks/useProjects';
import { useExperiments } from './hooks/useExperiments';
import { useNorthStar } from './hooks/useNorthStar';
import { useObjectives } from './hooks/useObjectives';      // TODO: Create this
import { useStrategies } from './hooks/useStrategies';      // TODO: Create this
import { useTeamMembers } from './hooks/useTeamMembers';    // TODO: Create this

function App() {
  // ✅ NEW: Track selected project locally (UI state only)
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // ✅ NEW: Use Supabase hooks for data
  const { projects, loading: projectsLoading, createProject } = useProjects();
  
  const { 
    experiments, 
    loading: experimentsLoading,
    updateExperiment,
    createExperiment,
    deleteExperiment 
  } = useExperiments(selectedProjectId);
  
  const { 
    northStar, 
    loading: northStarLoading,
    updateNorthStar 
  } = useNorthStar(selectedProjectId);

  const { 
    objectives, 
    loading: objectivesLoading,
    updateObjective 
  } = useObjectives(selectedProjectId);

  const { 
    strategies, 
    loading: strategiesLoading 
  } = useStrategies(selectedProjectId);

  const { 
    teamMembers, 
    loading: teamMembersLoading 
  } = useTeamMembers();

  // ✅ NEW: Auto-select first project on load
  useEffect(() => {
    if (projects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

  // ✅ NEW: Status change now updates database
  const handleStatusChange = async (id: string, newStatus: Status) => {
    try {
      await updateExperiment(id, { status: newStatus });
      // No need to manually update state! Hook will auto-refresh via subscription
    } catch (error) {
      console.error('Failed to update experiment:', error);
      alert('Failed to update experiment status');
    }
  };

  // ✅ NEW: North Star update now saves to database
  const handleUpdateNorthStar = async (updated: Partial<NorthStarMetric>) => {
    try {
      await updateNorthStar({
        name: updated.name,
        current_value: updated.currentValue,
        target_value: updated.targetValue,
        unit: updated.unit,
        type: updated.type
      });
      // Hook will auto-refresh!
    } catch (error) {
      console.error('Failed to update North Star:', error);
      alert('Failed to update North Star metric');
    }
  };

  // ✅ NEW: Show loading state
  const isLoading = projectsLoading || experimentsLoading || northStarLoading;

  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        height: '100vh',
        fontSize: '18px',
        color: '#6b7280'
      }}>
        Loading your data from Supabase...
      </div>
    );
  }

  // ✅ NEW: Handle no projects state
  if (projects.length === 0) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center',
        height: '100vh',
        gap: '16px'
      }}>
        <p style={{ fontSize: '18px', color: '#6b7280' }}>
          No projects found. Create your first project to get started!
        </p>
        <button onClick={() => setIsCreateProjectModalOpen(true)}>
          + Create Project
        </button>
      </div>
    );
  }

  // ✅ NEW: Project switcher with real data
  return (
    <div>
      <select 
        value={selectedProjectId || ''} 
        onChange={(e) => setSelectedProjectId(e.target.value)}
      >
        {projects.map(project => (
          <option key={project.id} value={project.id}>
            {project.logo} {project.name}
          </option>
        ))}
      </select>

      {/* Rest of your UI... */}
      <RoadmapView
        northStar={northStar}                        // ← comes from Supabase now!
        objectives={objectives}                     // ← comes from Supabase now!
        strategies={strategies}                     // ← comes from Supabase now!
        experiments={experiments}                   // ← comes from Supabase now!
        onUpdateNorthStar={handleUpdateNorthStar}   // ← saves to Supabase now!
        onStatusChange={handleStatusChange}         // ← saves to Supabase now!
      />
    </div>
  );
}

export default App;
```

---

## Key Changes Explained

### 1. Remove Mock Data Imports
```diff
- import { POLANCO_NORTH_STAR, POLANCO_OBJECTIVES, POLANCO_STRATEGIES, POLANCO_EXPERIMENTS } from './laboratorioPolancoData';
+ // Data now comes from Supabase!
```

### 2. Replace useState with Custom Hooks
```diff
- const [experiments, setExperiments] = useState(POLANCO_EXPERIMENTS);
+ const { experiments, updateExperiment } = useExperiments(selectedProjectId);
```

### 3. Make Handlers Async
```diff
- const handleStatusChange = (id, newStatus) => {
-   setExperiments(prev => prev.map(e => ...));
- };

+ const handleStatusChange = async (id, newStatus) => {
+   await updateExperiment(id, { status: newStatus });
+   // State updates automatically via realtime subscription!
+ };
```

### 4. Add Loading States
```typescript
if (isLoading) {
  return <LoadingSpinner />;
}
```

### 5. Filter by Project ID
The hooks automatically filter data by `project_id`:
```typescript
useExperiments(selectedProjectId)  // Only gets experiments for THIS project
```

---

## Complete Migration Checklist

### App.tsx Updates:

- [ ] Import Supabase hooks
- [ ] Remove mock data imports  
- [ ] Replace `useState` with hooks
- [ ] Make all handlers `async`
- [ ] Add loading states
- [ ] Add error handling
- [ ] Update Project switcher to use real data
- [ ] Remove localStorage code (if any)

### RoadmapView.tsx Updates:

- [ ] Accept `onUpdateNorthStar` as async function
- [ ] Show loading spinner while updating
- [ ] Handle errors gracefully

### ExploreView.tsx Updates:

- [ ] Make `onStatusChange` async  
- [ ] Show loading indicator on drag-and-drop
- [ ] Handle update errors

### ExperimentDrawer.tsx Updates:

- [ ] Map `owner` to `owner_id` (UUID string)
- [ ] Fetch owner details from `team_members` table
- [ ] Use UUID instead of `{ name, avatar }` object

---

## Testing Your Migration

1. **Start the app:**
   ```bash
   npm run dev
   ```

2. **Open browser console** and check for:
   - ✅ No Supabase errors  
   - ✅ Successful data fetch logs
   - ✅ Realtime subscription active

3. **Test each feature:**
   - [ ] Switch projects → Data updates
   - [ ] Update North Star → Saves to DB  
   - [ ] Change experiment status → Persists
   - [ ] Open in 2 tabs → Changes sync in realtime
   - [ ] Close browser, reopen → Data persists

---

## Common Pitfalls

### ❌ Forgetting to make handlers async
```typescript
// WRONG
const handleUpdate = (id, data) => {
  updateExperiment(id, data);  // Returns Promise!
};

// RIGHT
const handleUpdate = async (id, data) => {
  await updateExperiment(id, data);
};
```

### ❌ Not handling loading state
```typescript
// WRONG
return <ExperimentList experiments={experiments} />;  // Empty array while loading!

// RIGHT
if (loading) return <Spinner />;
return <ExperimentList experiments={experiments} />;
```

### ❌ Trying to update state manually
```typescript
// WRONG (don't do this anymore!)
setExperiments(prev => [...prev, newExp]);

// RIGHT (let Supabase handle it!)
await createExperiment(newExp);
// Hook's realtime subscription will update state automatically
```

---

## Rollback Plan

If something goes wrong, you can quickly rollback:

1. **Revert `App.tsx`:**
   ```bash
   git checkout HEAD -- src/App.tsx
   ```

2. **Remove Supabase:**
   ```bash
   npm uninstall @supabase/supabase-js
   ```

3. **Delete hooks:**
   ```bash
   rm -rf src/hooks src/lib
   ```

---

**Ready to migrate? Follow this guide step-by-step and you'll have Supabase running in ~30 minutes! 🚀**
