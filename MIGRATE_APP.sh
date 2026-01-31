#!/bin/bash

echo "🔄 Creating backup of App.tsx..."
cp src/App.tsx src/App.tsx.backup

echo "📝 Updating App.tsx imports..."
# Add Supabase hooks imports after line 1
sed -i '' '1s/$/\nimport { useEffect } from '\''react'\'';/' src/App.tsx
sed -i '' '1a\
import { useProjects } from '\''./hooks/useProjects'\'';\
import { useExperiments } from '\''./hooks/useExperiments'\'';\
import { useNorthStar } from '\''./hooks/useNorthStar'\'';\
' src/App.tsx

echo "✅ Imports updated"
echo "📝 Next: Manual update of App component required"
echo ""
echo "The following changes need to be made in App.tsx:"
echo ""
echo "REPLACE (around line 441-489):"
echo "  const [activeProjectId, setActiveProjectId] = useState<string>('lab-polanco');"
echo "  const [projects, setProjects] = useState<Project[]>([...]);"
echo ""
echo "WITH:"
echo "  const { projects, loading: projectsLoading, createProject } = useProjects();"
echo "  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);"
echo "  "
echo "  useEffect(() => {"
echo "    if (projects.length > 0 && !activeProjectId) {"
echo "      setActiveProjectId(projects[0].id);"
echo "    }"
echo "  }, [projects, activeProjectId]);"
echo ""

