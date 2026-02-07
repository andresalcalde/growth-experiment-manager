# 🔍 FLUJO COMPLETO: CREACIÓN DE PROYECTO EN SUPABASE

## 📊 DIAGRAMA DE FLUJO

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. USUARIO: Click en "+ Create New Project"                    │
│    Ubicación: Dropdown en sidebar                               │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. MODAL: CreateProjectModal se abre                           │
│    Archivo: src/CreateProjectModal.tsx                          │
│    Línea: 24                                                     │
│                                                                  │
│    export const CreateProjectModal = ({ isOpen, onSave }) => {  │
│      // Usuario llena formulario:                               │
│      // - Nombre del proyecto                                   │
│      // - Métrica North Star                                    │
│      // - Objetivo de crecimiento                               │
│      // - Opción: usar template                                 │
│    }                                                             │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. MODAL: Click en botón "Create Project"                      │
│    Ejecuta: onSave(newProject)                                  │
│    Pasa objeto Project con:                                     │
│    {                                                             │
│      metadata: { name: "Mi Proyecto" },                         │
│      experiments: [...] // si usó template                      │
│    }                                                             │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. APP.TSX: handleCreateProject()                              │
│    Archivo: src/App.tsx                                         │
│    Línea: 780-839                                                │
│                                                                  │
│    const handleCreateProject = async (newProject) => {          │
│      // Prepara datos para Supabase                             │
│      const projectData = {                                      │
│        name: newProject.metadata.name                           │
│      };                                                          │
│                                                                  │
│      // ⭐ LLAMADA A SUPABASE ⭐                                 │
│      const createdProject = await createProjectDB(projectData); │
│    }                                                             │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. HOOK: useProjects.createProject()                           │
│    Archivo: src/hooks/useProjects.ts                            │
│    Línea: 32-50                                                  │
│                                                                  │
│    const createProject = async (project) => {                   │
│      // ⭐⭐⭐ PUNTO EXACTO DE INSERT A SUPABASE ⭐⭐⭐          │
│      const { data, error } = await supabase                     │
│        .from('projects')           ← TABLA                      │
│        .insert([project])          ← INSERT                     │
│        .select()                   ← RETURN DATA                │
│        .single();                  ← SINGLE ROW                 │
│                                                                  │
│      if (error) throw error; ← AQUÍ FALLA SI RLS BLOQUEA        │
│      return data;                                                │
│    }                                                             │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 6. SUPABASE: Procesa el INSERT                                 │
│                                                                  │
│    ┌──────────────────────────────────────┐                    │
│    │ ¿RLS HABILITADO?                     │                    │
│    └──────────────────────────────────────┘                    │
│              │                    │                             │
│          SÍ │                    │ NO                          │
│              ↓                    ↓                             │
│    ┌──────────────────┐  ┌──────────────────┐                 │
│    │ ¿Hay políticas?  │  │ ✅ INSERT EXITOSO│                 │
│    └──────────────────┘  └──────────────────┘                 │
│         │          │                                            │
│      SÍ│          │NO                                          │
│         ↓          ↓                                            │
│    ┌─────┐  ┌──────────────────┐                              │
│    │ ✅  │  │ ❌ PERMISSION     │                              │
│    │ OK  │  │    DENIED         │ ← PROBLEMA ACTUAL           │
│    └─────┘  └──────────────────┘                              │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ 7. RESPUESTA: Vuelve a handleCreateProject                     │
│                                                                  │
│    SI ÉXITO:                                                     │
│    - setActiveProjectId(createdProject.id)                      │
│    - Crea experimentos del template (si hay)                    │
│    - alert("✅ Proyecto creado")                                │
│                                                                  │
│    SI ERROR:                                                     │
│    - alert("❌ Error al crear proyecto")                        │
│    - console.error(error)                                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 PUNTO EXACTO DEL INSERT A SUPABASE

### **Archivo:** `src/hooks/useProjects.ts`
### **Función:** `createProject`
### **Líneas:** 32-50

