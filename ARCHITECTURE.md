# 🏗️ Architecture Overview - Supabase Integration

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        REACT APPLICATION                         │
│                     (growth-experiment-manager)                  │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                ┌───────────┴───────────┐
                │  Custom React Hooks   │
                │  (Data Layer)         │
                ├───────────────────────┤
                │  ▸ useProjects()      │
                │  ▸ useExperiments()   │
                │  ▸ useNorthStar()     │
                │  ▸ useObjectives()    │
                │  ▸ useStrategies()    │
                │  ▸ useTeamMembers()   │
                └───────────┬───────────┘
                            │
                ┌───────────┴───────────┐
                │  Supabase Client      │
                │  (@supabase/supabase-js)
                └───────────┬───────────┘
                            │
              ┌─────────────┴─────────────┐
              │    SUPABASE PLATFORM      │
              │  (Backend as a Service)   │
              ├───────────────────────────┤
              │                           │
              │  ┌─────────────────────┐  │
              │  │  PostgreSQL DB      │  │
              │  │  ▸ projects         │  │
              │  │  ▸ experiments      │  │
              │  │  ▸ north_star_metrics│ │
              │  │  ▸ objectives       │  │
              │  │  ▸ strategies       │  │
              │  │  ▸ team_members     │  │
              │  └─────────────────────┘  │
              │                           │
              │  ┌─────────────────────┐  │
              │  │  Realtime Engine    │  │
              │  │  (WebSocket)        │  │
              │  │  ▸ Live updates     │  │
              │  │  ▸ Subscriptions    │  │
              │  └─────────────────────┘  │
              │                           │
              │  ┌─────────────────────┐  │
              │  │  Row Level Security │  │
              │  │  ▸ Access control   │  │
              │  │  ▸ Policies         │  │
              │  └─────────────────────┘  │
              │                           │
              └───────────────────────────┘
```

---

## Data Flow - Example: Updating an Experiment

```
┌──────────────┐
│ USER ACTION  │  User changes experiment status in UI
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────────────────────┐
│ Component (ExploreView.tsx)                      │
│ ────────────────────────────────────────────     │
│ handleStatusChange(id, newStatus)                │
└──────┬───────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────┐
│ Hook (useExperiments.ts)                         │
│ ────────────────────────────────────────────     │
│ updateExperiment(id, { status: newStatus })      │
└──────┬───────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────┐
│ Supabase Client                                  │
│ ────────────────────────────────────────────     │
│ supabase.from('experiments')                     │
│   .update({ status: newStatus })                 │
│   .eq('id', id)                                  │
└──────┬───────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────┐
│ PostgreSQL Database                              │
│ ────────────────────────────────────────────     │
│ UPDATE experiments                               │
│ SET status = 'Live Testing', updated_at = NOW()  │
│ WHERE id = 'exp-123'                             │
└──────┬───────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────┐
│ Realtime Engine (WebSocket)                      │
│ ────────────────────────────────────────────     │
│ Broadcasts change to all subscribed clients      │
└──────┬───────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────┐
│ Hook Subscription (useEffect)                    │
│ ────────────────────────────────────────────     │
│ Receives update → fetchExperiments()             │
└──────┬───────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────┐
│ React Re-render                                  │
│ ────────────────────────────────────────────     │
│ UI updates to show new status                    │
└──────────────────────────────────────────────────┘
```

---

## Project Structure

```
growth-experiment-manager/
│
├── src/
│   ├── lib/
│   │   ├── supabase.ts           # Supabase client init
│   │   └── database.types.ts     # TypeScript DB types
│   │
│   ├── hooks/
│   │   ├── useProjects.ts        # Projects CRUD + realtime
│   │   ├── useExperiments.ts     # Experiments CRUD + realtime
│   │   ├── useNorthStar.ts       # North Star CRUD + realtime
│   │   ├── useObjectives.ts      # (To be implemented)
│   │   ├── useStrategies.ts      # (To be implemented)
│   │   └── useTeamMembers.ts     # (To be implemented)
│   │
│   ├── components/
│   │   ├── App.tsx               # Main app (uses hooks)
│   │   ├── RoadmapView.tsx       # Strategy view
│   │   ├── ExploreView.tsx       # Backlog view
│   │   └── ...
│   │
│   └── utils/
│       └── metricFormatters.ts   # Metric formatting helpers
│
├── supabase-schema.sql           # Database schema
├── .env                          # Environment variables (local)
├── .env.example                  # Env template
│
├── SUPABASE_SETUP.md             # Setup guide
├── SUPABASE_INTEGRATION_SUMMARY.md # This summary
└── ARCHITECTURE.md                # This file
```

---

## Hook Architecture

Each entity has its own custom hook following this pattern:

```typescript
export function useEntity(projectId: string | null) {
  // 1. Local state
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 2. Fetch function
  const fetchData = async () => {
    const { data, error } = await supabase
      .from('table_name')
      .select('*')
      .eq('project_id', projectId);
    setData(data);
  };

  // 3. CRUD operations
  const create = async (item) => { /* ... */ };
  const update = async (id, updates) => { /* ... */ };
  const remove = async (id) => { /* ... */ };

  // 4. Real-time subscription
  useEffect(() => {
    fetchData();
    
    const subscription = supabase
      .channel('changes')
      .on('postgres_changes', { table: 'table_name' }, fetchData)
      .subscribe();

    return () => subscription.unsubscribe();
  }, [projectId]);

  // 5. Return interface
  return { data, loading, error, create, update, remove };
}
```

---

## Database Schema Relationships

```
projects (1) ──┬── (1) north_star_metrics
               │
               ├── (*) objectives
               │        │
               │        └── (*) strategies
               │                 │
               │                 └── (*) experiments (FK)
               │
               ├── (*) experiments (FK)
               │
               └── (*) team_member_projects ──(*) team_members
                                                    │
                                                    └── (*) experiments.owner_id
