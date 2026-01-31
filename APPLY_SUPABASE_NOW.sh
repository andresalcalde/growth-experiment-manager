#!/bin/bash

echo "🚀 Aplicando integración Supabase a App.tsx..."

# Backup
cp src/App.tsx src/App.tsx.BACKUP_BEFORE_SUPABASE_$(date +%Y%m%d_%H%M%S)

# Usar sed para hacer los cambios
# 1. Cambiar import de React
sed -i '' "1s/.*/import React, { useState, useEffect } from 'react';/" src/App.tsx

# 2. Agregar imports de Supabase después de línea 1
sed -i '' "1a\\
import { useProjects } from './hooks/useProjects';\\
import { useExperiments } from './hooks/useExperiments';\\
import { useNorthStar } from './hooks/useNorthStar';\\
" src/App.tsx

# 3. Comentar import de POLANCO data (línea ~54)
sed -i '' 's/import { POLANCO_NORTH_STAR.*/\/\/ MOCK DATA REMOVED - Using Supabase Enterprise/' src/App.tsx

# 4. Cambiar el console.log inicial del componente App
sed -i '' 's/console\.log("App rendering");/console.log("🚀 CONEXIÓN ENTERPRISE ACTIVADA: oumhhngnwjijtmgpnhba");/' src/App.tsx

echo "✅ Cambios básicos aplicados"
echo "⚠️  Se requieren cambios manuales adicionales en las líneas 441-522"
echo "📄 Backup: src/App.tsx.BACKUP_BEFORE_SUPABASE_*"