```typescript
const createProject = async (project: any) => {
  try {
    console.log('➕ Creating project:', project);
    
    // ⭐⭐⭐ AQUÍ SE HACE EL INSERT A SUPABASE ⭐⭐⭐
    const { data, error } = await supabase
      .from('projects')      // ← Tabla en Supabase
      .insert([project])     // ← INSERT operation
      .select()              // ← Retorna el proyecto creado
      .single();             // ← Solo un registro

    console.log('📦 Create response:', { data, error });
    
    // ⚠️ AQUÍ FALLA SI RLS BLOQUEA
    if (error) throw error;
    
    await fetchProjects();
    return data;
  } catch (err: any) {
    console.error('❌ Create error:', err);
    handleSupabaseError(err, 'Create Project');
    throw err;
  }
};
```

---

## 🔍 DATOS QUE SE ENVÍAN A SUPABASE

### **Input en handleCreateProject (App.tsx):**
```typescript
const projectData = {
  name: newProject.metadata.name  // Solo el nombre
};
```

### **Enviado a Supabase:**
```json
{
  "name": "Mi Proyecto de Growth"
}
```

### **Recibido de Supabase (si éxito):**
```json
{
  "id": "uuid-generado-por-supabase",
  "name": "Mi Proyecto de Growth",
  "created_at": "2026-02-07T10:23:25Z"
}
```

---

## ❌ POR QUÉ FALLA ACTUALMENTE

### **Problema:**
```typescript
const { data, error } = await supabase
  .from('projects')
  .insert([project])  // ← AQUÍ FALLA
```

### **Error recibido:**
```json
{
  "error": {
    "code": "42501",
    "message": "new row violates row-level security policy for table \"projects\""
  },
  "data": null
}
```

### **Causa:**
1. RLS está **HABILITADO** en la tabla `projects`
2. **NO HAY POLÍTICAS** configuradas
3. Supabase rechaza el INSERT por seguridad

### **Solución:**
```sql
-- Opción A: Deshabilitar RLS (simple, para desarrollo)
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;

-- Opción B: Crear política permisiva (para producción)
CREATE POLICY "Allow all" ON projects FOR ALL USING (true);
```

---

## 📝 RESUMEN EJECUTIVO

| Paso | Archivo | Función/Línea | Acción |
|------|---------|---------------|---------|
| 1 | `CreateProjectModal.tsx` | Línea 24 | Usuario llena formulario |
| 2 | `App.tsx` | Línea 1374 | `onSave={handleCreateProject}` |
| 3 | `App.tsx` | Línea 780-839 | Prepara datos |
| 4 | `App.tsx` | Línea 791 | Llama `createProjectDB(projectData)` |
| 5 | `useProjects.ts` | **Línea 35-39** | **⭐ INSERT A SUPABASE ⭐** |
| 6 | Supabase | - | RLS bloquea → Error |
| 7 | `App.tsx` | Línea 835 | Muestra error al usuario |

---

## �� CÓMO DEBUGGEAR

### **Ver logs en consola del navegador:**

```javascript
// 1. handleCreateProject inicia
console.log('➕ Creating project via Supabase:', newProject);

// 2. useProjects.createProject inicia
console.log('➕ Creating project:', project);

// 3. Respuesta de Supabase
console.log('📦 Create response:', { data, error });

// Si error:
console.error('❌ Create error:', err);
// Te mostrará: "new row violates row-level security policy"
```

### **Verificar en Supabase Dashboard:**

1. Table Editor → projects
2. Si no hay filas nuevas = INSERT falló
3. SQL Editor → Ejecutar:
   ```sql
   SELECT * FROM projects ORDER BY created_at DESC LIMIT 5;
   ```

---

## ✅ CONFIRMACIÓN DE FIX

Después de ejecutar `SUPABASE_COMPLETE_FIX.sql`:

1. RLS estará disabled
2. El INSERT funcionará
3. Verás en consola:
   ```
   📦 Create response: {
     data: { id: "...", name: "Mi Proyecto" },
     error: null
   }
   ✅ Project created successfully
   ```