```

**Legend:**
- `(1)` = One
- `(*)` = Many
- `FK` = Foreign Key

---

## Security Model

### Row Level Security (RLS) Policies

Currently all tables have permissive policies:
```sql
CREATE POLICY "Allow all" ON table_name
  FOR ALL USING (true) WITH CHECK (true);
```

### Future: Team-Based Access Control

```sql
-- Example: Users can only see projects they're assigned to
CREATE POLICY "Users see assigned projects" ON projects
  FOR SELECT
  USING (
    id IN (
      SELECT project_id 
      FROM team_member_projects 
      WHERE team_member_id = auth.uid()
    )
  );
```

---

## Realtime Architecture

### Subscription Pattern

```typescript
useEffect(() => {
  // 1. Subscribe to changes
  const subscription = supabase
    .channel('experiments_changes')
    .on(
      'postgres_changes',
      {
        event: '*',              // INSERT, UPDATE, DELETE
        schema: 'public',
        table: 'experiments',
        filter: `project_id=eq.${projectId}`
      },
      (payload) => {
        console.log('Change received!', payload);
        fetchExperiments();      // Refresh data
      }
    )
    .subscribe();

  // 2. Cleanup on unmount
  return () => {
    subscription.unsubscribe();
  };
}, [projectId]);
```

### Events Captured:
- ✅ INSERT - New row added
- ✅ UPDATE - Row modified
- ✅ DELETE - Row removed

---

## Performance Considerations

### 1. Indexed Columns
All foreign keys are indexed for fast lookups:
```sql
CREATE INDEX idx_experiments_project ON experiments(project_id);
CREATE INDEX idx_experiments_owner ON experiments(owner_id);
```

### 2. Selective Queries
Only fetch what you need:
```typescript
// ❌ Bad: Fetch everything
.select('*')

// ✅ Good: Fetch only needed columns
.select('id, title, status, owner_id')
```

### 3. Project-Scoped Subscriptions
Subscribe only to changes for the active project:
```typescript
.on('postgres_changes', {
  filter: `project_id=eq.${projectId}`  // Only this project
})
```

---

## Deployment Architecture

```
┌─────────────────────┐
│   Vercel / Netlify  │  ← React App (Static Hosting)
│   (Frontend)        │
└──────────┬──────────┘
           │  HTTPS API Calls
           │  WebSocket (Realtime)
           │
           ▼
┌─────────────────────┐
│   Supabase Cloud    │  ← Backend (Managed)
│   (Backend + DB)    │
│                     │
│  ▸ PostgreSQL       │
│  ▸ Realtime         │
│  ▸ Auth (optional)  │
│  ▸ Storage (optional)│
└─────────────────────┘
```

### Environment Variables (Production)

In Vercel/Netlify settings, add:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-production-anon-key
```

---

## Scalability & Limits

### Supabase Free Tier:
- ✅ 500 MB database space
- ✅ 2 GB bandwidth/month
- ✅ 50 GB file storage
- ✅ 50,000 monthly active users
- ✅ Unlimited API requests

**Perfect for:**
- Prototypes
- Small teams (< 10 people)
- Low-traffic applications

### Upgrade Path:
When you outgrow free tier, Supabase Pro starts at $25/month with:
- 8 GB database
- 250 GB bandwidth
- 100 GB storage
- Unlimited users

---

**This architecture provides a solid foundation for scaling from prototype to production! 🚀**
