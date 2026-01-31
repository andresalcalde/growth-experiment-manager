# FIXES TO APPLY TO APP.TSX

## Fix 1: Project Dropdown - Add default option when no projects
Line 833: Change value={activeProjectId} to value={activeProjectId || ''}

Line 856-860: Add a default "Select Project" option before mapping projects:
```tsx
{projects.length === 0 ? (
  <option value="">No projects yet...</option>
) : (
  <>
    <option value="">Select a project...</option>
    {projects.map(project => (
      <option key={project.id} value={project.id}>
        {project.name}
      </option>
    ))}
  </>
)}
```

## Fix 2: Experiment Button - Add validation
Around line 880 (the "+ Experiment" button), wrap in validation:
```tsx
onClick={() => {
  if (!activeProjectId) {
    alert('❌ Primero debes crear o seleccionar un proyecto');
    return;
  }
  setIsNewModalOpen(true);
}}
```

## Fix 3: CreateProjectModal - Add error handling
In the handleCreateProject function of CreateProjectModal component

## Fix 4: Auto-select first project
In the useEffect that fetches projects, after setting activeProjectId

