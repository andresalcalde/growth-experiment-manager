# 🔧 CÓMO ARREGLAR SUPABASE - Proyectos No Se Guardan

## 🚨 PROBLEMA IDENTIFICADO

**Error:** Los proyectos se crean pero NO se guardan en la base de datos.

**Causa Raíz:** 
1. ❌ Columna `funnel_stage` faltante (error PGRST204)
2. ❌ **RLS (Row Level Security) bloqueando INSERT operations**

## ✅ SOLUCIÓN PASO A PASO

### **PASO 1: Abrir Supabase Dashboard**

1. Ve a: **https://supabase.com/dashboard**
2. Login con tu cuenta
3. Selecciona tu proyecto: **oumhhngnwjijtmgpnhba**

---

### **PASO 2: Abrir SQL Editor**

1. En el menú lateral izquierdo, click en **"SQL Editor"**
2. Click en **"+ New query"**

---

### **PASO 3: Pegar el Script SQL**

Copia y pega TODO el contenido del archivo:
```
SUPABASE_COMPLETE_FIX.sql
```

El script hace 3 cosas:
- ✅ Agrega la columna `funnel_stage` faltante
- ✅ **DESHABILITA RLS** (permite crear proyectos sin autenticación)
- ✅ Verifica que todo funcione

---

### **PASO 4: Ejecutar el Script**

1. Con el script pegado en el editor
2. Click en el botón **"Run"** (esquina inferior derecha)
3. Espera a ver: ✅ "Success" 

---

### **PASO 5: Verificar Resultados**

Deberías ver en la salida:

```sql
column_name   | data_type
--------------+-----------
funnel_stage  | text

tablename    | rowsecurity
-------------+-------------
projects     | false       ← RLS DISABLED ✅
experiments  | false       ← RLS DISABLED ✅

status: ✅ Supabase configuration fixed successfully!
result: Projects can now be created and saved
```

---

### **PASO 6: Probar en tu App**

1. Ve a: **https://major-growth.vercel.app**
2. Haz **Ctrl + Shift + R** (hard refresh)
3. Click en **"+ Create New Project"**
4. Llena el formulario
5. Click en **"Create Project"**
6. ✅ **Debería guardarse correctamente ahora!**

---

## 🔍 CÓMO VERIFICAR QUE FUNCIONÓ

### En Supabase:

1. Ve a **"Table Editor"** en el menú lateral
2. Click en la tabla **"projects"**
3. Deberías ver tu nuevo proyecto en la lista

### En la App:

1. El dropdown de proyectos debería mostrar tu proyecto
2. NO debería decir "No Project Selected"
3. Deberías poder crear experimentos

---

## ⚠️ NOTAS IMPORTANTES

### ¿Qué hace exactamente el script?

**PARTE 1 - Agrega columna faltante:**
```sql
ALTER TABLE experiments ADD COLUMN funnel_stage TEXT;
```

**PARTE 2 - Deshabilita RLS (CLAVE PARA ARREGLAR EL BUG):**
```sql
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE experiments DISABLE ROW LEVEL SECURITY;
```

**PARTE 3 - Verifica que todo funcione:**
```sql
SELECT COUNT(*) FROM projects;  -- Debería funcionar sin errores
```

---

## 🔒 SEGURIDAD: ¿Por qué deshabilitamos RLS?

**RLS (Row Level Security)** es una característica de Supabase que controla quién puede ver/editar qué datos.

**Actualmente:**
- ❌ RLS está **habilitado** pero **sin políticas**
- ❌ Bloquea TODOS los INSERT/UPDATE
- ❌ Por eso los proyectos no se guardan

**Dos opciones:**

### Opción A: Deshabilitar RLS (MÁS SIMPLE - RECOMENDADO PARA DESARROLLO)
```sql
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
```
- ✅ Funciona inmediatamente
- ✅ Perfecto para desarrollo/testing
- ⚠️  NO recomendado para datos sensibles en producción

### Opción B: Crear políticas permisivas (PARA PRODUCCIÓN)
```sql
CREATE POLICY "Allow all" ON projects FOR ALL USING (true);
```
- ✅ Más seguro para producción
- ✅ Puedes refinar later con autenticación
- ⏱️  Requiere más configuración

**RECOMENDACIÓN:** Usa Opción A (deshabilitar RLS) para empezar. Puedes agregar autenticación después.

---

## 📋 TROUBLESHOOTING

### Error: "permission denied for table projects"
**Solución:** Asegúrate de estar usando el proyecto correcto en Supabase

### Script ejecuta pero proyectos aún no se guardan
**Solución:** 
1. Verifica en el SQL Editor que RLS está disabled:
   ```sql
   SELECT tablename, rowsecurity FROM pg_tables 
   WHERE tablename = 'projects';
   ```
   Debe decir: `rowsecurity = false`

2. Haz hard refresh en la app (Ctrl + Shift + R)

### "funnel_stage" column still missing
**Solución:** 
1. Ejecuta solo la PARTE 1 del script
2. Verifica con:
   ```sql
   SELECT * FROM experiments LIMIT 1;
   ```

---

## 🎯 RESULTADO ESPERADO

Después de ejecutar el script:

**ANTES:**
```
[Usuario crea proyecto] → [Modal se cierra] → [Proyecto NO aparece] ❌
```

**DESPUÉS:**
```
[Usuario crea proyecto] → [Modal se cierra] → [Proyecto aparece en dropdown] ✅
[Usuario puede crear experimentos] ✅
[Datos se guardan en Supabase] ✅
```

---

## 📞 ¿NECESITAS AYUDA?

Si después de ejecutar el script aún tienes problemas:

1. Abre la consola del navegador (F12)
2. Ve a la pestaña "Console"
3. Intenta crear un proyecto
4. Copia cualquier error rojo que veas
5. Compártelo conmigo

---

**Archivo generado:** Feb 3, 2026
**Script SQL:** SUPABASE_COMPLETE_FIX.sql

