#!/usr/bin/env python3
import re

print("🔄 Reading original App.tsx...")
with open('src/App.tsx', 'r') as f:
    content = f.read()

print("💾 Creating backup...")
with open('src/App.tsx.BEFORE_SUPABASE', 'w') as f:
    f.write(content)

print("📝 Applying migrations...")

# Change 1: Update imports
content = content.replace(
    "import React, { useState } from 'react';",
    """import React, { useState, useEffect } from 'react';
import { useProjects } from './hooks/useProjects';
import { useExperiments } from './hooks/useExperiments';
import { useNorthStar } from './hooks/useNorthStar';"""
)

# Change 2: Remove mock data import
content = re.sub(
    r"import { POLANCO_NORTH_STAR, POLANCO_OBJECTIVES, POLANCO_STRATEGIES, POLANCO_EXPERIMENTS } from './laboratorioPolancoData';",
    "// MOCK DATA REMOVED - Using Supabase Enterprise",
    content
)

# Change 3: Replace the entire useState section with Supabase hooks
old_state_section = r'''const App: React.FC = \(\) => \{ console\.log\("App rendering"\);
  const \[view, setView\] = useState<'board' \| 'table' \| 'library' \| 'roadmap'>\('board'\);
  
  // Multi-Project State Management
  const \[activeProjectId, setActiveProjectId\] = useState<string>\('lab-polanco'\);
  
  // Global Team Members State
  const \[teamMembers, setTeamMembers\] = useState<TeamMember\[\]>\(INITIAL_TEAM_MEMBERS\);
  
  // Modal States
  const \[isCreateProjectOpen, setIsCreateProjectOpen\] = useState\(false\);
  const \[isSettingsOpen, setIsSettingsOpen\] = useState\(false\);'''

new_state_section = '''const App: React.FC = () => { 
  console.log("🚀 App rendering with Supabase");
  
  const [view, setView] = useState<'board' | 'table' | 'library' | 'roadmap'>('board');
  
  // ============================================
  // SUPABASE INTEGRATION
  // ============================================
  const { projects, loading: projectsLoading, createProject: createProjectDB } = useProjects();
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  
  // Auto-select first project when loaded
  useEffect(() => {
    if (projects.length > 0 && !activeProjectId) {
      console.log('📌 Auto-selecting project:', projects[0].id);
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
  
  // Global Team Members State
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(INITIAL_TEAM_MEMBERS);
  
  // Modal States
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);'''

content = re.sub(old_state_section, new_state_section, content, flags=re.DOTALL)

print("✅ Migrations applied")
print("💾 Writing new App.tsx...")

with open('src/App_MIGRATED.tsx', 'w') as f:
    f.write(content)

print("✅ Created: src/App_MIGRATED.tsx")
print("📄 Backup: src/App.tsx.BEFORE_SUPABASE")
print("\n⚠️  Manual verification needed - review App_MIGRATED.tsx before using")

