import os

app_path = 'src/App.tsx'
roadmap_path = 'src/RoadmapView.tsx'

# 1. Update App.tsx Handlers
with open(app_path, 'r') as f:
    app_content = f.read()

old_handlers = """  const handleAddObjective = () => {
    const title = window.prompt("Enter New Objective Title:");
    if (!title) return;
    
    const newObjective: Objective = {
      id: `obj-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title,
      status: 'Active',
      progress: 0
    };
    setObjectives(prev => [...prev, newObjective]);
  };

  const handleAddStrategy = (objectiveId: string) => {
    const title = window.prompt("Enter New Strategy Title:");
    if (!title) return;

    const newStrategy: Strategy = {
      id: `strat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title,
      parentObjectiveId: objectiveId
    };
    setStrategies(prev => [...prev, newStrategy]);
  };"""

new_handlers = """  const handleAddObjective = () => {
    const title = window.prompt("Enter Objective Title:");
    if (!title) return;
    
    // Create new objective with unique ID
    const newObjective: Objective = {
      id: `obj-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title,
      status: 'Active',
      progress: 0
    };
    
    // Functional state update for immediate reactivity
    setObjectives(prev => [...prev, newObjective]);
  };

  const handleAddStrategy = (objectiveId: string) => {
    const title = window.prompt("Enter Strategy Title:");
    if (!title) return;

    // Create new strategy linked to parent
    const newStrategy: Strategy = {
      id: `strat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title,
      parentObjectiveId: objectiveId
    };
    
    // Functional state update
    setStrategies(prev => [...prev, newStrategy]);
  };"""

if old_handlers in app_content:
    app_content = app_content.replace(old_handlers, new_handlers)
    with open(app_path, 'w') as f:
        f.write(app_content)
    print("Updated App.tsx handlers")
else:
    print("Could not find App.tsx handlers to update")

# 2. Update RoadmapView.tsx (North Star + Empty State)
with open(roadmap_path, 'r') as f:
    roadmap_content = f.read()

# Update North Star Edit Logic to strip commas
old_ns_edit = """    onUpdateNorthStar({
      ...northStar,
      name: newName || northStar.name,
      currentValue: parseFloat(newCurrent) || northStar.currentValue,
      targetValue: parseFloat(newTarget) || northStar.targetValue
    });"""

new_ns_edit = """    onUpdateNorthStar({
      ...northStar,
      name: newName || northStar.name,
      currentValue: parseFloat(newCurrent.replace(/,/g, '')) || northStar.currentValue,
      targetValue: parseFloat(newTarget.replace(/,/g, '')) || northStar.targetValue
    });"""

roadmap_content = roadmap_content.replace(old_ns_edit, new_ns_edit)

# Add Empty State
# Find start of list
list_start = """      {/* Objectives List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        {objectives.map(objective => {"""

list_start_with_empty = """      {/* Objectives List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        {objectives.length === 0 && (
           <div style={{ padding: '48px', textAlign: 'center', background: 'white', borderRadius: '16px', border: '1px dashed var(--border-subtle)', marginTop: '24px' }}>
              <div style={{ background: '#f3f4f6', width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                 <Target size={24} style={{ color: '#9ca3af' }} />
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>No Objectives Yet</h3>
              <p style={{ color: '#6b7280', fontSize: '14px', maxWidth: '400px', margin: '0 auto 24px' }}>
                 Define your high-level goals to start building your strategy roadmap.
              </p>
              <button onClick={onAddObjective} style={{ background: 'var(--accent)', color: 'white', padding: '10px 20px', borderRadius: '8px', border: 'none', fontWeight: 600, cursor: 'pointer' }}>
                 Create First Objective
              </button>
           </div>
        )}
        {objectives.map(objective => {"""

roadmap_content = roadmap_content.replace(list_start, list_start_with_empty)

with open(roadmap_path, 'w') as f:
    f.write(roadmap_content)
print("Updated RoadmapView.tsx")
